"use client";

/**
 * LIVE STATUS CARD
 * 
 * Shows the player's current live situation:
 * - Current rank and position change
 * - Projected points based on live scores
 * - How predictions are tracking
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp, TrendingDown, Minus, Trophy, Target,
    AlertTriangle, CheckCircle2, XCircle, Flame, Zap
} from "lucide-react";
import { Bet, Wager } from "@/lib/services/bet-service";
import { LeagueMember } from "@/lib/services/league-service";

interface LiveStatusCardProps {
    bets: Bet[];
    userWagers: Map<string, Wager>;
    members: LeagueMember[];
    currentUserId: string;
    leagueSettings?: {
        exact?: number;
        diff?: number;
        winner?: number;
        choice?: number;
        excludeDrawDiff?: boolean;
    };
}

interface LiveBetStatus {
    bet: Bet;
    wager: Wager;
    projectedPoints: number;
    tierHit: "exact" | "diff" | "winner" | "none";
    isLive: boolean;
}

export function LiveStatusCard({
    bets,
    userWagers,
    members,
    currentUserId,
    leagueSettings = { exact: 3, diff: 2, winner: 1, choice: 1 }
}: LiveStatusCardProps) {

    // Calculate live status for all user's active bets
    const liveAnalysis = useMemo(() => {
        const liveBets: LiveBetStatus[] = [];
        let totalProjectedPoints = 0;
        let predictionsLookingGood = 0;
        let predictionsAtRisk = 0;

        bets.forEach(bet => {
            const wager = userWagers.get(bet.id);
            if (!wager) return;

            // Only analyze LOCKED bets with live scores
            if (bet.status !== "LOCKED" && !(bet.status === "OPEN" && bet.closesAt?.toDate() < new Date())) return;
            if (!bet.liveScore || bet.liveScore.matchStatus === "NOT_STARTED") return;

            const liveHome = bet.liveScore.homeScore;
            const liveAway = bet.liveScore.awayScore;

            // Calculate projected points based on bet type
            let projectedPoints = 0;
            let tierHit: "exact" | "diff" | "winner" | "none" = "none";

            if (bet.type === "MATCH" && typeof wager.selection === "object") {
                const pred = wager.selection as { home: number; away: number };
                const settings = bet.arcadePointSettings || leagueSettings;

                // Get power-up multiplier
                let mult = 1;
                if (wager.powerUp === "x2") mult = 2;
                if (wager.powerUp === "x3") mult = 3;
                if (wager.powerUp === "x4") mult = 4;

                // Check exact match
                if (liveHome === pred.home && liveAway === pred.away) {
                    tierHit = "exact";
                    projectedPoints = (settings.exact || 3) * mult;
                }
                // Check correct difference
                else if ((liveHome - liveAway) === (pred.home - pred.away)) {
                    // Check if draw exclusion applies
                    const isDraw = liveHome === liveAway;
                    if (isDraw && settings.excludeDrawDiff) {
                        // Check winner only
                        tierHit = "winner";
                        projectedPoints = (settings.winner || 1) * mult;
                    } else {
                        tierHit = "diff";
                        projectedPoints = (settings.diff || 2) * mult;
                    }
                }
                // Check correct tendency/winner
                else {
                    const liveTendency = liveHome > liveAway ? "H" : (liveHome < liveAway ? "A" : "D");
                    const predTendency = pred.home > pred.away ? "H" : (pred.home < pred.away ? "A" : "D");

                    if (liveTendency === predTendency) {
                        tierHit = "winner";
                        projectedPoints = (settings.winner || 1) * mult;
                    }
                }
            } else if (bet.type === "CHOICE" && bet.liveScore) {
                // For choice bets, we can't always determine winner from live score
                // But if winningOutcome is set in proofing, we could use that
                // For now, just mark as "tracking"
            }

            if (projectedPoints > 0) {
                predictionsLookingGood++;
                totalProjectedPoints += projectedPoints;
            } else if (tierHit === "none") {
                // At this point, matchStatus is never NOT_STARTED (filtered above)
                predictionsAtRisk++;
            }

            liveBets.push({
                bet,
                wager,
                projectedPoints,
                tierHit,
                isLive: bet.liveScore?.matchStatus === "LIVE"
            });
        });

        return {
            liveBets,
            totalProjectedPoints,
            predictionsLookingGood,
            predictionsAtRisk,
            totalLive: liveBets.length
        };
    }, [bets, userWagers, leagueSettings]);

    // Get user's current rank
    const currentMember = members.find(m => m.uid === currentUserId);
    const sortedMembers = [...members].sort((a, b) => b.points - a.points);
    const currentRank = sortedMembers.findIndex(m => m.uid === currentUserId) + 1;

    // Calculate projected rank (current points + projected live points)
    const projectedRank = useMemo(() => {
        if (!currentMember) return currentRank;

        const projectedPoints = currentMember.points + liveAnalysis.totalProjectedPoints;
        const projectedSorted = [...members].map(m => ({
            ...m,
            projectedPts: m.uid === currentUserId ? projectedPoints : m.points
        })).sort((a, b) => b.projectedPts - a.projectedPts);

        return projectedSorted.findIndex(m => m.uid === currentUserId) + 1;
    }, [members, currentMember, currentUserId, liveAnalysis.totalProjectedPoints, currentRank]);

    const rankChange = currentRank - projectedRank;

    // Don't render if no live bets
    if (liveAnalysis.totalLive === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] p-4 mb-4"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">LIVE STATUS</span>
                </div>
                <span className="text-[10px] text-gray-500">
                    {liveAnalysis.totalLive} active bet{liveAnalysis.totalLive !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Main Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                {/* Current Rank */}
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Rank</p>
                    <div className="flex items-center justify-center gap-1">
                        <span className="text-2xl font-black text-white">#{currentRank}</span>
                        {rankChange !== 0 && (
                            <span className={`flex items-center text-xs font-bold ${rankChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {rankChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(rankChange)}
                            </span>
                        )}
                        {rankChange === 0 && projectedRank !== currentRank && (
                            <Minus className="w-3 h-3 text-gray-500" />
                        )}
                    </div>
                    {projectedRank !== currentRank && (
                        <p className="text-[9px] text-gray-500 mt-1">→ #{projectedRank} if scores hold</p>
                    )}
                </div>

                {/* Projected Points */}
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Live Pts</p>
                    <div className="flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className={`text-2xl font-black ${liveAnalysis.totalProjectedPoints > 0 ? "text-emerald-400" : "text-gray-500"}`}>
                            +{liveAnalysis.totalProjectedPoints}
                        </span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">if scores hold</p>
                </div>

                {/* Predictions Status */}
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
                    <div className="flex items-center justify-center gap-2">
                        {liveAnalysis.predictionsLookingGood > 0 && (
                            <span className="flex items-center gap-0.5 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-sm font-black">{liveAnalysis.predictionsLookingGood}</span>
                            </span>
                        )}
                        {liveAnalysis.predictionsAtRisk > 0 && (
                            <span className="flex items-center gap-0.5 text-red-400">
                                <XCircle className="w-3 h-3" />
                                <span className="text-sm font-black">{liveAnalysis.predictionsAtRisk}</span>
                            </span>
                        )}
                        {liveAnalysis.predictionsLookingGood === 0 && liveAnalysis.predictionsAtRisk === 0 && (
                            <span className="text-gray-500 text-sm font-bold">—</span>
                        )}
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">
                        {liveAnalysis.predictionsLookingGood > 0
                            ? `${liveAnalysis.predictionsLookingGood} on track`
                            : "tracking..."}
                    </p>
                </div>
            </div>

            {/* Individual Bet Breakdown (if any are scoring) */}
            {liveAnalysis.liveBets.filter(b => b.projectedPoints > 0).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Scoring Bets</p>
                    <div className="space-y-1.5">
                        {liveAnalysis.liveBets.filter(b => b.projectedPoints > 0).map(item => (
                            <div key={item.bet.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {item.isLive && (
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                    )}
                                    <span className="text-gray-400 truncate">{item.bet.question}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${item.tierHit === "exact" ? "bg-emerald-500/20 text-emerald-400" :
                                        item.tierHit === "diff" ? "bg-blue-500/20 text-blue-400" :
                                            item.tierHit === "winner" ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-gray-500/20 text-gray-400"
                                        }`}>
                                        {item.tierHit === "exact" ? "🎯 Exact" :
                                            item.tierHit === "diff" ? "📊 Diff" :
                                                item.tierHit === "winner" ? "✓ Winner" : "—"}
                                    </span>
                                    <span className="text-emerald-400 font-black">+{item.projectedPoints}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
