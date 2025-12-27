"use client";

/**
 * LEAGUE PAGE V2 - COMPACT UI VERSION
 * 
 * A modernized league page with:
 * - Compact collapsible bet cards
 * - Horizontal scrolling stats
 * - Collapsible leaderboard podium
 * - Floating action button
 * 
 * Uses all the same production data and services as v1.
 */

import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { League, LeagueMember, LEAGUE_COLOR_SCHEMES, LeagueColorScheme } from "@/lib/services/league-service";
import { Bet, Wager, BetStatus } from "@/lib/services/bet-service";
import { BetCardV2 } from "@/components/v2/bet-card-v2";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLiveLeaderboard } from "@/hooks/use-live-leaderboard";
import {
    ArrowLeft, Crown, User as UserIcon, Settings, Plus, Flag,
    Coins, Trophy, Megaphone, MessageSquare, Activity, Target,
    TrendingUp, ChevronDown, ChevronUp, QrCode, Flame, Zap,
    Users, Search
} from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { TeamLogo } from "@/components/team-logo";
import { LeagueChat } from "@/components/league-chat";
import { CreateBetModal } from "@/components/create-bet-modal";
import { LeagueSettingsModal } from "@/components/league-settings-modal";
import { LeagueAnnouncementModal } from "@/components/league-announcement-modal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDocs } from "firebase/firestore";
import { ActivityTabContent } from "@/components/activity-tab-content";
import { LiveStatusCard } from "@/components/v2/live-status-card";
import { GroupedBetsByTime, BetTimeSection } from "@/components/grouped-bets";

