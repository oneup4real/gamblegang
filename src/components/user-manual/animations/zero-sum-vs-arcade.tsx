"use client";

import { motion } from "framer-motion";
import { User, Home } from "lucide-react";

export function ZeroSumVsArcadeAnimation() {
    return (
        <div className="grid grid-cols-2 gap-4 w-full h-48">
            {/* ZERO SUM */}
            <div className="bg-red-50 border-2 border-black rounded-xl p-2 flex flex-col items-center relative overflow-hidden">
                <span className="absolute top-1 left-2 text-[10px] font-black uppercase text-red-400">Zero Sum</span>
                <div className="mt-4 flex gap-4">
                    <User className="w-6 h-6" />
                    <User className="w-6 h-6" />
                </div>

                {/* Pot */}
                <div className="mt-2 w-16 h-12 border-b-2 border-l-2 border-r-2 border-black rounded-b-xl flex justify-center items-end pb-1 relative">
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
                    <p className="text-[9px] font-bold leading-tight">Winners take the Pot.</p>
                    <p className="text-[10px] font-black">Shark vs Fish</p>
                </div>
            </div>

            {/* ARCADE */}
            <div className="bg-blue-50 border-2 border-black rounded-xl p-2 flex flex-col items-center relative overflow-hidden">
                <span className="absolute top-1 left-2 text-[10px] font-black uppercase text-blue-400">Arcade</span>

                <div className="mt-4 flex gap-4">
                    <User className="w-6 h-6" />
                    <Home className="w-6 h-6 text-blue-600" />
                </div>

                {/* Arrows */}
                <div className="flex items-center gap-1 mt-4">
                    <motion.div
                        className="w-2 h-2 rounded-full bg-yellow-400 border border-black"
                        animate={{ x: [0, 20], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    />
                    <span className="text-xs font-black">vs</span>
                    <motion.div
                        className="w-2 h-2 rounded-full bg-yellow-400 border border-black"
                        animate={{ x: [20, 0], opacity: [0, 1] }}
                        transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                    />
                    <motion.div
                        className="w-2 h-2 rounded-full bg-yellow-400 border border-black"
                        animate={{ x: [20, 0], opacity: [0, 1] }}
                        transition={{ repeat: Infinity, duration: 2, delay: 1.1 }}
                    />
                </div>

                <div className="mt-2 text-center">
                    <p className="text-[9px] font-bold leading-tight">Playing the House.</p>
                    <p className="text-[10px] font-black">Flexible Odds</p>
                </div>
            </div>
        </div>
    );
}
