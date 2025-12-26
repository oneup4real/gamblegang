"use client";

/**
 * LIVE SCORE ANIMATION
 * Shows live score updates with animation
 */

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function LiveScoreAnimation() {
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [minute, setMinute] = useState(15);

    useEffect(() => {
        const interval = setInterval(() => {
            setMinute(prev => {
                if (prev >= 90) {
                    setHomeScore(0);
                    setAwayScore(0);
                    return 15;
                }
                // Random goal
                if (Math.random() < 0.15) {
                    if (Math.random() < 0.6) {
                        setHomeScore(h => Math.min(h + 1, 4));
                    } else {
                        setAwayScore(a => Math.min(a + 1, 3));
                    }
                }
                return prev + 15;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="flex items-center gap-1">
                <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                />
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">LIVE</span>
            </div>

            <motion.div
                className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl border-2 border-black p-4 w-full max-w-[200px]"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
            >
                <div className="flex items-center justify-center gap-4 text-white">
                    <div className="text-center">
                        <motion.p
                            key={homeScore}
                            initial={{ scale: 1.5, color: "#22c55e" }}
                            animate={{ scale: 1, color: "#ffffff" }}
                            className="text-3xl font-black"
                        >
                            {homeScore}
                        </motion.p>
                        <p className="text-[9px] text-gray-400 font-bold">HOME</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-500">:</p>
                        <motion.p
                            key={minute}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-emerald-400 font-black"
                        >
                            {minute}'
                        </motion.p>
                    </div>
                    <div className="text-center">
                        <motion.p
                            key={awayScore}
                            initial={{ scale: 1.5, color: "#22c55e" }}
                            animate={{ scale: 1, color: "#ffffff" }}
                            className="text-3xl font-black"
                        >
                            {awayScore}
                        </motion.p>
                        <p className="text-[9px] text-gray-400 font-bold">AWAY</p>
                    </div>
                </div>
            </motion.div>

            <p className="text-[10px] text-center text-gray-500 font-medium">
                Real-time scores from TheSportsDB
            </p>
        </div>
    );
}