// ============================================
// PILL STATS BAR COMPONENT
// ============================================
function PillStatsBar({
    points,
    activeWagered,
    winRate,
    wins,
    losses,
    streak,
    activeBets,
    mode
}: {
    points: number;
    activeWagered: number;
    winRate: number;
    wins: number;
    losses: number;
    streak: number;
    activeBets: number;
    mode: "ZERO_SUM" | "STANDARD";
}) {
    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 py-2">
                {/* Points */}
                <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-yellow-400">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="font-black text-sm text-black">{points.toLocaleString()}</span>
                </div>

                {/* Active Wagered (Zero-Sum only) */}
                {mode === "ZERO_SUM" && activeWagered > 0 && (
                    <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-blue-400">
                        <Coins className="w-3.5 h-3.5" />
                        <span className="font-black text-sm text-black">{activeWagered.toLocaleString()}</span>
                    </div>
                )}

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

                {/* Streak */}
                {streak !== 0 && (
                    <div className={`shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] ${streak > 0 ? 'bg-orange-400' : 'bg-blue-300'}`}>
                        {streak > 0 ? <Flame className="w-3.5 h-3.5" /> : <span>❄️</span>}
                        <span className="font-black text-sm text-black">{Math.abs(streak)}</span>
                    </div>
                )}

                {/* Active Bets */}
                {activeBets > 0 && (
                    <div className="shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] bg-purple-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span className="font-black text-sm text-black">{activeBets}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// COLLAPSIBLE PODIUM LEADERBOARD
// ============================================
function PodiumLeaderboard({
    members,
    hasLiveBets,
    currentUserId,
    colorScheme
}: {
    members: (LeagueMember & { livePoints?: number; positionChange?: number })[];
    hasLiveBets: boolean;
    currentUserId?: string;
    colorScheme: string;
}) {
    const [showAll, setShowAll] = useState(false);
    const top3 = members.slice(0, 3);
    const colors = LEAGUE_COLOR_SCHEMES[(colorScheme || 'purple') as LeagueColorScheme];

    const renderPodiumMember = (member: (LeagueMember & { livePoints?: number; positionChange?: number }), rank: number) => {
        if (!member) return null;

        const isMe = member.uid === currentUserId;
        const displayPoints = member.livePoints ?? member.points;
        const change = member.positionChange || 0;

        // Styles based on rank
        let containerClass = "flex flex-col items-center relative";
        let avatarSize = "w-12 h-12";
        let ringColor = isMe ? "border-yellow-400 ring-2 ring-yellow-200" : "border-black";
        let cardBg = "bg-zinc-300";
        let crown = null;
        let animationDelay = 0.1;

        if (rank === 0) { // 1st Place
            avatarSize = "w-14 h-14";
            cardBg = "bg-yellow-400";
            ringColor = isMe ? "border-blue-500 ring-2 ring-blue-200" : "border-black";
            crown = <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-yellow-400 fill-yellow-300 drop-shadow-md" />;
            animationDelay = 0;
        } else if (rank === 2) { // 3rd Place
            cardBg = "bg-orange-400";
            animationDelay = 0.2;
        }

        return (
            <motion.div
                className={containerClass}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: animationDelay }}
            >
                {crown}
                <div className={`${avatarSize} rounded-full ${cardBg} border-2 ${ringColor} shadow-lg overflow-hidden flex items-center justify-center relative`}>
                    {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-6 h-6 text-black/20" />
                    )}
                </div>

                <div className={`${cardBg} rounded-t-lg mt-1 px-2 py-2 min-w-[80px] border-2 border-b-0 border-black text-center flex flex-col items-center justify-center`}>
                    <span className="font-black text-[10px] block truncate max-w-[70px] leading-tight">{member.displayName}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs font-bold">{displayPoints.toLocaleString()}</span>
                        {hasLiveBets && change !== 0 && (
                            <span className={`text-[10px] font-black flex items-center ${change > 0 ? "text-green-700" : "text-red-700"}`}>
                                {change > 0 ? "▲" : "▼"}{Math.abs(change)}
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className={`bg-gradient-to-br ${colors.from} ${colors.to} rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,1)] p-4`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-300" />
                    <h3 className="text-white font-black uppercase tracking-wider text-sm">Standings</h3>
                    {hasLiveBets && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-white text-[10px] font-bold animate-pulse">
                            LIVE
                        </span>
                    )}
                </div>
            </div>

            {/* Podium - Always Visible */}
            <div className="flex items-end justify-center gap-2 mb-2">
                {renderPodiumMember(top3[1], 1)}
                {renderPodiumMember(top3[0], 0)}
                {renderPodiumMember(top3[2], 2)}
            </div>

            {/* Expand Arrow - Visible only if there are more than 3 members */}
            {members.length > 3 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full flex items-center justify-center py-2 mt-1 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all group"
                >
                    <span className="text-xs font-bold mr-1 group-hover:underline">
                        {showAll ? "Less" : `+${members.length - 3} more`}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`} />
                </button>
            )}

            {/* Rest of list (expandable) */}
            <AnimatePresence>
                {showAll && members.length > 3 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 bg-white/10 rounded-xl overflow-hidden backdrop-blur-sm border border-white/10"
                    >
                        {members.slice(3).map((member, i) => {
                            const displayPoints = member.livePoints ?? member.points;
                            const change = member.positionChange || 0;
                            return (
                                <div
                                    key={member.uid || i}
                                    className={`flex items-center gap-3 p-2.5 border-b border-white/10 last:border-b-0 ${member.uid === currentUserId ? "bg-white/10" : ""}`}
                                >
                                    <span className="font-bold text-white/60 text-sm w-6 text-center">{i + 4}</span>
                                    <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                                        {member.photoURL ? (
                                            <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-4 h-4 text-white/50" />
                                        )}
                                    </div>
                                    <span className="font-bold text-white flex-1 truncate text-sm">{member.displayName}</span>

                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-white text-sm">{displayPoints.toLocaleString()}</span>
                                        {hasLiveBets && change !== 0 && (
                                            <span className={`text-[10px] font-bold ${change > 0 ? "text-green-400" : "text-red-400"}`}>
                                                {change > 0 ? "▲" : "▼"} {Math.abs(change)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// FLOATING ACTION BUTTON
// ============================================
function FloatingActionButton({ onCreateBet, onAnnounce, isOwner }: { onCreateBet: () => void; onAnnounce?: () => void; isOwner: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOwner) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-16 right-0 flex flex-col gap-3"
                    >
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => { onCreateBet(); setIsOpen(false); }}
                            className="bg-green-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg hover:scale-105 transition-transform text-sm font-bold border-2 border-black"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Bet</span>
                        </motion.button>
                        {onAnnounce && (
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 }}
                                onClick={() => { onAnnounce(); setIsOpen(false); }}
                                className="bg-orange-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg hover:scale-105 transition-transform text-sm font-bold border-2 border-black"
                            >
                                <Megaphone className="w-4 h-4" />
                                <span>Announce</span>
                            </motion.button>
                        )}
                    </motion.div>
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
// BET FILTER TABS
// ============================================
function BetFilterTabs({
    selected,
    onChange,
    counts
}: {
    selected: string;
    onChange: (tab: string) => void;
    counts: { all: number; open: number; active: number; resolved: number };
}) {
    const tabs = [
        { key: "all", label: "All", count: counts.all },
        { key: "open", label: "Open", count: counts.open },
        { key: "active", label: "My Bets", count: counts.active },
        { key: "resolved", label: "History", count: counts.resolved },
    ];

    return (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 py-1">
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-full font-bold text-xs border-2 transition-all ${selected === tab.key
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-[2px_2px_0_rgba(16,185,129,0.3)]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                        }`}
                >
                    {tab.label} {tab.count > 0 && <span className="ml-1 text-[10px] opacity-75">({tab.count})</span>}
                </button>
            ))}
        </div>
    );
}

