"use client";

import { motion } from "framer-motion";
import { Trophy, Coins } from "lucide-react";

export function ZeroSumVsArcadeAnimation() {
    return (
        <div className="grid grid-cols-2 gap-4 w-full h-48">
            {/* ARCADE */}
            <div className="bg-blue-50 border-2 border-black rounded-xl p-2 flex flex-col items-center relative overflow-hidden">
                <span className="absolute top-1 left-2 text-[10px] font-black uppercase text-blue-400">Arcade</span>

                {/* Trophy for points */}
                <div className="mt-4">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                </div>

                {/* Points accumulating */}
                <div className="mt-2 flex flex-col items-center gap-1">
                    <motion.div
                        className="text-2xl font-black"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        850
                    </motion.div>
                    <span className="text-[9px] font-bold">Points</span>
                </div>

                <div className="mt-2 text-center">
                    <p className="text-[9px] font-bold leading-tight">Accumulate points.</p>
                    <p className="text-[10px] font-black">Most wins!</p>
                </div>
            </div>

            {/* ZERO SUM */}
            <div className="bg-red-50 border-2 border-black rounded-xl p-2 flex flex-col items-center relative overflow-hidden">
                <span className="absolute top-1 left-2 text-[10px] font-black uppercase text-red-400">Zero Sum</span>

                {/* Pot with dynamic coins */}
                <div className="mt-4 w-16 h-12 border-b-2 border-l-2 border-r-2 border-black rounded-b-xl flex justify-center items-end pb-1 relative">
                    <span className="text-xs font-black">POT</span>

                    {/* Coins falling in */}
                    <motion.div
                        className="absolute w-2 h-2 rounded-full bg-yellow-400 border border-black top-[-20px] left-2"
                        animate={{ y: [0, 25], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                    />
                    <motion.div
                        className="absolute w-2 h-2 rounded-full bg-yellow-400 border border-black top-[-20px] right-2"
                        animate={{ y: [0, 25], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                    />
                </div>

                <div className="mt-2 text-center">
                    <p className="text-[9px] font-bold leading-tight">Real-world betting.</p>
                    <p className="text-[10px] font-black">Dynamic Odds</p>
                </div>
            </div>
        </div>
    );
}
