"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Ticket, Clock, History, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BetCard } from "@/components/bet-card";
import { Bet, DashboardBetWithWager } from "@/lib/services/bet-service";
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
            <div className="flex border-b-2 border-black overflow-x-auto">
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
                        ) : (
                            <div className="space-y-6">
                                {currentBets.map((bet) => (
                                    <div key={bet.id} className="relative">
                                        {/* Bet Card */}
                                        <BetCard
                                            bet={bet as Bet}
                                            userPoints={0} // Dashboard context
                                            userWager={bet.wager ? { ...bet.wager, id: "dashboard", userId: userId, userName: "Me", placedAt: new Date() } as any : undefined}
                                            mode={bet.leagueMode === "ZERO_SUM" ? "ZERO_SUM" : "STANDARD"}
                                            onWagerSuccess={onRefresh}
                                            isOwnerOverride={bet.creatorId === userId}
                                        />

                                        {/* Actions Below Card */}
                                        <div className="mt-[-1rem] bg-white border-2 border-t-0 border-black rounded-b-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative z-10 mx-1">
                                            <div className="flex divide-x-2 divide-black">
                                                <Link href={`/leagues/${bet.leagueId}?bet=${bet.id}`} className="flex-1">
                                                    <button className="w-full py-2 hover:bg-gray-100 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors">
                                                        <span>View in League</span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </button>
                                                </Link>

                                                {(activeTab === "history") && onDismiss && (
                                                    <div className="flex-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDismiss(bet.id);
                                                            }}
                                                            className="w-full py-2 hover:bg-red-50 text-red-600 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* League Badge floating or integrated? 
                                            The SidePanelTicket handles status. 
                                            We might want to show League Name above the card or integrated.
                                            Currently SidePanelTicket doesn't show league name. 
                                            Let's add a small header above the card for League Name + Date if needed.
                                            Or keep it simple as requested "Just the tickets".
                                            The BetCard refactor (checked earlier) shows metadata like Date and Status.
                                            It does NOT show League Name explicitly in a dedicated prominent spot, mostly "Closes: ...". 
                                            
                                            Let's add a small "League: {leagueName}" tag above the card to keep context.
                                        */}
                                        <div className="absolute top-[-10px] left-4 z-20">
                                            <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">
                                                {bet.leagueName}
                                            </span>
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
