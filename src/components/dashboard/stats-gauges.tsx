"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Flame, Target, Gamepad2, Trophy } from "lucide-react";

interface StatsGaugesProps {
    winRate: number;
    activeBets: number;
    maxActiveBets: number;
    pointsTrend: number;
    winStreak: number;
}

export function StatsGauges({
    winRate,
    activeBets,
    maxActiveBets,
    pointsTrend,
    winStreak
}: StatsGaugesProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Win Rate Gauge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center"
            >
                <div className="relative w-20 h-20 mb-2">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                            fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke={winRate >= 60 ? "#10b981" : winRate >= 40 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${winRate * 2.51} 251`}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black">{winRate}%</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-black uppercase text-gray-600">
                    <Trophy className="h-4 w-4" />
                    Win Rate
                </div>
            </motion.div>

            {/* Active Bets Gauge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center"
            >
                <div className="relative w-20 h-20 mb-2">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                            fill="none"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#3b82f6"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(activeBets / Math.max(maxActiveBets, 1)) * 251} 251`}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black">{activeBets}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-black uppercase text-gray-600">
                    <Gamepad2 className="h-4 w-4" />
                    Active
                </div>
            </motion.div>

            {/* Points Trend */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center"
            >
                <div className={`flex items-center gap-1 mb-2 ${pointsTrend >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {pointsTrend >= 0 ? (
                        <TrendingUp className="h-8 w-8" />
                    ) : (
                        <TrendingDown className="h-8 w-8" />
                    )}
                    <span className="text-3xl font-black">
                        {pointsTrend >= 0 ? "+" : ""}{pointsTrend}%
                    </span>
                </div>
                <div className="flex items-center gap-1 text-sm font-black uppercase text-gray-600">
                    <Target className="h-4 w-4" />
                    Weekly Trend
                </div>
            </motion.div>

            {/* Win Streak */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center"
            >
                <div className="flex items-center gap-2 mb-2">
                    <Flame className={`h-10 w-10 ${winStreak >= 3 ? "text-orange-500" : "text-gray-300"}`} />
                    <span className="text-4xl font-black">{winStreak}</span>
                </div>
                <div className="text-sm font-black uppercase text-gray-600">
                    {winStreak >= 3 ? "🔥 On Fire!" : "Win Streak"}
                </div>
            </motion.div>
        </div>
    );
}
