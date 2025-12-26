"use client";

/**
 * POINT TIERS ANIMATION
 * Shows the 3-tier scoring system for match predictions
 */

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function PointTiersAnimation() {
    const [activeTier, setActiveTier] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTier(prev => (prev + 1) % 3);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const tiers = [
        {
            icon: "🎯",
            name: "Exact Score",
            points: 3,
            color: "from-emerald-400 to-green-500",
            example: "Predicted: 2-1 | Result: 2-1",
            description: "Perfect prediction!"
        },
        {
            icon: "📊",
            name: "Goal Difference",
            points: 2,
            color: "from-blue-400 to-indigo-500",
            example: "Predicted: 3-2 | Result: 2-1",
            description: "Same difference (+1)"
        },
        {
            icon: "✓",
            name: "Correct Winner",
            points: 1,
            color: "from-yellow-400 to-amber-500",
            example: "Predicted: 4-0 | Result: 2-1",
            description: "Home team wins"
        },
    ];

    return (
        <div className="flex flex-col items-center gap-3 p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Match Prediction Points
            </div>

            <div className="space-y-2 w-full max-w-[260px]">
                {tiers.map((tier, idx) => (
                    <motion.div
                        key={tier.name}
                        animate={{
                            scale: activeTier === idx ? 1.02 : 1,
                            borderColor: activeTier === idx ? "#000" : "#e5e7eb",
                        }}
                        className={`p-3 rounded-xl border-2 bg-white transition-all ${activeTier === idx ? "shadow-[3px_3px_0_0_#000]" : ""
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{tier.icon}</span>
                                <span className="font-bold text-sm">{tier.name}</span>
                            </div>
                            <motion.span
                                className={`px-2 py-0.5 rounded-full text-xs font-black text-white bg-gradient-to-r ${tier.color}`}
                                animate={{
                                    scale: activeTier === idx ? [1, 1.1, 1] : 1,
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                +{tier.points} pts
                            </motion.span>
                        </div>
                        {activeTier === idx && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-2 pt-2 border-t border-gray-100"
                            >
                                <p className="text-[10px] text-gray-500 font-mono">{tier.example}</p>
                                <p className="text-[10px] text-gray-600 font-bold">{tier.description}</p>
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
