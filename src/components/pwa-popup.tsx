"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Download, X, CheckSquare, Square } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";

export function PwaPopup() {
    const { canInstall, isInstalled, promptInstall } = usePWAInstall();
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check for iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);

        // If installed, never show
        if (isInstalled) return;

        // Check LocalStorage preferences
        const hide = localStorage.getItem("pwa-popup-hide") === "true";
        if (hide) return;

        const lastShown = localStorage.getItem("pwa-popup-last-shown");
        if (lastShown) {
            const date = new Date(lastShown);
            const now = new Date();
            // 24 hours cooldown
            if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) return;
        }

        // Show after 3 seconds delay to not block initial load
        const timer = setTimeout(() => setIsOpen(true), 3000);
        return () => clearTimeout(timer);
    }, [isInstalled]);

    const handleClose = () => {
        setIsOpen(false);
        // Record that we showed it today
        localStorage.setItem("pwa-popup-last-shown", new Date().toISOString());

        if (dontShowAgain) {
            localStorage.setItem("pwa-popup-hide", "true");
        }
    };

    const handleInstall = async () => {
        if (canInstall) {
            const result = await promptInstall();
            if (result) setIsOpen(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 50, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center text-white relative">
                            <button
                                onClick={handleClose}
                                className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                            >
                                <Smartphone className="mx-auto mb-3 h-12 w-12 drop-shadow-md" />
                            </motion.div>
                            <h2 className="font-comic text-3xl font-black uppercase tracking-wide drop-shadow-sm">
                                Install App
                            </h2>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="mb-6 text-center text-lg font-bold text-slate-600 leading-tight">
                                Get the full <span className="text-purple-600">GambleGang</span> experience! Add to home screen for fullscreen mode & faster access.
                            </p>

                            {canInstall ? (
                                <Button
                                    onClick={handleInstall}
                                    className="mb-4 h-14 w-full border-2 border-black bg-emerald-400 text-lg font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-2px] hover:bg-emerald-500 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Download className="mr-2 h-6 w-6" />
                                    Install Now
                                </Button>
                            ) : (
                                <div className="mb-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                                    <p className="mb-2 text-sm font-bold text-slate-500 uppercase">
                                        To Install on {isIOS ? "iOS" : "Device"}:
                                    </p>
                                    <div className="text-xs font-medium text-slate-800 space-y-2">
                                        {isIOS ? (
                                            <>
                                                <p>1. Tap the <span className="font-black">Share</span> button <span className="inline-block rounded border border-slate-300 bg-white px-1 text-[10px]">⎋</span></p>
                                                <p>2. Scroll down & tap <span className="font-black">Add to Home Screen</span> <span className="inline-block rounded border border-slate-300 bg-white px-1 text-[10px]">+</span></p>
                                            </>
                                        ) : (
                                            <p>Tap your browser menu (⋮) and select <br /><span className="font-black">"Install App"</span> or <span className="font-black">"Add to Home Screen"</span></p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Footer / Checkbox */}
                            <div
                                className="flex items-center justify-center space-x-2 border-t border-dashed border-slate-200 pt-4 cursor-pointer"
                                onClick={() => setDontShowAgain(!dontShowAgain)}
                            >
                                {dontShowAgain ? (
                                    <CheckSquare className="h-5 w-5 text-purple-600" />
                                ) : (
                                    <Square className="h-5 w-5 text-slate-400" />
                                )}
                                <span className="text-xs font-bold text-slate-500 select-none">
                                    Don't show this again
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
