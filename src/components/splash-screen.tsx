"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface SplashScreenProps {
    onComplete?: () => void;
    minDisplayTime?: number; // Minimum time to show splash in ms
}

export function SplashScreen({ onComplete, minDisplayTime = 2500 }: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        // Check if we've already shown the splash this session
        const hasSeenSplash = sessionStorage.getItem('gg-splash-seen');

        if (hasSeenSplash) {
            setIsVisible(false);
            setIsAnimating(false);
            onComplete?.();
            return;
        }

        // Show splash for minimum time, then fade out
        const timer = setTimeout(() => {
            setIsAnimating(false);
            // Mark as seen
            sessionStorage.setItem('gg-splash-seen', 'true');

            // Fade out delay
            setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, 600);
        }, minDisplayTime);

        return () => clearTimeout(timer);
    }, [minDisplayTime, onComplete]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isAnimating && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                    }}
                >
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Floating particles */}
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full"
                                style={{
                                    width: Math.random() * 10 + 5,
                                    height: Math.random() * 10 + 5,
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    background: `rgba(${139 + Math.random() * 50}, ${92 + Math.random() * 50}, 246, ${0.2 + Math.random() * 0.3})`,
                                }}
                                animate={{
                                    y: [0, -100, 0],
                                    x: [0, Math.random() * 50 - 25, 0],
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.7, 0.3],
                                }}
                                transition={{
                                    duration: 3 + Math.random() * 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}

                        {/* Pulsing rings */}
                        {[1, 2, 3].map((ring) => (
                            <motion.div
                                key={ring}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-purple-500/30"
                                initial={{ width: 100, height: 100, opacity: 0 }}
                                animate={{
                                    width: [100, 400],
                                    height: [100, 400],
                                    opacity: [0.5, 0],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeOut",
                                    delay: ring * 0.4,
                                }}
                            />
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Logo Container with Glow */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                duration: 0.8,
                            }}
                            className="relative"
                        >
                            {/* Outer glow */}
                            <motion.div
                                className="absolute inset-0 rounded-full blur-3xl"
                                style={{
                                    background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)",
                                    width: "200%",
                                    height: "200%",
                                    left: "-50%",
                                    top: "-50%",
                                }}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 0.8, 0.5],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />

                            {/* Logo with bounce effect */}
                            <motion.div
                                animate={{
                                    y: [0, -10, 0],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="relative"
                            >
                                {/* Shadow under logo */}
                                <motion.div
                                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/30 rounded-full blur-md"
                                    animate={{
                                        width: ["8rem", "6rem", "8rem"],
                                        opacity: [0.3, 0.5, 0.3],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                />

                                {/* Logo Image */}
                                <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                                    <Image
                                        src="/GG_Logo.png"
                                        alt="GambleGang"
                                        fill
                                        className="object-contain drop-shadow-2xl"
                                        priority
                                    />
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Title with stagger animation */}
                        <motion.div
                            className="mt-8 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                        >
                            <motion.h1
                                className="text-4xl sm:text-5xl font-black text-white tracking-wider"
                                style={{
                                    textShadow: "0 0 40px rgba(139,92,246,0.8), 0 4px 0 rgba(0,0,0,0.3)",
                                    fontFamily: "var(--font-comic)",
                                }}
                            >
                                {"GambleGang".split("").map((char, index) => (
                                    <motion.span
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            delay: 0.6 + index * 0.05,
                                            duration: 0.3,
                                        }}
                                        className="inline-block"
                                    >
                                        {char}
                                    </motion.span>
                                ))}
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2, duration: 0.5 }}
                                className="mt-3 text-purple-300 font-bold text-sm uppercase tracking-widest"
                            >
                                Social Betting for Your Inner Circle
                            </motion.p>
                        </motion.div>

                        {/* Loading indicator */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.5, duration: 0.4 }}
                            className="mt-12 flex items-center gap-2"
                        >
                            {[0, 1, 2].map((dot) => (
                                <motion.div
                                    key={dot}
                                    className="w-3 h-3 rounded-full bg-purple-500"
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: dot * 0.2,
                                    }}
                                />
                            ))}
                        </motion.div>
                    </div>

                    {/* Bottom decorative elements */}
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    />

                    {/* Corner decorations */}
                    <motion.div
                        className="absolute top-8 left-8 text-3xl"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.8, type: "spring" }}
                    >
                        🎰
                    </motion.div>
                    <motion.div
                        className="absolute top-8 right-8 text-3xl"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2, type: "spring" }}
                    >
                        🃏
                    </motion.div>
                    <motion.div
                        className="absolute bottom-16 left-8 text-3xl"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2.1, type: "spring" }}
                    >
                        🎲
                    </motion.div>
                    <motion.div
                        className="absolute bottom-16 right-8 text-3xl"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.9, type: "spring" }}
                    >
                        💰
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
