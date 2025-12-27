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
import { Plus, ChevronRight, Settings, Award, Search, List, GalleryHorizontal } from "lucide-react";
import { BetCarousel } from "./bet-carousel";
import { BetCardV2 } from "@/components/v2/bet-card-v2";
import { getUserLeagues, League, LEAGUE_COLOR_SCHEMES } from "@/lib/services/league-service";
import { getUserDashboardStats, DashboardStats, DashboardBetWithWager } from "@/lib/services/bet-service";
import { CreateLeagueModal } from "@/components/create-league-modal";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { LoadingOverlay } from "@/components/loading-overlay";
import { StatsGauges, ActivityFeed, ActivityItem } from "@/components/dashboard";
import { LeagueCard } from "@/components/dashboard/league-card";
import { LiveBetsSection } from "@/components/live-bets-section";
import { subDays } from "date-fns";

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
            <div className="flex gap-2 pb-1">
                {/* All button */}
                <button
                    onClick={() => onSelect(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all ${selectedLeagueId === null
                        ? "bg-white text-black border-black shadow-[2px_2px_0_rgba(0,0,0,1)]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-black"
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
                            className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all flex items-center gap-1.5 ${isSelected
                                ? `bg-gradient-to-r ${colors.from} ${colors.to} text-white border-black shadow-[2px_2px_0_rgba(0,0,0,1)]`
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-black"
                                }`}
                        >
                            {league.name}
                            {league.mode === "STANDARD" && <Award className="w-3 h-3" />}
                        </button>
                    );
                })}
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
// BET FILTER SECTION
// ============================================
function BetFilterSection({
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    stats,
    layout,
    setLayout
}: {
    activeTab: "active" | "available" | "history";
    setActiveTab: (t: "active" | "available" | "history") => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    stats: DashboardStats | null;
    layout: "list" | "carousel";
    setLayout: (l: "list" | "carousel") => void;
}) {
    const tabs = [
        { key: "active", label: "Active", count: stats?.activeBets || 0, icon: "⚡" },
        { key: "available", label: "Open", count: stats?.availableBets || 0, icon: "🎮" },
        { key: "history", label: "History", count: (stats?.wonBets || 0) + (stats?.lostBets || 0), icon: "📜" },
    ] as const;

    return (
        <div className="space-y-2">
            {/* Search Bar - More concise */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Find a bet..."
                    className="w-full py-2.5 pl-9 pr-4 bg-white border-2 border-black rounded-xl text-sm font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] focus:shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:-translate-y-0.5 transition-all outline-none"
                />
            </div>

            <div className="flex gap-2">
                {/* Concise Tabs */}
                <div className="flex-1 flex gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-black/5">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${isActive
                                    ? "bg-white text-black shadow-sm border border-black/10"
                                    : "text-gray-500 hover:text-black hover:bg-white/50"
                                    }`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span>{tab.label}</span>
                                {/* Simple Count */}
                                {tab.count > 0 && (
                                    <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-black text-white" : "bg-gray-200 text-gray-600"
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Layout Toggle */}
                <div className="flex items-center bg-gray-100 p-1.5 rounded-xl border border-black/5">
                    <button
                        onClick={() => setLayout("list")}
                        className={`p-2 rounded-lg transition-all ${layout === 'list'
                            ? "bg-white text-black shadow-sm border border-black/10"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                        title="List View"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setLayout("carousel")}
                        className={`p-2 rounded-lg transition-all ${layout === 'carousel'
                            ? "bg-white text-black shadow-sm border border-black/10"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                        title="Carousel View"
                    >
                        <GalleryHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </div>
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
    const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

    // UI state
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"active" | "available" | "history">("active");
    const [layout, setLayout] = useState<"list" | "carousel">("list");
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

    // Fetch stats and generate activity
    useEffect(() => {
        async function fetchStats() {
            if (user && leagues.length > 0) {
                const s = await getUserDashboardStats(user, leagues);
                setStats(s);

                // Helper to get league color (hex value from colorScheme)
                const getLeagueColor = (leagueId: string) => {
                    const league = leagues.find(l => l.id === leagueId);
                    const scheme = league?.colorScheme || 'purple';
                    // Map color scheme to a solid hex color
                    const colorMap: Record<string, string> = {
                        purple: '#8b5cf6',
                        blue: '#3b82f6',
                        green: '#22c55e',
                        orange: '#f97316',
                        gold: '#eab308',
                        dark: '#374151',
                        sunset: '#ec4899',
                        ocean: '#14b8a6'
                    };
                    return colorMap[scheme] || '#6b7280';
                };

                // Generate activity items
                const items: ActivityItem[] = [];

                // Add won bets
                s.wonBetsList.slice(0, 3).forEach((bet, idx) => {
                    items.push({
                        id: `won-${bet.id}`,
                        type: "won",
                        title: `Won: ${bet.question}`,
                        points: bet.wager?.payout || 0,
                        timestamp: subDays(new Date(), idx),
                        leagueId: bet.leagueId,
                        leagueName: bet.leagueName,
                        leagueColor: getLeagueColor(bet.leagueId),
                        betId: bet.id
                    });
                });

                // Add lost bets
                s.lostBetsList.slice(0, 2).forEach((bet, idx) => {
                    items.push({
                        id: `lost-${bet.id}`,
                        type: "lost",
                        title: `Lost: ${bet.question}`,
                        points: -(bet.wager?.amount || 0),
                        timestamp: subDays(new Date(), idx + 1),
                        leagueId: bet.leagueId,
                        leagueName: bet.leagueName,
                        leagueColor: getLeagueColor(bet.leagueId),
                        betId: bet.id
                    });
                });

                // Add refunded bets
                s.refundedBetsList.slice(0, 2).forEach((bet, idx) => {
                    items.push({
                        id: `refund-${bet.id}`,
                        type: "resolved",
                        title: `Refunded: ${bet.question}`,
                        points: 0,
                        timestamp: bet.resolvedAt?.toDate() || new Date(),
                        leagueId: bet.leagueId,
                        leagueName: bet.leagueName,
                        leagueColor: getLeagueColor(bet.leagueId),
                        betId: bet.id
                    });
                });

                // Add pending proofing
                s.pendingResultsList.filter(b => b.status === "PROOFING").slice(0, 2).forEach((bet, idx) => {
                    items.push({
                        id: `proofing-${bet.id}`,
                        type: "vote_needed",
                        title: `Vote needed: ${bet.question}`,
                        timestamp: subDays(new Date(), idx),
                        leagueId: bet.leagueId,
                        leagueName: bet.leagueName,
                        leagueColor: getLeagueColor(bet.leagueId),
                        betId: bet.id
                    });
                });

                items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setActivityItems(items);
                setDataLoading(false);
            }
        }
        fetchStats();
    }, [user, leagues]);

    // Filter bets by league
    const filterByLeague = (bets: DashboardBetWithWager[]) => {
        if (!selectedLeagueId) return bets;
        return bets.filter(b => b.leagueId === selectedLeagueId);
    };

    // Compute filtered stats based on selected league
    const filteredStats = useMemo(() => {
        if (!stats) return null;

        const activeBetsList = filterByLeague([...stats.activeBetsList, ...stats.pendingResultsList]);
        const availableBetsList = filterByLeague(stats.availableBetsList);
        const wonBetsList = filterByLeague(stats.wonBetsList);
        const lostBetsList = filterByLeague(stats.lostBetsList);
        const refundedBetsList = filterByLeague(stats.refundedBetsList);

        return {
            ...stats,
            activeBets: activeBetsList.length,
            availableBets: availableBetsList.length,
            wonBets: wonBetsList.length,
            lostBets: lostBetsList.length,
        };
    }, [stats, selectedLeagueId]);

    // Derived stats
    const totalPoints = useMemo(() => {
        return leagues.reduce((sum, l) => sum, 0); // Placeholder
    }, [leagues]);

    const wins = filteredStats?.wonBets || 0;
    const losses = filteredStats?.lostBets || 0;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const activeBets = filteredStats?.activeBets || 0;
    const pointsGained = filterByLeague(stats?.wonBetsList || []).reduce((sum, b) => sum + (b.wager?.payout || 0) - (b.wager?.amount || 0), 0);

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
        // Deduplicate
        return Array.from(new Map(bets.map(b => [b.id, b])).values());
    };

    if (loading || dataLoading) {
        return <LoadingOverlay message="Loading your bets..." />;
    }

    if (!user) return null;

    // Fix for duplicate badges: Calculate proofing count excluding items in toResolve list
    const voteNeededCount = stats?.pendingResultsList.filter(b => b.status === "PROOFING").length || 0;
    const toResolveListIds = new Set(stats?.toResolveList.map(b => b.id) || []);
    const proofingCount = (stats?.pendingResultsList.filter(b => !toResolveListIds.has(b.id)).length) || 0;

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
                        voteNeeded={voteNeededCount}
                        proofing={proofingCount}
                        toResolve={stats.toResolve}
                        onNavigate={(leagueId, betId) => router.push(`/leagues/${leagueId}?bet=${betId}`)}
                    />
                )}



                {/* 🔴 Live Bets Section */}
                <LiveBetsSection userId={user.uid} />

                {/* Stats Gauges (Bigger Indicators) */}
                <StatsGauges
                    winRate={winRate}
                    activeBets={activeBets}
                    maxActiveBets={Math.max(activeBets, 10)}
                    pointsTrend={pointsGained > 0 ? Math.min(Math.round((pointsGained / 100) * 10), 100) : Math.max(Math.round((pointsGained / 100) * 10), -100)}
                    winStreak={Math.min(wins, 5)}
                />

                {/* Your Leagues Carousel */}
                <div>
                    <h2 className="text-lg font-black uppercase mb-3 px-1">Your Leagues</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                        {leagues.map((league, idx) => (
                            <div key={league.id} className="min-w-[280px] snap-center">
                                <LeagueCard
                                    league={league}
                                    rank={idx + 1}
                                    points={500} // Placeholder until points are fetched per league
                                    activeBets={stats?.activeBetsList.filter(b => b.leagueId === league.id).length}
                                    pendingBets={stats?.pendingResultsList.filter(b => b.leagueId === league.id).length}
                                    winRate={winRate}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="pt-2">
                    <ActivityFeed items={activityItems} maxItems={5} />
                </div>

                {/* Filter Group */}
                <div className="space-y-1">
                    <LeaguePillsSelector
                        leagues={leagues}
                        selectedLeagueId={selectedLeagueId}
                        onSelect={setSelectedLeagueId}
                        onCreateNew={() => setIsCreateModalOpen(true)}
                    />

                    <BetFilterSection
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        stats={filteredStats}
                        layout={layout}
                        setLayout={setLayout}
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
                    ) : layout === "carousel" ? (
                        <div className="py-2">
                            <BetCarousel
                                items={getCurrentBets()}
                                renderItem={(bet) => {
                                    const league = leagues.find(l => l.id === bet.leagueId);
                                    return (
                                        <BetCardV2
                                            key={bet.id}
                                            bet={bet}
                                            userPoints={0} // Placeholder as we don't track points in dashboard
                                            userWager={bet.wager as any}
                                            mode={league?.mode || "STANDARD"}
                                            onWagerSuccess={() => { }}
                                            initialExpanded={true}
                                        />
                                    );
                                }}
                            />
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
