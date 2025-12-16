"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export function AiBetStatsAnimation() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 4);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-64 bg-gray-50 rounded-xl border-2 border-dashed border-black flex items-center justify-center relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-2 right-2 opacity-10">
                <BrainCircuit className="w-24 h-24" />
            </div>

            {/* Step 1: Input */}
            {step === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center gap-2"
                >
                    <div className="bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center gap-2 w-64">
                        <span className="text-xs font-bold text-gray-500">I want to bet on...</span>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "auto" }}
                            className="overflow-hidden whitespace-nowrap font-bold text-sm"
                        >
                            Real Madrid vs Barca
                        </motion.div>
                        <motion.div
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="w-0.5 h-4 bg-black"
                        />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">1. Describe it</span>
                </motion.div>
            )}

            {/* Step 2: Processing */}
            {step === 1 && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <BrainCircuit className="w-16 h-16 text-purple-600" />
                        </motion.div>
                        <motion.div
                            className="absolute -top-2 -right-2"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                        >
                            <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        </motion.div>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-purple-600">2. AI Magic...</span>
                </motion.div>
            )}

            {/* Step 3: Result */}
            {step === 2 && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white w-56 p-4 rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] relative"
                >
                    <div className="absolute -top-3 -right-3 bg-green-400 border-2 border-black p-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-black" />
                    </div>
                    <div className="h-2 w-12 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-full bg-gray-100 rounded mb-1" />
                    <div className="h-4 w-3/4 bg-gray-100 rounded" />

                    <div className="mt-4 flex gap-2">
                        <div className="h-8 flex-1 bg-black rounded-lg" />
                    </div>

                    <span className="absolute -bottom-8 left-0 right-0 text-center text-xs font-black uppercase tracking-widest text-gray-400">3. Review & Publish</span>
                </motion.div>
            )}

            {/* Step 4: Done */}
            {step === 3 && (
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    className="text-center"
                >
                    <h3 className="text-3xl font-black font-comic text-green-600 drop-shadow-[2px_2px_0_#000]">IT'S LIVE!</h3>
                    <p className="text-sm font-bold text-black mt-2">Players can now bet.</p>
                </motion.div>
            )}

            {/* Progress Dots */}
            <div className="absolute bottom-4 flex gap-2">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full border border-black ${i === step ? "bg-black" : "bg-white"}`}
                    />
                ))}
            </div>
        </div>
    );
}
