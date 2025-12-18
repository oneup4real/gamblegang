"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Ticket, Clock, History, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BetCard } from "@/components/bet-card";
import { GroupedBetsByTime } from "@/components/grouped-bets";
import { Bet, DashboardBetWithWager } from "@/lib/services/bet-service";
import { LEAGUE_COLOR_SCHEMES, LeagueColorScheme } from "@/lib/services/league-service";
import { format } from "date-fns";

interface BetTabsProps {
    activeBets: DashboardBetWithWager[];
    availableBets: DashboardBetWithWager[];
    pendingBets: DashboardBetWithWager[];
    historyBets: DashboardBetWithWager[];
    userId: string;
    onDismiss?: (betId: string) => void;
    onClearAll?: (betIds: string[]) => void;
    onRefresh?: () => void;
    initialTab?: "active" | "available" | "pending" | "history";
}

type TabType = "active" | "available" | "pending" | "history";

const tabConfig = {
    active: { icon: Gamepad2, label: "Active", color: "bg-blue-500" },
    available: { icon: Ticket, label: "Available", color: "bg-green-500" },
    pending: { icon: Clock, label: "Pending", color: "bg-yellow-500" },
    history: { icon: History, label: "History", color: "bg-gray-500" }
};

export function BetTabs({
    activeBets,
    availableBets,
    pendingBets,
    historyBets,
    userId,
    onDismiss,
    onClearAll,
    onRefresh,
    initialTab
}: BetTabsProps) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab || "active");

    // Sync with external initialTab changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const tabs: { key: TabType; bets: DashboardBetWithWager[] }[] = [
        { key: "active", bets: activeBets },
        { key: "available", bets: availableBets },
        { key: "pending", bets: pendingBets },
        { key: "history", bets: historyBets }
    ];

    const currentBets = tabs.find(t => t.key === activeTab)?.bets || [];

    return (
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Tab Headers */}
            <div className="flex overflow-x-auto">
                {tabs.map(({ key, bets }) => {
                    const config = tabConfig[key];
                    const IconComponent = config.icon;
                    const isActive = activeTab === key;

                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 font-black uppercase text-sm transition-all ${isActive
                                ? "bg-primary text-white"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                }`}
                        >
                            <IconComponent className="h-4 w-4" />
                            <span>{config.label}</span>
                            {bets.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-white/20 text-white" : "bg-gray-200"
                                    }`}>
                                    {bets.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Clear All Button for History */}
            {activeTab === "history" && historyBets.length > 0 && onClearAll && (
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <Button
                        onClick={() => onClearAll(historyBets.map(b => b.id))}
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-300 hover:bg-red-50"
                    >
                        Clear All History
                    </Button>
                </div>
            )}

            {/* Tab Content */}
            <div className="max-h-[800px] overflow-y-auto bg-gray-50 p-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {currentBets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                    {(() => {
                                        const IconComponent = tabConfig[activeTab].icon;
                                        return <IconComponent className="h-6 w-6 text-gray-300" />;
                                    })()}
                                </div>
                                <p className="font-bold">No {tabConfig[activeTab].label.toLowerCase()} bets</p>
                            </div>
                        ) : activeTab === "available" ? (
                            /* Grouped view for available bets */
                            <GroupedBetsByTime
                                bets={currentBets as any[]}
                                getClosingDate={(bet: any) => bet.closesAt ? new Date(bet.closesAt.seconds * 1000) : null}
                                renderBet={(bet: any) => (
                                    <div key={bet.id} className="relative mb-4">
                                        <BetCard
                                            bet={bet as Bet}
                                            userPoints={bet.userPoints}
                                            userWager={bet.wager ? { ...bet.wager, id: "dashboard", userId: userId, userName: "Me", placedAt: new Date() } as any : undefined}
                                            mode={bet.leagueMode === "ZERO_SUM" ? "ZERO_SUM" : "STANDARD"}
                                            powerUps={bet.userPowerUps}
                                            onWagerSuccess={onRefresh}
                                            isOwnerOverride={bet.creatorId === userId}
                                        />
                                        <div className="mt-2 flex items-center justify-center gap-4">
                                            <Link href={`/leagues/${bet.leagueId}?bet=${bet.id}`} className="group flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400 hover:text-black transition-colors">
                                                <span>View in League</span>
                                                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </Link>
                                        </div>
                                        <div className="absolute top-[-10px] left-4 z-20">
                                            {(() => {
                                                const colorScheme = (bet.leagueColorScheme as LeagueColorScheme) || 'purple';
                                                const colors = LEAGUE_COLOR_SCHEMES[colorScheme] || LEAGUE_COLOR_SCHEMES.purple;
                                                const icon = bet.leagueIcon || (bet.leagueMode === "ZERO_SUM" ? "💰" : "🎮");
                                                return (
                                                    <span className={`bg-gradient-to-r ${colors.from} ${colors.to} ${colors.text} text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm flex items-center gap-1`}>
                                                        <span className="text-xs">{icon}</span>
                                                        {bet.leagueName}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            />
                        ) : (
                            <div className="space-y-6">
                                {currentBets.map((bet) => (
                                    <div key={bet.id} className="relative">
                                        <BetCard
                                            bet={bet as Bet}
                                            userPoints={bet.userPoints}
                                            userWager={bet.wager ? { ...bet.wager, id: "dashboard", userId: userId, userName: "Me", placedAt: new Date() } as any : undefined}
                                            mode={bet.leagueMode === "ZERO_SUM" ? "ZERO_SUM" : "STANDARD"}
                                            powerUps={bet.userPowerUps}
                                            onWagerSuccess={onRefresh}
                                            isOwnerOverride={bet.creatorId === userId}
                                        />
                                        <div className="mt-2 flex items-center justify-center gap-4">
                                            <Link href={`/leagues/${bet.leagueId}?bet=${bet.id}`} className="group flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400 hover:text-black transition-colors">
                                                <span>View in League</span>
                                                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </Link>
                                            {(activeTab === "history") && onDismiss && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDismiss(bet.id);
                                                    }}
                                                    className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            )}
                                        </div>
                                        <div className="absolute top-[-10px] left-4 z-20">
                                            {(() => {
                                                const colorScheme = (bet.leagueColorScheme as LeagueColorScheme) || 'purple';
                                                const colors = LEAGUE_COLOR_SCHEMES[colorScheme] || LEAGUE_COLOR_SCHEMES.purple;
                                                const icon = bet.leagueIcon || (bet.leagueMode === "ZERO_SUM" ? "💰" : "🎮");
                                                return (
                                                    <span className={`bg-gradient-to-r ${colors.from} ${colors.to} ${colors.text} text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm flex items-center gap-1`}>
                                                        <span className="text-xs">{icon}</span>
                                                        {bet.leagueName}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
