"use client";

import { motion } from "framer-motion";
import { Trophy, Gamepad2, Clock, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { League, LEAGUE_COLOR_SCHEMES, LeagueColorScheme } from "@/lib/services/league-service";

interface LeagueCardProps {
    league: League;
    rank?: number;
    points?: number;
    maxPoints?: number;
    activeBets?: number;
    pendingBets?: number;
    winRate?: number;
}

export function LeagueCard({
    league,
    rank = 1,
    points = 0,
    maxPoints = 1000,
    activeBets = 0,
    pendingBets = 0,
    winRate = 0
}: LeagueCardProps) {
    const progress = Math.min((points / maxPoints) * 100, 100);
    const isTopRank = rank <= 3;

    const rankBadge = () => {
        if (rank === 1) return { emoji: "🥇", bg: "bg-white", border: "border-yellow-500" };
        if (rank === 2) return { emoji: "🥈", bg: "bg-white", border: "border-gray-400" };
        if (rank === 3) return { emoji: "🥉", bg: "bg-white", border: "border-amber-700" };
        return { emoji: `#${rank}`, bg: "bg-gray-100", border: "border-gray-400" };
    };

    const badge = rankBadge();

    // Get color scheme (with fallback)
    const colorScheme = league.colorScheme || 'purple';
    const colors = LEAGUE_COLOR_SCHEMES[colorScheme] || LEAGUE_COLOR_SCHEMES.purple;

    // Get custom icon (with fallback)
    const leagueIcon = league.icon || (league.mode === "ZERO_SUM" ? "💰" : "🎮");

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Link href={`/leagues/${league.id}`}>
                <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                    {/* Gradient Header with League Name */}
                    <div className={`bg-gradient-to-r ${colors.from} ${colors.to} px-4 py-3 border-b-2 border-black`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl drop-shadow-md">{leagueIcon}</span>
                                <h3 className={`font-black text-lg uppercase tracking-wide truncate max-w-[150px] ${colors.text} drop-shadow-sm`}>
                                    {league.name}
                                </h3>
                            </div>
                            <div className={`${badge.bg} ${badge.border} w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                                {isTopRank ? badge.emoji : badge.emoji}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-gray-500">Points</span>
                                <span className="text-primary">{points.toLocaleString()} / {maxPoints.toLocaleString()}</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full border border-black overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full bg-gradient-to-r ${colors.from} ${colors.to}`}
                                />
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-blue-600">
                                    <Gamepad2 className="h-3.5 w-3.5" />
                                    <span className="font-bold">{activeBets} Active</span>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="font-bold">{pendingBets} Pending</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <TrendingUp className={`h-3.5 w-3.5 ${winRate >= 50 ? "text-green-500" : "text-red-500"}`} />
                                <span className={`font-black ${winRate >= 50 ? "text-green-600" : "text-red-600"}`}>
                                    {winRate}% WR
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

