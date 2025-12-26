"use client";

/**
 * UI VERSION TOGGLE
 * 
 * A switch component that allows users to toggle between v1 and v2 UI.
 * Shows in the navbar for easy access.
 */

import { useUIVersion } from "./ui-version-context";
import { motion } from "framer-motion";
import { Sparkles, LayoutDashboard } from "lucide-react";

export function UIVersionToggle() {
    const { version, toggleVersion, isV2 } = useUIVersion();

    return (
        <button
            onClick={toggleVersion}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] ${isV2
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "bg-white text-gray-600"
                }`}
            title={isV2 ? "Switch to Classic UI" : "Try New UI (Beta)"}
        >
            {isV2 ? (
                <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>NEW UI</span>
                </>
            ) : (
                <>
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>CLASSIC</span>
                </>
            )}

            {/* Beta badge for v2 */}
            {isV2 && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-yellow-400 text-black text-[8px] font-black rounded-full border border-black"
                >
                    BETA
                </motion.span>
            )}
        </button>
    );
}

// Compact version for mobile
export function UIVersionToggleCompact() {
    const { isV2, toggleVersion } = useUIVersion();

    return (
        <button
            onClick={toggleVersion}
            className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] hover:scale-105 ${isV2
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "bg-white text-gray-600"
                }`}
            title={isV2 ? "Switch to Classic UI" : "Try New UI (Beta)"}
        >
            {isV2 ? <Sparkles className="w-5 h-5" /> : <LayoutDashboard className="w-5 h-5" />}
        </button>
    );
}
