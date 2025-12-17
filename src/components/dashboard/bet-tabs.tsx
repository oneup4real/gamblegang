"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Ticket, Clock, History, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
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
    onRefresh
}: BetTabsProps) {
    const [activeTab, setActiveTab] = useState<TabType>("active");
    const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());

    const tabs: { key: TabType; bets: DashboardBetWithWager[] }[] = [
        { key: "active", bets: activeBets },
        { key: "available", bets: availableBets },
        { key: "pending", bets: pendingBets },
        { key: "history", bets: historyBets }
    ];

    const currentBets = tabs.find(t => t.key === activeTab)?.bets || [];

    const toggleBetExpand = (betId: string) => {
        const newExpanded = new Set(expandedBets);
        if (newExpanded.has(betId)) {
            newExpanded.delete(betId);
        } else {
            newExpanded.add(betId);
        }
        setExpandedBets(newExpanded);
    };

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
            <div className="max-h-[500px] overflow-y-auto">
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
                            <div className="divide-y divide-gray-100">
                                {currentBets.map((bet) => {
                                    const isBetExpanded = expandedBets.has(bet.id);

                                    return (
                                        <div key={bet.id} className="hover:bg-gray-50 transition-colors">
                                            <button
                                                onClick={() => toggleBetExpand(bet.id)}
                                                className="w-full p-4 text-left"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs px-2 py-0.5 rounded font-bold border ${bet.status === "OPEN" ? "bg-green-100 text-green-700 border-green-300" :
                                                                bet.status === "RESOLVED" ? "bg-blue-100 text-blue-700 border-blue-300" :
                                                                    bet.status === "PROOFING" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                                                                        "bg-gray-100 text-gray-600 border-gray-300"
                                                                }`}>
                                                                {bet.status}
                                                            </span>
                                                            <span className="text-xs text-gray-400 font-medium">
                                                                {bet.leagueName}
                                                            </span>
                                                        </div>
                                                        <p className="font-black text-base truncate">{bet.question}</p>
                                                        {bet.closesAt && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {bet.status === "OPEN" ? "Closes" : "Closed"}: {format(bet.closesAt.toDate(), "MMM dd, HH:mm")}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {bet.wager && (
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs text-gray-500">Wagered</p>
                                                            <p className="font-black text-lg">{bet.wager.amount} pts</p>
                                                            {(bet.status === "RESOLVED" || bet.status === "INVALID") && bet.wager.status !== "PENDING" && (
                                                                <div className="mt-1">
                                                                    <p className="text-xs text-gray-500">Net Result</p>
                                                                    <p className={`font-black text-lg ${bet.wager.status === "WON" ? "text-green-600" :
                                                                        bet.wager.status === "LOST" ? "text-red-600" :
                                                                            "text-yellow-600"
                                                                        }`}>
                                                                        {bet.wager.status === "WON" ? `+${(bet.wager.payout || 0) - bet.wager.amount}` :
                                                                            bet.wager.status === "LOST" ? `-${bet.wager.amount}` :
                                                                                "0"} pts
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="text-gray-400">
                                                        {isBetExpanded ? <ChevronUp /> : <ChevronDown />}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Expanded Content with Full Bet Action Card */}
                                            <AnimatePresence>
                                                {isBetExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-gray-200 bg-gray-50 overflow-hidden"
                                                    >
                                                        <div className="p-4">
                                                            <BetCard
                                                                bet={bet as Bet}
                                                                userPoints={0} // Dashboard does not have context of league points, minimal impact for non-betting actions
                                                                userWager={bet.wager ? { ...bet.wager, id: "dashboard", userId: userId, userName: "Me", placedAt: new Date() } as any : undefined}
                                                                mode={bet.leagueMode === "ZERO_SUM" ? "ZERO_SUM" : "STANDARD"}
                                                                onWagerSuccess={onRefresh} // Refresh dashboard on any successful action (vote, dispute, resolve)
                                                            />

                                                            {/* Extra Actions */}
                                                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                                                                <Link href={`/leagues/${bet.leagueId}?bet=${bet.id}`} className="flex-1">
                                                                    <Button variant="outline" className="w-full">
                                                                        View in League <ExternalLink className="ml-2 h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                                {(activeTab === "history") && onDismiss && (
                                                                    <Button
                                                                        variant="outline"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onDismiss(bet.id);
                                                                        }}
                                                                        className="border-red-300 text-red-500 hover:bg-red-50"
                                                                    >
                                                                        Clear
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
