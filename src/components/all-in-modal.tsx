"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AllInModalProps {
    isOpen: boolean;
    amount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export function AllInModal({ isOpen, amount, onConfirm, onCancel }: AllInModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed left-[50%] top-[50%] z-[101] w-full max-w-md translate-x-[-50%] translate-y-[-50%]"
                    >
                        <div className="relative overflow-hidden rounded-2xl border-4 border-black bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                            {/* Flame animations */}
                            <div className="absolute top-4 right-4">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <Flame className="h-12 w-12 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" fill="white" />
                                </motion.div>
                            </div>

                            <div className="absolute top-4 left-4">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, -5, 5, 0]
                                    }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.5
                                    }}
                                >
                                    <Flame className="h-12 w-12 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" fill="white" />
                                </motion.div>
                            </div>

                            {/* Content */}
                            <div className="relative text-center space-y-6">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <AlertTriangle className="h-12 w-12 text-red-600" fill="currentColor" />
                                </motion.div>

                                <div>
                                    <motion.h2
                                        className="text-4xl font-black tracking-tight text-white font-comic uppercase drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                                        animate={{
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        🔥 ALL IN! 🔥
                                    </motion.h2>
                                    <p className="mt-2 text-xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                        You're betting everything!
                                    </p>
                                </div>

                                <div className="bg-white/90 backdrop-blur rounded-xl border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <p className="text-sm font-bold text-gray-700 uppercase mb-2">Wagering</p>
                                    <p className="text-5xl font-black text-black">
                                        {amount.toLocaleString()}
                                        <span className="text-2xl text-gray-600 ml-2">pts</span>
                                    </p>
                                    <p className="text-xs font-bold text-red-600 uppercase mt-2">
                                        ⚠️ If you lose, you're out!
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={onCancel}
                                        className="bg-white border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={onConfirm}
                                        className="bg-black text-white border-4 border-white font-black uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all"
                                    >
                                        I'M ALL IN!
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
