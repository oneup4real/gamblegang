"use client";

/**
 * Live Bets Section Component
 * 
 * Displays user's active bets with real-time live scores.
 * Shows net position, winning/losing status, and live match info.
 */

import { useState } from "react";
import { useLiveBets, LiveBetData } from "@/hooks/use-live-bets";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ChevronDown,
    ChevronUp,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Circle,
    Clock,
    Trophy,
    XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LiveBetsSectionProps {
    userId: string;
    leagueId?: string;
    compact?: boolean;
}

export function LiveBetsSection({ userId, leagueId, compact = false }: LiveBetsSectionProps) {
    const { liveBets, stats, lastUpdated, loading, error } = useLiveBets(userId, leagueId);
    const [isExpanded, setIsExpanded] = useState(true);

    if (loading) {
        return (
            <div className="mb-6">
                <div className="border-4 border-black rounded-xl bg-yellow-100 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className="font-bold uppercase">Loading Live Bets...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || liveBets.length === 0) {
        return null; // Don't show section if no live bets
    }

    const netPositionColor = stats.netPosition >= 0 ? "text-green-600" : "text-red-600";
    const netPositionBg = stats.netPosition >= 0 ? "bg-green-100" : "bg-red-100";

    return (
        <div className="mb-6">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full border-4 border-black rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white flex items-center justify-between hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <Circle className="h-3 w-3 fill-current animate-pulse" />
                        <span className="font-bold uppercase tracking-wide">LIVE BETS</span>
                    </div>
                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">
                        {stats.totalActive}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`font-bold text-lg ${stats.netPosition >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {stats.netPosition >= 0 ? '+' : ''}{stats.netPosition} pts
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="mt-3 space-y-4">
                    {/* Stats Summary Card */}
                    <Card className={`border-4 border-black rounded-xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${netPositionBg}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold uppercase text-gray-600">Net Position</div>
                                <div className={`text-3xl font-black ${netPositionColor}`}>
                                    {stats.netPosition >= 0 ? '+' : ''}{stats.netPosition}
                                    <span className="text-lg ml-1">pts</span>
                                </div>
                            </div>
                            <div className="flex gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-black text-green-600">{stats.winningCount}</div>
                                    <div className="text-xs font-bold uppercase text-gray-500">Winning</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-red-600">{stats.losingCount}</div>
                                    <div className="text-xs font-bold uppercase text-gray-500">Losing</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-yellow-600">{stats.neutralCount}</div>
                                    <div className="text-xs font-bold uppercase text-gray-500">Neutral</div>
                                </div>
                            </div>
                        </div>
                        {lastUpdated && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                            </div>
                        )}
                    </Card>

                    {/* Live Bet Cards */}
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                        {liveBets.map((liveBet) => (
                            <LiveBetCard key={liveBet.bet.id} liveBet={liveBet} compact={compact} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface LiveBetCardProps {
    liveBet: LiveBetData;
    compact?: boolean;
}

function LiveBetCard({ liveBet, compact }: LiveBetCardProps) {
    const { bet, wager, liveScore, winStatus, potentialPayout } = liveBet;

    // Determine border color based on win status
    const borderColor =
        winStatus === "WINNING" ? "border-green-500" :
            winStatus === "LOSING" ? "border-red-500" :
                winStatus === "NEUTRAL" ? "border-yellow-500" :
                    "border-gray-300";

    const glowColor =
        winStatus === "WINNING" ? "shadow-[0_0_15px_rgba(34,197,94,0.5)]" :
            winStatus === "LOSING" ? "shadow-[0_0_15px_rgba(239,68,68,0.5)]" :
                "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";

    const statusBg =
        liveScore?.matchStatus === "LIVE" ? "bg-red-500" :
            liveScore?.matchStatus === "HALFTIME" ? "bg-yellow-500" :
                liveScore?.matchStatus === "FINISHED" ? "bg-gray-500" :
                    "bg-blue-500";

    // Extract team names
    const homeTeam = bet.matchDetails?.homeTeam || "Home";
    const awayTeam = bet.matchDetails?.awayTeam || "Away";

    // Format user's selection
    let userPick = "Unknown";
    if (bet.type === "MATCH" && typeof wager.selection === "object") {
        const sel = wager.selection as { home: number; away: number };
        userPick = `${sel.home} - ${sel.away}`;
    } else if (bet.type === "CHOICE" && bet.options && typeof wager.selection === "string") {
        userPick = bet.options[parseInt(wager.selection)]?.text || "Unknown";
    }

    return (
        <Card className={`min-w-[200px] border-4 ${borderColor} rounded-xl p-3 bg-white ${glowColor} flex-shrink-0 transition-all`}>
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-2">
                <div className={`${statusBg} text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                    {liveScore?.matchStatus === "LIVE" && (
                        <Circle className="h-2 w-2 fill-current animate-pulse" />
                    )}
                    {liveScore?.matchStatus === "HALFTIME" && "HT"}
                    {liveScore?.matchStatus === "FINISHED" && "FT"}
                    {liveScore?.matchStatus === "LIVE" && (liveScore.matchTime || "LIVE")}
                    {liveScore?.matchStatus === "NOT_STARTED" && "NS"}
                    {!liveScore && "..."}
                </div>
                {winStatus === "WINNING" && <Trophy className="h-4 w-4 text-green-500" />}
                {winStatus === "LOSING" && <XCircle className="h-4 w-4 text-red-500" />}
            </div>

            {/* Score */}
            <div className="text-center mb-2">
                <div className="text-xs font-bold uppercase text-gray-500 truncate">{homeTeam}</div>
                <div className="text-3xl font-black">
                    {liveScore?.homeScore ?? "—"} - {liveScore?.awayScore ?? "—"}
                </div>
                <div className="text-xs font-bold uppercase text-gray-500 truncate">{awayTeam}</div>

                {/* Note for missing live data */}
                {!liveScore && (
                    <div className="mt-1 text-[10px] font-bold text-orange-500 flex items-center justify-center gap-1">
                        <span>⚠️ No Ticker Data</span>
                    </div>
                )}
            </div>

            {/* User's Pick */}
            <div className="border-t-2 border-dashed border-gray-200 pt-2 mt-2">
                <div className="text-xs text-gray-500 uppercase">Your Pick</div>
                <div className={`font-bold ${winStatus === "WINNING" ? "text-green-600" : winStatus === "LOSING" ? "text-red-600" : "text-gray-700"}`}>
                    {userPick}
                </div>
            </div>

            {/* Potential Payout */}
            <div className="mt-2 text-right">
                <span className={`text-sm font-bold ${winStatus === "WINNING" ? "text-green-600" : "text-gray-400"}`}>
                    +{potentialPayout} pts
                </span>
            </div>
        </Card>
    );
}

export default LiveBetsSection;
