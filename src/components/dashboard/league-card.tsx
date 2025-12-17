"use client";

import { motion } from "framer-motion";
import { Trophy, Gamepad2, Clock, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { League } from "@/lib/services/league-service";

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
        if (rank === 1) return { emoji: "🥇", bg: "bg-yellow-400" };
        if (rank === 2) return { emoji: "🥈", bg: "bg-gray-300" };
        if (rank === 3) return { emoji: "🥉", bg: "bg-amber-600" };
        return { emoji: `#${rank}`, bg: "bg-gray-200" };
    };

    const badge = rankBadge();

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Link href={`/leagues/${league.id}`}>
                <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{league.mode === "ZERO_SUM" ? "💰" : "🎮"}</span>
                            <h3 className="font-black text-lg uppercase tracking-wide truncate max-w-[150px]">
                                {league.name}
                            </h3>
                        </div>
                        <div className={`${badge.bg} w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                            {isTopRank ? badge.emoji : badge.emoji}
                        </div>
                    </div>

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
                                className={`h-full ${winRate >= 60 ? "bg-gradient-to-r from-green-400 to-green-500" : winRate >= 40 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" : "bg-gradient-to-r from-blue-400 to-blue-500"}`}
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
            </Link>
        </motion.div>
    );
}
