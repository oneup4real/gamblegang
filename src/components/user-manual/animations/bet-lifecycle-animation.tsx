"use client";

import { motion } from "framer-motion";
import { Lock, Eye, Trophy, CheckCircle2, Coins } from "lucide-react";
import { useState, useEffect } from "react";

export function BetLifecycleAnimation() {
    const [phase, setPhase] = useState(0); // 0: Open, 1: Locked, 2: Proofing, 3: Resolved

    useEffect(() => {
        const interval = setInterval(() => {
            setPhase((prev) => (prev + 1) % 4);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const phases = [
        { name: "OPEN", color: "bg-green-400", icon: Coins, text: "Place your bets!" },
        { name: "LOCKED", color: "bg-red-400", icon: Lock, text: "Game in progress..." },
        { name: "PROOFING", color: "bg-yellow-400", icon: Eye, text: "12h Review Period" },
        { name: "RESOLVED", color: "bg-blue-400", icon: Trophy, text: "Winners Paid!" }
    ];

    const current = phases[phase];
    const Icon = current.icon;

    return (
        <div className="w-full h-48 bg-white rounded-xl border-2 border-black p-4 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
            {/* Stepper Line */}
            <div className="absolute top-4 left-4 right-4 h-1 bg-gray-200" />
            <motion.div
                className="absolute top-4 left-4 h-1 bg-black"
                animate={{ width: `${(phase / 3) * 100}%` }} // Simplified width calc for visual
                style={{ maxWidth: 'calc(100% - 2rem)' }}
            />

            {/* Main Stage Card */}
            <motion.div
                key={phase}
                initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotate: 5 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className={`w-40 h-32 rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] flex flex-col items-center justify-center gap-2 ${current.color}`}
            >
                <div className="bg-white p-2 rounded-full border-2 border-black">
                    <Icon className="w-6 h-6 text-black" />
                </div>
                <div className="text-center">
                    <h4 className="font-black text-lg">{current.name}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-wide">{current.text}</p>
                </div>
            </motion.div>

            {/* Floating Elements based on phase */}
            {phase === 0 && (
                <motion.div
                    className="absolute bottom-2 right-10"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                >
                    <Coins className="w-6 h-6 text-yellow-500" />
                </motion.div>
            )}

            {phase === 3 && (
                <motion.div
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {/* Simple CSS Confetti dots could go here, but keeping it simple */}
                </motion.div>
            )}
        </div>
    );
}
