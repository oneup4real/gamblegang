"use client";

/**
 * DASHBOARD PAGE V2 - COMPACT UI VERSION
 * 
 * A modernized dashboard with:
 * - Compact action badges
 * - Horizontal scrolling stats
 * - League pills selector
 * - Compact bet list
 */

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trophy, Target, Zap, CheckCircle2, XCircle, Clock, Flame, Search, ChevronRight, Settings, Award, TrendingUp } from "lucide-react";
import { getUserLeagues, League, LEAGUE_COLOR_SCHEMES } from "@/lib/services/league-service";
import { getUserDashboardStats, DashboardStats, DashboardBetWithWager } from "@/lib/services/bet-service";
import { CreateLeagueModal } from "@/components/create-league-modal";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { TeamLogo } from "@/components/team-logo";
import { LoadingOverlay } from "@/components/loading-overlay";

// ============================================
// COMPACT ACTION BADGES
// ============================================
function CompactActionBadges({
    voteNeeded,
    proofing,
    toResolve,
    onNavigate
}: {
    voteNeeded: number;
    proofing: number;
    toResolve: number;
    onNavigate: (leagueId: string, betId: string) => void;
}) {
    const badges = [
        { count: voteNeeded, label: "Vote", icon: "👁", color: "bg-blue-500", urgent: true },
        { count: proofing, label: "Verify", icon: "⏳", color: "bg-orange-500", urgent: false },
        { count: toResolve, label: "Resolve", icon: "⚖️", color: "bg-purple-500", urgent: true },
    ].filter(b => b.count > 0);

    if (badges.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 py-1">
            {badges.map(badge => (
                <motion.div
                    key={badge.label}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl ${badge.color} text-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]`}
                >
                    {badge.urgent && (
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                    <span className="text-sm">{badge.icon}</span>
                    <span className="font-black text-sm">{badge.count}</span>
                    <span className="font-bold text-xs opacity-80">{badge.label}</span>
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// GLOBAL STATS PILLS
// ============================================
function GlobalStatsPills({
    totalPoints,
    wins,
    losses,
    activeBets,
    winRate,
    streak
}: {
    totalPoints: number;
    wins: number;
    losses: number;
    activeBets: number;
    winRate: number;
    streak: number;
}) {
    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 py-2">
                {/* Total Points */}
                <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-yellow-400">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="font-black text-sm text-black">{totalPoints.toLocaleString()}</span>
                </div>

                {/* Win Rate */}
                <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-green-400">
                    <Target className="w-3.5 h-3.5" />
                    <span className="font-black text-sm text-black">{winRate}%</span>
                </div>

                {/* W/L */}
                <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-white">
                    <span className="font-black text-sm text-green-600">{wins}W</span>
                    <span className="text-gray-400">/</span>
                    <span className="font-black text-sm text-red-500">{losses}L</span>
                </div>

                {/* Active Bets */}
                {activeBets > 0 && (
                    <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-purple-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span className="font-black text-sm text-black">{activeBets}</span>
                    </div>
                )}

                {/* Streak */}
                {streak !== 0 && (
                    <div className={`shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] ${streak > 0 ? 'bg-orange-400' : 'bg-blue-300'}`}>
                        {streak > 0 ? <Flame className="w-3.5 h-3.5" /> : <span>❄️</span>}
                        <span className="font-black text-sm text-black">{Math.abs(streak)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// LEAGUE PILLS SELECTOR
// ============================================
function LeaguePillsSelector({
    leagues,
    selectedLeagueId,
    onSelect,
    onCreateNew
}: {
    leagues: League[];
    selectedLeagueId: string | null;
    onSelect: (id: string | null) => void;
    onCreateNew: () => void;
}) {
    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 py-2">
                {/* All button */}
                <button
                    onClick={() => onSelect(null)}
                    className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${selectedLeagueId === null
                        ? "bg-black text-white border-black shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
                        : "bg-white border-gray-200 hover:border-gray-400"
                        }`}
                >
                    All Leagues
                </button>

                {/* League pills */}
                {leagues.map(league => {
                    const colors = LEAGUE_COLOR_SCHEMES[league.colorScheme || 'purple'];
                    const isSelected = selectedLeagueId === league.id;
                    return (
                        <button
                            key={league.id}
                            onClick={() => onSelect(league.id || null)}
                            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all flex items-center gap-2 ${isSelected
                                ? `bg-gradient-to-r ${colors.from} ${colors.to} text-white border-black shadow-[2px_2px_0_rgba(0,0,0,1)]`
                                : "bg-white border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            {league.name}
                            {league.mode === "STANDARD" && <Award className="w-3 h-3" />}
                        </button>
                    );
                })}

                {/* Create new */}
                <button
                    onClick={onCreateNew}
                    className="shrink-0 px-3 py-2 rounded-xl font-bold text-sm border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    New
                </button>
            </div>
        </div>
    );
}

// ============================================
// COMPACT BET ROW
// ============================================
function CompactBetRow({ bet }: { bet: DashboardBetWithWager }) {
    const statusConfig = {
        OPEN: { color: "bg-green-500", label: "Open" },
        LOCKED: { color: "bg-amber-500", label: "Live" },
        PROOFING: { color: "bg-blue-500", label: "Verifying" },
        DISPUTED: { color: "bg-red-500", label: "Disputed" },
        RESOLVED: { color: "bg-slate-400", label: "Done" },
    };

    const config = statusConfig[bet.status as keyof typeof statusConfig] || statusConfig.OPEN;

    // Determine result for resolved bets
    let result: "WON" | "LOST" | "PUSH" | null = null;
    if (bet.status === "RESOLVED" && bet.wager) {
        result = bet.wager.status?.toUpperCase() as "WON" | "LOST" | "PUSH";
    }

    // Get user's selection display
    const getSelectionDisplay = () => {
        if (!bet.wager) return null;
        if (bet.type === "CHOICE" && bet.options) {
            const idx = Number(bet.wager.selection);
            return bet.options[idx]?.text || "";
        }
        if (bet.type === "MATCH") {
            const s = bet.wager.selection as { home: number; away: number };
            return `${s.home}-${s.away}`;
        }
        return String(bet.wager.selection);
    };

    return (
        <Link
            href={`/leagues/${bet.leagueId}?bet=${bet.id}`}
            className={`block p-3 rounded-xl border-2 transition-all hover:shadow-[2px_2px_0_rgba(0,0,0,0.5)] ${result === "WON" ? "border-emerald-300 bg-emerald-50" :
                result === "LOST" ? "border-red-200 bg-red-50/50 opacity-75" :
                    "border-gray-200 bg-white"
                }`}
        >
            <div className="flex items-center gap-3">
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full ${config.color} shrink-0`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${result === "LOST" ? "line-through text-gray-400" : ""}`}>
                        {bet.question}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate max-w-[100px]">{bet.leagueName}</span>
                        {bet.wager && (
                            <>
                                <span>•</span>
                                <span className="font-bold text-black">{getSelectionDisplay()}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right side badge */}
                <div className="shrink-0">
                    {result === "WON" && bet.wager?.payout && (
                        <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                            +{bet.wager.payout}
                        </span>
                    )}
                    {result === "LOST" && (
                        <span className="text-xs font-bold text-red-500">
                            ❌
                        </span>
                    )}
                    {bet.status === "OPEN" && !bet.wager && (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            Bet Now
                        </span>
                    )}
                    {bet.status === "OPEN" && bet.wager && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            Placed
                        </span>
                    )}
                    {(bet.status === "PROOFING" || bet.status === "DISPUTED") && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                            ⏳
                        </span>
                    )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
        </Link>
    );
}

