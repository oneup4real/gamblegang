"use client";

/**
 * POWER-UPS ANIMATION
 * Shows the x2, x3, x4 multiplier power-ups with visual effects
 */

import { motion } from "framer-motion";

export function PowerUpsAnimation() {
    const powerUps = [
        { label: "x2", color: "from-lime-400 to-green-500", delay: 0, description: "Double" },
        { label: "x3", color: "from-orange-400 to-amber-500", delay: 0.1, description: "Triple" },
        { label: "x4", color: "from-red-400 to-rose-500", delay: 0.2, description: "Quadruple" },
    ];

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Arcade Power-Ups
            </div>
            <div className="flex gap-4">
                {powerUps.map((p, i) => (
                    <motion.div
                        key={p.label}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: p.delay, type: "spring", bounce: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        <motion.div
                            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center text-white font-black text-xl`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            animate={{
                                boxShadow: [
                                    "3px 3px 0 0 #000",
                                    "3px 3px 10px 2px rgba(255,200,0,0.5)",
                                    "3px 3px 0 0 #000",
                                ],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                        >
                            {p.label}
                        </motion.div>
                        <span className="text-[10px] font-bold mt-1 text-gray-600">{p.description}</span>
                    </motion.div>
                ))}
            </div>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl"
            >
                <p className="text-xs font-bold text-yellow-800">
                    🎯 Exact Match: 3pts → <span className="text-green-600">6pts with x2!</span>
                </p>
            </motion.div>
        </div>
    );
}
