"use client";

import { motion } from "framer-motion";
import { TrendingUp, Trophy, Target, Zap } from "lucide-react";

interface WeeklySummaryProps {
    pointsGained: number;
    wins: number;
    losses: number;
    bestBet: number;
    sparklineData?: number[];
}

export function WeeklySummary({
    pointsGained,
    wins,
    losses,
    bestBet,
    sparklineData = []
}: WeeklySummaryProps) {
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    // Generate sparkline path
    const generateSparkline = (data: number[]) => {
        if (data.length < 2) return "";
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const width = 200;
        const height = 40;
        const step = width / (data.length - 1);

        const points = data.map((val, i) => {
            const x = i * step;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        });

        return `M ${points.join(" L ")}`;
    };

    // Default data if none provided
    const chartData = sparklineData.length > 0 ? sparklineData : [0, 10, 5, 25, 15, 35, 20];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        >
            <div className="flex items-center gap-2 p-4 border-b-2 border-black bg-gradient-to-r from-cyan-500 to-blue-500">
                <TrendingUp className="h-5 w-5 text-white" />
                <h3 className="font-black text-white uppercase tracking-wide">Weekly Summary</h3>
            </div>

            <div className="p-4">
                {/* Sparkline Chart */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <svg
                        viewBox="0 0 200 40"
                        className="w-full h-12"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d={generateSparkline(chartData)}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-1 text-green-600 mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Points</span>
                        </div>
                        <p className={`text-xl font-black ${pointsGained >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {pointsGained >= 0 ? "+" : ""}{pointsGained}
                        </p>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-1 text-blue-600 mb-1">
                            <Trophy className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">W/L</span>
                        </div>
                        <p className="text-xl font-black text-blue-600">
                            {wins}W - {losses}L
                        </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-1 text-purple-600 mb-1">
                            <Target className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Win Rate</span>
                        </div>
                        <p className="text-xl font-black text-purple-600">
                            {winRate}%
                        </p>
                    </div>

                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-1 text-yellow-600 mb-1">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Best Bet</span>
                        </div>
                        <p className="text-xl font-black text-yellow-600">
                            +{bestBet}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