// ============================================
// BET SECTION
// ============================================
function BetSection({
    title,
    bets,
    emptyMessage,
    showViewAll = false,
    limit = 5
}: {
    title: string;
    bets: DashboardBetWithWager[];
    emptyMessage: string;
    showViewAll?: boolean;
    limit?: number;
}) {
    const [showAll, setShowAll] = useState(false);
    const displayBets = showAll ? bets : bets.slice(0, limit);

    if (bets.length === 0) {
        return (
            <div className="text-center py-6 text-gray-400">
                <p className="text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-gray-700">{title}</h3>
                {bets.length > limit && !showAll && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="text-xs font-bold text-blue-600"
                    >
                        View all ({bets.length})
                    </button>
                )}
            </div>
            <div className="space-y-2">
                {displayBets.map(bet => (
                    <CompactBetRow key={bet.id} bet={bet} />
                ))}
            </div>
            {showAll && bets.length > limit && (
                <button
                    onClick={() => setShowAll(false)}
                    className="w-full text-xs font-bold text-gray-500 py-2"
                >
                    Show less
                </button>
            )}
        </div>
    );
}

// ============================================
// QUICK ACTIONS FAB
// ============================================
function QuickActionsFab({ onCreateLeague }: { onCreateLeague: () => void }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.button
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        onClick={() => { onCreateLeague(); setIsOpen(false); }}
                        className="absolute bottom-16 right-0 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg hover:scale-105 transition-transform text-sm font-bold border-2 border-black whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create League</span>
                    </motion.button>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                animate={{ rotate: isOpen ? 45 : 0 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[4px_4px_0_rgba(0,0,0,1)] border-2 border-black flex items-center justify-center hover:scale-105 transition-all"
            >
                <Plus className="w-6 h-6" strokeWidth={3} />
            </motion.button>
        </div>
    );
}

// ============================================
// MAIN DASHBOARD V2 COMPONENT
// ============================================
export function DashboardPageV2() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Data state
    const [leagues, setLeagues] = useState<League[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    // UI state
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"active" | "available" | "history">("active");
    const [searchQuery, setSearchQuery] = useState("");

    // Auth check
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Fetch leagues
    useEffect(() => {
        async function fetchLeagues() {
            if (user) {
                const userLeagues = await getUserLeagues(user.uid);
                setLeagues(userLeagues);
            }
        }
        if (user) fetchLeagues();
    }, [user]);

    // Fetch stats
    useEffect(() => {
        async function fetchStats() {
            if (user && leagues.length > 0) {
                const s = await getUserDashboardStats(user, leagues);
                setStats(s);
                setDataLoading(false);
            }
        }
        fetchStats();
    }, [user, leagues]);

    // Derived stats
    const totalPoints = useMemo(() => {
        return leagues.reduce((sum, l) => {
            // This would need league member data - approximate for now
            return sum;
        }, 0);
    }, [leagues]);

    const wins = stats?.wonBets || 0;
    const losses = stats?.lostBets || 0;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const activeBets = stats?.activeBets || 0;

    // Filter bets by league
    const filterByLeague = (bets: DashboardBetWithWager[]) => {
        if (!selectedLeagueId) return bets;
        return bets.filter(b => b.leagueId === selectedLeagueId);
    };

    // Get current tab bets
    const getCurrentBets = () => {
        if (!stats) return [];
        let bets: DashboardBetWithWager[] = [];
        switch (activeTab) {
            case "active":
                bets = [...stats.activeBetsList, ...stats.pendingResultsList];
                break;
            case "available":
                bets = stats.availableBetsList;
                break;
            case "history":
                bets = [...stats.wonBetsList, ...stats.lostBetsList, ...stats.refundedBetsList];
                break;
        }
        bets = filterByLeague(bets);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            bets = bets.filter(b => b.question.toLowerCase().includes(q));
        }
        return bets;
    };

    if (loading || dataLoading) {
        return <LoadingOverlay message="Loading your bets..." />;
    }

    if (!user) return null;

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b-2 border-black">
                <div className="flex items-center justify-between p-4">
                    <div>
                        <h1 className="font-black text-lg">Dashboard</h1>
                        <p className="text-xs text-gray-500">{leagues.length} leagues</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/settings"
                            className="p-2 text-gray-500 hover:text-gray-700"
                        >
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-5">
                {/* Action Badges */}
                {stats && (
                    <CompactActionBadges
                        voteNeeded={stats.pendingResultsList.filter(b => b.status === "PROOFING").length}
                        proofing={stats.pendingResults}
                        toResolve={stats.toResolve}
                        onNavigate={(leagueId, betId) => router.push(`/leagues/${leagueId}?bet=${betId}`)}
                    />
                )}

                {/* Stats Pills */}
                <GlobalStatsPills
                    totalPoints={totalPoints}
                    wins={wins}
                    losses={losses}
                    activeBets={activeBets}
                    winRate={winRate}
                    streak={0}
                />

                {/* League Selector */}
                <LeaguePillsSelector
                    leagues={leagues}
                    selectedLeagueId={selectedLeagueId}
                    onSelect={setSelectedLeagueId}
                    onCreateNew={() => setIsCreateModalOpen(true)}
                />

                {/* Leagues Quick Access */}
                {leagues.length > 0 && !selectedLeagueId && (
                    <div className="space-y-2">
                        <h3 className="font-black text-sm text-gray-700">Your Leagues</h3>
                        <div className="grid gap-2">
                            {leagues.slice(0, 3).map(league => {
                                const colors = LEAGUE_COLOR_SCHEMES[league.colorScheme || 'purple'];
                                return (
                                    <Link
                                        key={league.id}
                                        href={`/leagues/${league.id}`}
                                        className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${colors.from} ${colors.to} border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all`}
                                    >
                                        <div className="flex-1 min-w-0 text-white">
                                            <p className="font-black text-sm truncate">{league.name}</p>
                                            <p className="text-xs opacity-80">
                                                {league.mode === "STANDARD" ? "🎮 Arcade" : "💰 Zero-Sum"}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/80" />
                                    </Link>
                                );
                            })}
                            {leagues.length > 3 && (
                                <button className="text-sm font-bold text-gray-500 py-2">
                                    View all {leagues.length} leagues
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Bet Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    {[
                        { key: "active", label: "Active", count: stats?.activeBets || 0 },
                        { key: "available", label: "Available", count: stats?.availableBets || 0 },
                        { key: "history", label: "History", count: (stats?.wonBets || 0) + (stats?.lostBets || 0) },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === tab.key
                                ? "bg-white text-black shadow border border-gray-200"
                                : "text-gray-500"
                                }`}
                        >
                            {tab.label} {tab.count > 0 && `(${tab.count})`}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search bets..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:border-black outline-none"
                    />
                </div>

                {/* Bet List */}
                <div className="space-y-2">
                    {getCurrentBets().length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p className="font-bold">
                                {activeTab === "active" ? "No active bets" :
                                    activeTab === "available" ? "No available bets" :
                                        "No bet history"}
                            </p>
                            <p className="text-sm">
                                {activeTab === "available" ? "Join a league to see bets" : "Check back later"}
                            </p>
                        </div>
                    ) : (
                        getCurrentBets().map(bet => (
                            <CompactBetRow key={bet.id} bet={bet} />
                        ))
                    )}
                </div>
            </main>

            {/* FAB */}
            <QuickActionsFab onCreateLeague={() => setIsCreateModalOpen(true)} />

            {/* Create League Modal */}
            <CreateLeagueModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
