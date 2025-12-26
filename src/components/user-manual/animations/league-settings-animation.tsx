"use client";

/**
 * LEAGUE SETTINGS ANIMATION
 * Shows all the league configuration options
 */

import { motion } from "framer-motion";
import { useState } from "react";
import { Settings, Clock, Zap, Award, Users, Shield } from "lucide-react";

export function LeagueSettingsAnimation() {
    const [activeTab, setActiveTab] = useState(0);

    const settings = [
        {
            icon: <Award className="w-4 h-4" />,
            name: "Scoring",
            items: ["Exact: 3pts", "Diff: 2pts", "Winner: 1pt"],
            color: "bg-emerald-100 text-emerald-700"
        },
        {
            icon: <Clock className="w-4 h-4" />,
            name: "Dispute Window",
            items: ["4h / 8h / 12h / 24h"],
            color: "bg-blue-100 text-blue-700"
        },
        {
            icon: <Zap className="w-4 h-4" />,
            name: "Power-Ups",
            items: ["x2, x3, x4 Multipliers", "Limited per player"],
            color: "bg-orange-100 text-orange-700"
        },
        {
            icon: <Shield className="w-4 h-4" />,
            name: "Auto-Resolve",
            items: ["AI or API based", "Hands-free resolution"],
            color: "bg-purple-100 text-purple-700"
        },
    ];

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    League Configuration
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
                {settings.map((setting, idx) => (
                    <motion.div
                        key={setting.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className={`p-3 rounded-xl border-2 border-black/10 ${setting.color} cursor-pointer`}
                        onClick={() => setActiveTab(idx)}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {setting.icon}
                            <span className="font-black text-xs">{setting.name}</span>
                        </div>
                        <div className="space-y-0.5">
                            {setting.items.map((item, i) => (
                                <p key={i} className="text-[9px] font-medium opacity-80">{item}</p>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <p className="text-[10px] text-center text-gray-500 font-medium">
                All settings configurable per league
            </p>
        </div>
    );
}
