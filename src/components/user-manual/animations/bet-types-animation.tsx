"use client";

/**
 * BET TYPES ANIMATION
 * Shows different bet types: Match, Choice, Range
 */

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function BetTypesAnimation() {
    const [activeType, setActiveType] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveType(prev => (prev + 1) % 3);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const types = [
        {
            name: "Match Prediction",
            icon: "⚽",
            description: "Predict exact scores",
            example: (
                <div className="flex items-center justify-center gap-3 p-3 bg-slate-100 rounded-lg">
                    <div className="text-center">
                        <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-1" />
                        <input className="w-8 text-center font-black text-sm border rounded" value="2" readOnly />
                    </div>
                    <span className="font-bold text-gray-400">vs</span>
                    <div className="text-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-1" />
                        <input className="w-8 text-center font-black text-sm border rounded" value="1" readOnly />
                    </div>
                </div>
            ),
        },
        {
            name: "Multiple Choice",
            icon: "🎯",
            description: "Pick from options",
            example: (
                <div className="space-y-1.5">
                    <div className="p-2 bg-green-100 border-2 border-green-500 rounded-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="text-xs font-bold">Team A wins</span>
                    </div>
                    <div className="p-2 bg-gray-50 border rounded-lg flex items-center gap-2 opacity-60">
                        <div className="w-3 h-3 border rounded-full" />
                        <span className="text-xs font-medium">Draw</span>
                    </div>
                    <div className="p-2 bg-gray-50 border rounded-lg flex items-center gap-2 opacity-60">
                        <div className="w-3 h-3 border rounded-full" />
                        <span className="text-xs font-medium">Team B wins</span>
                    </div>
                </div>
            ),
        },
        {
            name: "Range / Number",
            icon: "🔢",
            description: "Guess a number",
            example: (
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Total goals scored?</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-gray-400">0</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full relative">
                            <motion.div
                                className="absolute left-1/2 -translate-x-1/2 -top-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow"
                                animate={{ x: [-20, 20, -20] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <span className="text-xs text-gray-400">10</span>
                    </div>
                    <p className="text-sm font-black mt-1">5 goals</p>
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                {types.map((type, idx) => (
                    <button
                        key={type.name}
                        onClick={() => setActiveType(idx)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${activeType === idx
                                ? "bg-white text-black shadow"
                                : "text-gray-500"
                            }`}
                    >
                        {type.icon}
                    </button>
                ))}
            </div>

            {/* Content */}
            <motion.div
                key={activeType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[200px]"
            >
                <p className="text-center font-black text-sm mb-1">
                    {types[activeType].name}
                </p>
                <p className="text-center text-[10px] text-gray-500 mb-3">
                    {types[activeType].description}
                </p>
                {types[activeType].example}
            </motion.div>
        </div>
    );
}
