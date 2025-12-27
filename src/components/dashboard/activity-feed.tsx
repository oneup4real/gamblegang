"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Trophy, XCircle, Vote, Clock, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
    id: string;
    type: "won" | "lost" | "vote_needed" | "proofing" | "resolved" | "new_bet";
    title: string;
    description?: string;
    points?: number;
    timestamp: Date;
    leagueId?: string;
    leagueName?: string;
    leagueColor?: string;
    betId?: string;
}

interface ActivityFeedProps {
    items: ActivityItem[];
    maxItems?: number;
}

const activityConfig = {
    won: {
        icon: Trophy,
        color: "text-green-600",
        bgColor: "bg-green-100",
        borderColor: "border-green-300"
    },
    lost: {
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        borderColor: "border-red-300"
    },
    vote_needed: {
        icon: Vote,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        borderColor: "border-purple-300"
    },
    proofing: {
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-300"
    },
    resolved: {
        icon: Trophy,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300"
    },
    new_bet: {
        icon: Activity,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        borderColor: "border-cyan-300"
    }
};

export function ActivityFeed({ items, maxItems = 10 }: ActivityFeedProps) {
    const displayedItems = items.slice(0, maxItems);

    return (
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-full">
            <div className="flex items-center gap-2 p-4 border-b-2 border-black bg-gradient-to-r from-purple-500 to-pink-500">
                <Activity className="h-5 w-5 text-white" />
                <h3 className="font-black text-white uppercase tracking-wide">Activity Feed</h3>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                {displayedItems.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="font-bold text-sm">No recent activity</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        <div className="divide-y divide-gray-100">
                            {displayedItems.map((item, idx) => {
                                const config = activityConfig[item.type];
                                const IconComponent = config.icon;

                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                                                <IconComponent className={`h-4 w-4 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-900 truncate">
                                                    {item.title}
                                                </p>
                                                {item.description && (
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {item.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-400">
                                                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                                    </span>
                                                    {item.leagueName && (
                                                        <span
                                                            className="text-[9px] px-1 py-0.5 rounded font-bold text-white truncate max-w-[80px] inline-block"
                                                            style={{
                                                                backgroundColor: item.leagueColor || '#6b7280'
                                                            }}
                                                            title={item.leagueName}
                                                        >
                                                            {item.leagueName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.points !== undefined && (
                                                <span className={`font-black text-sm ${item.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {item.points >= 0 ? "+" : ""}{item.points}
                                                </span>
                                            )}
                                            {item.leagueId && (
                                                <Link
                                                    href={`/leagues/${item.leagueId}${item.betId ? `?bet=${item.betId}` : ""}`}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4 text-gray-400" />
                                                </Link>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
