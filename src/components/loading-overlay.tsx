"use client";

/**
 * LOADING OVERLAY
 * 
 * A beautiful full-screen loading overlay with animated logo
 * Shown while the dashboard/app is loading data
 */

import { motion } from "framer-motion";
import Image from "next/image";

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
        >
            {/* Animated Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating particles */}
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white/10 rounded-full"
                        initial={{
                            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
                            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
                        }}
                        animate={{
                            y: [null, -100],
                            opacity: [0.2, 0.8, 0.2],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}

                {/* Gradient orbs */}
                <motion.div
                    className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo with pulse animation */}
                <motion.div
                    className="relative"
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    {/* Glow effect behind logo */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-xl opacity-50"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    {/* Logo */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.1,
                        }}
                        className="relative w-32 h-32 md:w-40 md:h-40"
                    >
                        <Image
                            src="/GG_Logo.png"
                            alt="GambleGang"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </motion.div>
                </motion.div>

                {/* App Name */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-3xl md:text-4xl font-black text-white tracking-tight"
                    style={{ fontFamily: "Comic Neue, cursive" }}
                >
                    <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                        Gamble
                    </span>
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                        Gang
                    </span>
                </motion.h1>

                {/* Loading indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 flex flex-col items-center gap-4"
                >
                    {/* Animated dots loader */}
                    <div className="flex items-center gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                                animate={{
                                    y: [-5, 5, -5],
                                    opacity: [1, 0.5, 1],
                                }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                }}
                            />
                        ))}
                    </div>

                    {/* Message */}
                    <motion.p
                        className="text-sm text-gray-400 font-medium"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {message}
                    </motion.p>
                </motion.div>

                {/* Progress bar */}
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden"
                >
                    <motion.div
                        className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </motion.div>
            </div>

            {/* Bottom branding */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 text-xs text-white/30 font-medium tracking-wider"
            >
                LOADING YOUR BETS...
            </motion.p>
        </motion.div>
    );
}
