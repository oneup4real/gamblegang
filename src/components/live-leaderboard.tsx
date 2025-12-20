"use client";

/**
 * Live Leaderboard Components
 * 
 * Compact components for showing live position changes in the leaderboard.
 */

import { MemberWithLiveStats } from "@/hooks/use-live-leaderboard";
import { Trophy, User as UserIcon, Crown, ChevronUp, ChevronDown, Minus, Circle } from "lucide-react";

// ============================================
// POSITION CHANGE BADGE
// ============================================

interface PositionChangeBadgeProps {
    change: number;
    compact?: boolean;
}

export function PositionChangeBadge({ change, compact = false }: PositionChangeBadgeProps) {
    if (change === 0) {
        return (
            <div className={`flex items-center gap-0.5 text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                <Minus className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            </div>
        );
    }

    if (change > 0) {
        return (
            <div className={`flex items-center gap-0.5 text-green-600 font-bold ${compact ? 'text-[10px]' : 'text-xs'}`}>
                <ChevronUp className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} stroke-[3]`} />
                <span>{change}</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-0.5 text-red-500 font-bold ${compact ? 'text-[10px]' : 'text-xs'}`}>
            <ChevronDown className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} stroke-[3]`} />
            <span>{Math.abs(change)}</span>
        </div>
    );
}

// ============================================
// LIVE STATUS DOT
// ============================================

interface LiveStatusDotProps {
    winningBets: number;
    losingBets: number;
    neutralBets: number;
    compact?: boolean;
}

export function LiveStatusDot({ winningBets, losingBets, neutralBets, compact = false }: LiveStatusDotProps) {
    const size = compact ? "h-2 w-2" : "h-2.5 w-2.5";

    if (winningBets > losingBets) {
        return <Circle className={`${size} fill-green-500 text-green-500`} />;
    }

    if (losingBets > winningBets) {
        return <Circle className={`${size} fill-red-500 text-red-500`} />;
    }

    if (neutralBets > 0 || (winningBets > 0 && losingBets > 0)) {
        return <Circle className={`${size} fill-yellow-500 text-yellow-500`} />;
    }

    // No live bets
    return <Circle className={`${size} fill-gray-300 text-gray-300`} />;
}

// ============================================
// LIVE DELTA BADGE
// ============================================

interface LiveDeltaBadgeProps {
    delta: number;
    compact?: boolean;
}

export function LiveDeltaBadge({ delta, compact = false }: LiveDeltaBadgeProps) {
    if (delta === 0) {
        return (
            <span className={`font-bold text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                0
            </span>
        );
    }

    const isPositive = delta > 0;
    const colorClass = isPositive ? "text-green-600" : "text-red-500";
    const prefix = isPositive ? "+" : "";

    return (
        <span className={`font-bold ${colorClass} ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {prefix}{delta}
        </span>
    );
}

// ============================================
// LIVE INDICATOR HEADER
// ============================================

interface LiveIndicatorProps {
    hasLiveBets: boolean;
}

export function LiveIndicator({ hasLiveBets }: LiveIndicatorProps) {
    if (!hasLiveBets) return null;

    return (
        <div className="bg-white/20 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/40 shadow-sm">
            <div className="flex items-center gap-1.5 bg-red-500 px-2 py-0.5 rounded-full shadow-[0px_1px_2px_rgba(0,0,0,0.2)]">
                <Circle className="h-2 w-2 fill-white text-white animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Live
                </span>
            </div>
        </div>
    );
}

// ============================================
// COMPLETE LIVE LEADERBOARD ROW
// ============================================

interface LiveLeaderboardRowProps {
    member: MemberWithLiveStats;
    index: number;
    hasLiveBets: boolean;
    showROI?: boolean;
    allMembersActiveWagers?: Record<string, number>;
    league?: { mode: string; buyInType?: string; startCapital?: number };
}

export function LiveLeaderboardRow({
    member,
    index,
    hasLiveBets,
    showROI = false,
    allMembersActiveWagers = {},
    league
}: LiveLeaderboardRowProps) {
    const displayPoints = hasLiveBets
        ? member.livePoints
        : member.points + (allMembersActiveWagers[member.uid] || 0);

    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
                {/* Ranking */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm border-2 border-black ${index === 0 ? "bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" :
                    index === 1 ? "bg-zinc-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" :
                        index === 2 ? "bg-orange-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" :
                            "bg-gray-100 text-gray-500"
                    }`}>
                    {index + 1}
                </div>

                {/* Avatar */}
                {member.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={member.photoURL}
                        alt={member.displayName}
                        className="h-10 w-10 rounded-full border border-white/10"
                    />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                        <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                )}

                {/* Name & badges */}
                <div className="min-w-0">
                    <span className="font-black text-black truncate block">{member.displayName}</span>

                    {/* Role Badge */}
                    {member.role === 'OWNER' && (
                        <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 border border-yellow-300 mt-0.5">
                            <Crown className="h-3 w-3" /> OWNER
                        </span>
                    )}
                    {member.role === 'ADMIN' && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-300 mt-0.5">
                            ADM
                        </span>
                    )}
                    {member.role === 'MEMBER' && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 border border-gray-300 mt-0.5">
                            MEMBER
                        </span>
                    )}

                    {/* ROI for Zero Sum */}
                    {showROI && league?.mode === "ZERO_SUM" && (
                        <p className="text-xs text-gray-500 font-bold mt-1">
                            {(() => {
                                const buyIn = member.totalBought || (league.buyInType === "FIXED" ? league.startCapital : 0) || 0;
                                if (buyIn === 0) return "ROI: 0.0%";
                                const currentEquity = displayPoints;
                                const roi = ((currentEquity - buyIn) / buyIn * 100).toFixed(1);
                                return `ROI: ${roi}%`;
                            })()}
                        </p>
                    )}
                </div>
            </div>

            {/* Right side: Points + Live indicators */}
            <div className="flex items-center gap-3">
                {/* Live indicators (only show when there are live bets) */}
                {hasLiveBets && member.activeLiveBets > 0 && (
                    <div className="flex items-center gap-2">
                        {/* Position change */}
                        <PositionChangeBadge change={member.positionChange} compact />

                        {/* Delta */}
                        <LiveDeltaBadge delta={member.potentialDelta} compact />

                        {/* Status dot */}
                        <LiveStatusDot
                            winningBets={member.winningBets}
                            losingBets={member.losingBets}
                            neutralBets={member.neutralBets}
                            compact
                        />
                    </div>
                )}

                {/* Points */}
                <div className="text-right">
                    <div className="font-black text-2xl text-primary drop-shadow-[2px_2px_0_rgba(0,0,0,1)] font-comic">
                        {displayPoints.toLocaleString()} pts
                    </div>

                    {/* W/L Record */}
                    {member.recentResults && member.recentResults.length > 0 && (
                        <div className="flex items-center justify-end gap-2 mt-1">
                            <span className="text-[11px] font-black text-green-600">
                                {member.recentResults.filter(r => r === 'W').length}W
                            </span>
                            <span className="text-gray-300">/</span>
                            <span className="text-[11px] font-black text-red-500">
                                {member.recentResults.filter(r => r === 'L').length}L
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
