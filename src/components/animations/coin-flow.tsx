"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Coins } from "lucide-react";

interface CoinFlowProps {
    onComplete?: () => void;
    startPosition?: { x: number, y: number }; // Relative to viewport usually
}

export function CoinFlow({ onComplete, startPosition }: CoinFlowProps) {
    const [coins, setCoins] = useState<{ id: number; delay: number; x: number }[]>([]);

    useEffect(() => {
        // Create a batch of coins
        const batch = Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            delay: i * 0.05,
            x: (Math.random() - 0.5) * 100 // Random horizontal spread
        }));
        setCoins(batch);

        const timer = setTimeout(() => {
            onComplete?.();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center pb-20">
            <AnimatePresence>
                {coins.map((coin) => (
                    <motion.div
                        key={coin.id}
                        initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                        animate={{
                            opacity: [1, 1, 0],
                            y: -600 - Math.random() * 200, // Fly up
                            x: coin.x + (Math.random() - 0.5) * 50,
                            scale: 1,
                            rotate: Math.random() * 360
                        }}
                        transition={{
                            duration: 1 + Math.random() * 0.5,
                            delay: coin.delay,
                            ease: "easeOut"
                        }}
                        className="absolute bottom-10"
                        style={{
                            left: startPosition ? startPosition.x : "50%",
                            top: startPosition ? startPosition.y : undefined
                        }}
                    >
                        <div className="bg-yellow-400 rounded-full p-2 border-2 border-black shadow-sm">
                            <Coins className="h-6 w-6 text-black" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