// ============================================
// MAIN V2 LEAGUE PAGE COMPONENT
// ============================================
export function LeaguePageV2() {
    const t = useTranslations('League');
    const tBets = useTranslations('Bets');
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const leagueId = params.leagueId as string;

    // State
    const [league, setLeague] = useState<League | null>(null);
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [bets, setBets] = useState<Bet[]>([]);
    const [myWagers, setMyWagers] = useState<Record<string, Wager>>({});
    const [allMembersActiveWagers, setAllMembersActiveWagers] = useState<Record<string, number>>({});
    const [allBetWagers, setAllBetWagers] = useState<Record<string, Wager[]>>({});  // All wagers per bet
    const [dataLoading, setDataLoading] = useState(true);

    // UI State
    const [viewMode, setViewMode] = useState<"bets" | "analytics" | "activity" | "chat">("bets");
    const [betFilter, setBetFilter] = useState("all");
    const [isBetModalOpen, setIsBetModalOpen] = useState(false);
    const [betToEdit, setBetToEdit] = useState<Bet | undefined>();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [isQROpen, setIsQROpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Analytics State
    const [analyticsMetric, setAnalyticsMetric] = useState<"profit" | "roi" | "rank">("profit");
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Live leaderboard
    const { members: liveMembers, hasLiveBets } = useLiveLeaderboard(leagueId, members, allMembersActiveWagers);

    // Auth check
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Data listeners
    useEffect(() => {
        if (!user || !leagueId) return;
        setDataLoading(true);

        // League listener
        const unsubLeague = onSnapshot(doc(db, "leagues", leagueId), (snap) => {
            if (snap.exists()) {
                setLeague({ id: snap.id, ...snap.data() } as League);
            } else {
                router.push("/dashboard");
            }
        });

        // Members listener
        const unsubMembers = onSnapshot(collection(db, "leagues", leagueId, "members"), (snap) => {
            const list = snap.docs.map(d => d.data() as LeagueMember);
            list.sort((a, b) => (b.points || 0) - (a.points || 0));
            setMembers(list);
        });

        // Bets listener
        const unsubBets = onSnapshot(collection(db, "leagues", leagueId, "bets"), (snap) => {
            const betList = snap.docs.map(d => ({ id: d.id, leagueId, ...d.data() } as Bet));
            betList.sort((a, b) => {
                // Priority: LOCKED/PROOFING/DISPUTED -> OPEN -> RESOLVED/INVALID -> DRAFT -> CANCELLED
                const order: Record<BetStatus, number> = { LOCKED: 0, PROOFING: 1, DISPUTED: 1, OPEN: 2, RESOLVED: 3, INVALID: 4, DRAFT: 5, CANCELLED: 6 };
                const statusDiff = (order[a.status] ?? 99) - (order[b.status] ?? 99);
                if (statusDiff !== 0) return statusDiff;
                const aTime = a.closesAt?.seconds || 0;
                const bTime = b.closesAt?.seconds || 0;
                return aTime - bTime;
            });
            setBets(betList);
            setDataLoading(false);
        });

        return () => {
            unsubLeague();
            unsubMembers();
            unsubBets();
        };
    }, [user, leagueId, router]);

    // Fetch user's wagers and all wagers per bet
    useEffect(() => {
        if (!user || bets.length === 0) return;

        const fetchWagers = async () => {
            const wagersMap: Record<string, Wager> = {};
            const memberWagers: Record<string, number> = {};
            const betWagersMap: Record<string, Wager[]> = {};

            for (const bet of bets) {
                const wagersSnap = await import("firebase/firestore").then(({ getDocs, collection }) =>
                    getDocs(collection(db, "leagues", leagueId, "bets", bet.id, "wagers"))
                );

                const wagers: Wager[] = [];
                wagersSnap.docs.forEach(doc => {
                    const wager = { id: doc.id, ...doc.data() } as Wager;
                    wagers.push(wager);

                    if (doc.id === user.uid) {
                        wagersMap[bet.id] = wager;
                    }
                    // Track all members' wagers for live leaderboard (only for non-resolved)
                    if (bet.status !== "RESOLVED" && bet.status !== "INVALID") {
                        memberWagers[doc.id] = (memberWagers[doc.id] || 0) + (wager.amount || 0);
                    }
                });

                betWagersMap[bet.id] = wagers;
            }

            setMyWagers(wagersMap);
            setAllMembersActiveWagers(memberWagers);
            setAllBetWagers(betWagersMap);
        };

        fetchWagers();
    }, [user, bets, leagueId]);

    // Analytics data fetching
    useEffect(() => {
        if (viewMode === "analytics" && leagueId && bets.length > 0 && members.length > 0) {
            fetchAnalyticsData();
        }
    }, [viewMode, bets, members]);

    const fetchAnalyticsData = async () => {
        setAnalyticsLoading(true);
        const resolvedBets = bets.filter(b => b.status === "RESOLVED").sort((a, b) => (a.closesAt?.seconds || 0) - (b.closesAt?.seconds || 0));

        const cumulativeMap: Record<string, { profit: number, invested: number }> = {};
        members.forEach(m => cumulativeMap[m.uid] = { profit: 0, invested: 0 });

        const dataPoints: any[] = [];
        const startPoint: any = { date: 'Start' };
        members.forEach(m => {
            startPoint[`${m.uid}_profit`] = 0;
            startPoint[`${m.uid}_roi`] = 0;
            startPoint[`${m.uid}_rank`] = 1;
        });
        dataPoints.push(startPoint);

        for (const bet of resolvedBets) {
            const wagersCol = collection(db, "leagues", leagueId as string, "bets", bet.id, "wagers");
            const wagersSnap = await getDocs(wagersCol);

            wagersSnap.docs.forEach(doc => {
                const w = doc.data() as Wager;
                const uid = w.userId;
                if (!cumulativeMap[uid]) cumulativeMap[uid] = { profit: 0, invested: 0 };

                let change = 0;
                if (w.status === "WON") change = (w.payout || 0) - w.amount;
                else if (w.status === "LOST") change = -w.amount;

                cumulativeMap[uid].invested += w.amount;
                cumulativeMap[uid].profit += change;
            });

            const sortedByProfit = Object.entries(cumulativeMap).sort((a, b) => b[1].profit - a[1].profit);
            const dateLabel = bet.closesAt ? new Date(bet.closesAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Bet ${dataPoints.length}`;

            const dp: any = { date: dateLabel };
            sortedByProfit.forEach(([uid, val], idx) => {
                dp[`${uid}_profit`] = val.profit;
                dp[`${uid}_roi`] = val.invested > 0 ? Math.round((val.profit / val.invested) * 100) : 0;
                dp[`${uid}_rank`] = idx + 1;
            });
            dataPoints.push(dp);
        }

        setAnalyticsData(dataPoints);
        setAnalyticsLoading(false);
    };

    // Filter bets - MUST be before any early returns to maintain hook order
    const filteredBets = useMemo(() => {
        let filtered = bets.filter(b => b.status !== "DRAFT");

        // Apply filter
        if (betFilter === "open") {
            filtered = filtered.filter(b => b.status === "OPEN");
        } else if (betFilter === "active") {
            filtered = filtered.filter(b => myWagers[b.id]);
        } else if (betFilter === "resolved") {
            filtered = filtered.filter(b => b.status === "RESOLVED" || b.status === "INVALID");
        }

        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(b => b.question.toLowerCase().includes(q));
        }

        return filtered;
    }, [bets, betFilter, myWagers, searchQuery]);

    // Filter counts - MUST be before any early returns
    const filterCounts = useMemo(() => ({
        all: bets.filter(b => b.status !== "DRAFT").length,
        open: bets.filter(b => b.status === "OPEN").length,
        active: Object.keys(myWagers).length,
        resolved: bets.filter(b => b.status === "RESOLVED" || b.status === "INVALID").length
    }), [bets, myWagers]);

    // Loading state
    if (loading || dataLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!league || !user) return null;

    // Derived values (these are fine after early returns since they're not hooks)
    const isOwner = user.uid === league.ownerId;
    const myProfile = members.find(m => m.uid === user.uid);
    const myPoints = myProfile?.points || 0;
    const myActiveWagered = Object.values(myWagers).reduce((sum, w) => sum + (w.amount || 0), 0);

    // Calculate stats
    const recentResults = myProfile?.recentResults || [];
    const wins = recentResults.filter(r => r === 'W').length;
    const losses = recentResults.filter(r => r === 'L').length;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const streak = (() => {
        let count = 0;
        const type = recentResults[0];
        if (!type) return 0;
        for (const r of recentResults) {
            if (r === type) count++;
            else break;
        }
        return type === 'W' ? count : -count;
    })();
    const activeBetsCount = Object.keys(myWagers).length;

    const refreshData = () => {
        // Triggers re-fetch through listeners
    };

    return (
        <div className="min-h-screen pb-24">
            {/* Compact Header */}
            <header className="sticky top-0 z-40 bg-white border-b-2 border-black">
                <div className="flex items-center gap-3 p-3">
                    <Link href="/dashboard" className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-sm truncate">{league.name}</h1>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${league.mode === "ZERO_SUM" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-purple-50 text-purple-600 border-purple-200"
                                }`}>
                                {league.mode === "ZERO_SUM" ? "ZERO SUM" : "ARCADE"}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {members.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsQROpen(true)} className="p-1.5 text-gray-500 hover:text-purple-600">
                            <QrCode className="w-5 h-5" />
                        </button>
                        {isOwner && (
                            <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 text-gray-500 hover:text-gray-700">
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {/* Stats Pills */}
                <PillStatsBar
                    points={myPoints}
                    activeWagered={myActiveWagered}
                    winRate={winRate}
                    wins={wins}
                    losses={losses}
                    streak={streak}
                    activeBets={activeBetsCount}
                    mode={league.mode}
                />

                {/* Leaderboard Podium */}
                <PodiumLeaderboard
                    members={hasLiveBets ? liveMembers : members}
                    hasLiveBets={hasLiveBets}
                    currentUserId={user.uid}
                    colorScheme={league.colorScheme || "purple"}
                />

                {/* View Mode Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                        onClick={() => setViewMode("bets")}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === "bets"
                            ? "bg-white text-black shadow-[2px_2px_0_rgba(0,0,0,0.1)] border border-gray-200"
                            : "text-gray-500"
                            }`}
                    >
                        Bets
                    </button>
                    <button
                        onClick={() => setViewMode("analytics")}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1 ${viewMode === "analytics"
                            ? "bg-white text-black shadow-[2px_2px_0_rgba(0,0,0,0.1)] border border-gray-200"
                            : "text-gray-500"
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Stats
                    </button>
                    {/* Activity Tab - Only for Admins/Owners */}
                    {(isOwner || myProfile?.role === 'ADMIN') && (
                        <button
                            onClick={() => setViewMode("activity")}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1 ${viewMode === "activity"
                                ? "bg-white text-black shadow-[2px_2px_0_rgba(0,0,0,0.1)] border border-gray-200"
                                : "text-gray-500"
                                }`}
                        >
                            <Activity className="w-4 h-4" />
                            Log
                        </button>
                    )}
                    <button
                        onClick={() => setViewMode("chat")}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${viewMode === "chat"
                            ? "bg-white text-black shadow-[2px_2px_0_rgba(0,0,0,0.1)] border border-gray-200"
                            : "text-gray-500"
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                    </button>
                </div>

                {/* Content */}
                {viewMode === "chat" ? (
                    <LeagueChat leagueId={leagueId} currentUser={user} members={members} />
                ) : viewMode === "activity" ? (
                    <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] p-4">
                        <ActivityTabContent
                            leagueId={leagueId}
                            isAdmin={isOwner || myProfile?.role === 'ADMIN'}
                        />
                    </div>
                ) : viewMode === "analytics" ? (
                    <div className="space-y-4">
                        {/* Metric Selector */}
                        <div className="flex bg-gray-100 rounded-lg p-1 border border-black/10">
                            {(["profit", "roi", "rank"] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setAnalyticsMetric(m)}
                                    className={`flex-1 px-3 py-2 text-xs font-black uppercase rounded transition-all ${analyticsMetric === m
                                        ? "bg-white text-black shadow-sm border border-black/10"
                                        : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {m === "profit" ? "Profit" : m === "roi" ? "ROI" : "Rank"}
                                </button>
                            ))}
                        </div>

                        {/* Chart */}
                        <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] p-4">
                            <h3 className="text-lg font-black mb-3">Performance History</h3>
                            <div className="h-[300px] w-full">
                                {analyticsLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : analyticsData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analyticsData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                            <XAxis dataKey="date" stroke="#888" fontSize={10} tickMargin={8} />
                                            <YAxis
                                                stroke="#888"
                                                fontSize={10}
                                                reversed={analyticsMetric === "rank"}
                                                domain={analyticsMetric === "rank" ? [1, 'auto'] : ['auto', 'auto']}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                                            {members.map((member, idx) => {
                                                const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];
                                                const color = colors[idx % colors.length];
                                                return (
                                                    <Line
                                                        key={member.uid}
                                                        type="monotone"
                                                        dataKey={`${member.uid}_${analyticsMetric}`}
                                                        stroke={color}
                                                        strokeWidth={2}
                                                        dot={{ fill: color, r: 2, strokeWidth: 1, stroke: '#fff' }}
                                                        name={member.displayName || "Player"}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        No resolved bets yet for analytics
                                    </div>
                                )}
                            </div>
                            <p className="text-center text-xs text-gray-400 font-bold mt-2">
                                {analyticsMetric === "profit" && "Cumulative Net Profit (Points)"}
                                {analyticsMetric === "roi" && "Return on Investment (%)"}
                                {analyticsMetric === "rank" && "League Ranking (1 = Top)"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
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

                        {/* Filter Tabs */}
                        <BetFilterTabs
                            selected={betFilter}
                            onChange={setBetFilter}
                            counts={filterCounts}
                        />

                        {/* Live Status Card - Shows when there are live bets */}
                        <LiveStatusCard
                            bets={bets}
                            userWagers={new Map(Object.entries(myWagers))}
                            members={members}
                            currentUserId={user.uid}
                            leagueSettings={league.matchSettings}
                        />

                        {/* Bet List - Grouped by Status and Time */}
                        <div className="space-y-6">
                            {filteredBets.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="font-bold">No bets found</p>
                                    <p className="text-sm">Try a different filter or search</p>
                                </div>
                            ) : (
                                <>
                                    {/* Helper to render a bet card with all wagers */}
                                    {(() => {
                                        const renderBetCard = (bet: Bet) => (
                                            <BetCardV2
                                                key={bet.id}
                                                bet={bet}
                                                userPoints={myPoints}
                                                userWager={myWagers[bet.id]}
                                                allWagers={allBetWagers[bet.id] || []}
                                                mode={league.mode}
                                                powerUps={myProfile?.powerUps || league.arcadePowerUpSettings}
                                                onWagerSuccess={refreshData}
                                                isOwnerOverride={isOwner}
                                                onEdit={(bet) => {
                                                    setBetToEdit(bet);
                                                    setIsBetModalOpen(true);
                                                }}
                                            />
                                        );

                                        const now = new Date();

                                        // Categorize bets
                                        const openBets = filteredBets.filter(b =>
                                            b.status === "OPEN" && (!b.closesAt || new Date(b.closesAt.seconds * 1000) > now)
                                        );
                                        const lockedBets = filteredBets.filter(b =>
                                            b.status === "LOCKED" ||
                                            (b.status === "OPEN" && b.closesAt && new Date(b.closesAt.seconds * 1000) <= now)
                                        );
                                        const proofingBets = filteredBets.filter(b =>
                                            b.status === "PROOFING" || b.status === "DISPUTED"
                                        );
                                        const resolvedBets = filteredBets.filter(b =>
                                            b.status === "RESOLVED" || b.status === "INVALID"
                                        );

                                        return (
                                            <>
                                                {/* OPEN Bets - Grouped by Time */}
                                                {openBets.length > 0 && (
                                                    <GroupedBetsByTime
                                                        bets={openBets}
                                                        getClosingDate={(bet) => bet.closesAt ? new Date(bet.closesAt.seconds * 1000) : null}
                                                        renderBet={renderBetCard}
                                                    />
                                                )}

                                                {/* LOCKED Bets */}
                                                {lockedBets.length > 0 && (
                                                    <BetTimeSection
                                                        title="🔒 Locked (In Progress)"
                                                        bets={lockedBets}
                                                        defaultExpanded={true}
                                                        renderBet={renderBetCard}
                                                    />
                                                )}

                                                {/* PROOFING Bets */}
                                                {proofingBets.length > 0 && (
                                                    <BetTimeSection
                                                        title="⏳ Proofing"
                                                        bets={proofingBets}
                                                        defaultExpanded={true}
                                                        renderBet={renderBetCard}
                                                    />
                                                )}

                                                {/* RESOLVED Bets */}
                                                {resolvedBets.length > 0 && (
                                                    <BetTimeSection
                                                        title="✅ Resolved"
                                                        bets={resolvedBets}
                                                        defaultExpanded={false}
                                                        renderBet={renderBetCard}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* FAB */}
            <FloatingActionButton
                isOwner={isOwner}
                onCreateBet={() => { setBetToEdit(undefined); setIsBetModalOpen(true); }}
                onAnnounce={() => setIsAnnouncementOpen(true)}
            />

            {/* Modals */}
            <CreateBetModal
                isOpen={isBetModalOpen}
                onClose={() => { setIsBetModalOpen(false); setBetToEdit(undefined); }}
                leagueId={leagueId}
                leagueMode={league.mode}
                betToEdit={betToEdit}
            />

            <LeagueSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                league={league}
                onUpdate={() => { }}
            />
            <LeagueAnnouncementModal
                isOpen={isAnnouncementOpen}
                onClose={() => setIsAnnouncementOpen(false)}
                leagueId={leagueId}
                leagueName={league.name}
                user={user}
            />

            {/* QR Modal */}
            <AnimatePresence>
                {isQROpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsQROpen(false)}
                            className="fixed inset-0 bg-black/50 z-50"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 max-w-sm mx-auto border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,1)]"
                        >
                            <h3 className="font-black text-lg text-center mb-4">Invite Players</h3>
                            <div className="bg-white p-4 rounded-xl border-2 border-gray-200 flex justify-center">
                                <QRCode
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${leagueId}`}
                                    size={180}
                                />
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-3">Scan to join {league.name}</p>
                            <button
                                onClick={() => setIsQROpen(false)}
                                className="w-full mt-4 py-2 bg-black text-white rounded-xl font-bold"
                            >
                                Close
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
