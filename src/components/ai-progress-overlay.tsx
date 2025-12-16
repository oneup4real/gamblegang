import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AIProgressOverlayProps {
    isVisible: boolean;
    message: string;
    progress?: number; // 0-100
    subMessage?: string;
}

export function AIProgressOverlay({ isVisible, message, progress, subMessage }: AIProgressOverlayProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
                >
                    <div className="w-full max-w-md p-6 text-center text-white space-y-6">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="mx-auto w-16 h-16 rounded-full border-4 border-t-purple-500 border-r-purple-500 border-b-transparent border-l-transparent shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                        />

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-wider animate-pulse font-comic">
                                {message}
                            </h3>
                            {subMessage && (
                                <p className="text-sm font-bold text-gray-400">{subMessage}</p>
                            )}
                        </div>

                        {progress !== undefined && (
                            <div className="w-full bg-gray-800 rounded-full h-4 border-2 border-white/20 overflow-hidden relative shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[10px] font-black tracking-widest drop-shadow-md text-white">{Math.round(progress)}%</span>
                                </div>
                            </div>
                        )}

                        <div className="text-xs font-mono text-gray-500 mt-4">
                            Powered by Gemini 2.5 Flash
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
