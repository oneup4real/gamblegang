"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { League, LeagueMember, updateLeagueStatus, rebuy } from "@/lib/services/league-service";
import { getLeagueBets, Bet, Wager, deleteBet } from "@/lib/services/bet-service";
import { BetCard } from "@/components/bet-card";
import { BetStatusStepper } from "@/components/bet-status-stepper";
import { format } from "date-fns";
import { ArrowLeft, Crown, User as UserIcon, Settings, Play, Flag, Archive, Coins, AlertOctagon, CheckCircle2, XCircle, Trash2, Pencil, QrCode, Gamepad2, Gavel, TrendingUp, Target, Award, Activity, ExternalLink, ChevronDown, ChevronUp, Ticket as TicketIcon, Timer, Trophy } from "lucide-react";
import QRCode from "react-qr-code";
import { BetTicket } from "@/components/bet-ticket";
import Link from "next/link";
import { CreateBetModal } from "@/components/create-bet-modal";
import { LeagueSettingsModal } from "@/components/league-settings-modal";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from "next-intl";
import { hasPermission } from "@/lib/rbac";

export default function LeaguePage() {
    const tBets = useTranslations('Bets');
    const t = useTranslations('League');
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const leagueId = params.leagueId as string;
    const targetBetId = searchParams.get('bet'); // Bet to auto-expand and scroll to

    const [league, setLeague] = useState<League | null>(null);
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [bets, setBets] = useState<Bet[]>([]);
    const [myActiveWagers, setMyActiveWagers] = useState<Record<string, Wager>>({});
    const [dataLoading, setDataLoading] = useState(true);

    const [isBetModalOpen, setIsBetModalOpen] = useState(false);
    const [betToEdit, setBetToEdit] = useState<Bet | undefined>(undefined);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isQROpen, setIsQROpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set()); // Track which bets are expanded
    const [expandAll, setExpandAll] = useState(false); // Toggle all expand/collapse
    const [viewMode, setViewMode] = useState<"bets" | "analytics">("bets");
    const [analyticsMetric, setAnalyticsMetric] = useState<"profit" | "roi" | "rank">("profit");
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --------------------------------------------------------------------------
    // REAL-TIME DATA SYNC
    // --------------------------------------------------------------------------
    useEffect(() => {
        if (!user || !leagueId) {
            if (!loading && !user) { // If not loading and no user, redirect to login
                router.push("/login");
            }
            return;
        }

        setDataLoading(true); // Set dataLoading true at the start of the real-time sync

        // 1. Fetch Static/Less Frequent Data (League & Members)
        const initData = async () => {
            try {
                // Fetch League
                const leagueDoc = await getDoc(doc(db, "leagues", leagueId as string));
                if (leagueDoc.exists()) {
                    setLeague({ id: leagueDoc.id, ...leagueDoc.data() } as League);
                } else {
                    router.push("/dashboard"); // League not found
                    return;
                }

                // Fetch Members
                const membersRef = collection(db, "leagues", leagueId as string, "members");
                const membersSnap = await getDocs(membersRef);
                const membersList = membersSnap.docs.map(d => d.data() as LeagueMember);

                // --- INJECT TEST USERS FOR VISUALIZATION ---
                if (leagueId === "TgQl09NawgRNrKcPi5Bh") {
                    membersList.push(
                        { uid: "test1", leagueId: leagueId, role: "MEMBER", points: 2500, joinedAt: null, displayName: "Test Pro Player", photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", totalInvested: 100, totalBought: 1000 },
                        { uid: "test2", leagueId: leagueId, role: "MEMBER", points: 1250, joinedAt: null, displayName: "Luigi Gambler", photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luigi", totalInvested: 500, totalBought: 1000 },
                        { uid: "test3", leagueId: leagueId, role: "MEMBER", points: 0, joinedAt: null, displayName: "Bad Luck Brian", photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brian", totalInvested: 2000, totalBought: 1000 }
                    );
                }
                // -------------------------------------------

                setMembers(membersList.sort((a, b) => b.points - a.points)); // Sort by points desc

                // Fetch bets
            } catch (error) {
                console.error("Error loading league:", error);
            }
        };

        initData();

        // 2. Real-time Listener for BETS
        const betsRef = collection(db, "leagues", leagueId as string, "bets");
        const unsub = onSnapshot(betsRef, (snapshot) => {
            const betsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
            setBets(betsList);
            refreshMyWagers(betsList);
            setDataLoading(false);
        });

        return () => unsub();
    }, [user, loading, leagueId, router]);

    // Auto-expand and scroll to target bet when coming from dashboard
    useEffect(() => {
        if (targetBetId && bets.length > 0 && !dataLoading) {
            // Expand the target bet
            setExpandedBets(new Set([targetBetId]));

            // Scroll to the bet element after a short delay
            setTimeout(() => {
                const betElement = document.getElementById(`bet-${targetBetId}`);
                if (betElement) {
                    betElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a brief highlight effect
                    betElement.classList.add('ring-4', 'ring-purple-500', 'ring-opacity-75');
                    setTimeout(() => {
                        betElement.classList.remove('ring-4', 'ring-purple-500', 'ring-opacity-75');
                    }, 2000);
                }
            }, 300);
        }
    }, [targetBetId, bets, dataLoading]);

    const refreshMyWagers = async (currentBets: Bet[]) => {
        if (!user || !leagueId) return;

        // Fetch ALL wagers (Active + Resolved) to support Analytics/History
        // (Optimizable: Only fetch resolved once?)
        const wagersMap: Record<string, Wager> = {};

        await Promise.all(currentBets.map(async (bet) => {
            const wagerRef = doc(db, "leagues", leagueId as string, "bets", bet.id, "wagers", user.uid);
            const wagerSnap = await getDoc(wagerRef);
            if (wagerSnap.exists()) {
                wagersMap[bet.id] = { id: wagerSnap.id, ...wagerSnap.data() } as Wager;
            }
        }));
        setMyActiveWagers(wagersMap);
    };

    const fetchLeagueData = async () => {
        refreshMyWagers(bets);
        // Refresh members
        const membersRef = collection(db, "leagues", leagueId as string, "members");
        const snap = await getDocs(membersRef);
        setMembers(snap.docs.map(d => d.data() as LeagueMember));
    };

    const copyInviteLink = () => {
        // Basic invite system: Link to join page (TODO: Implement actual join page)
        const url = `${window.location.origin}/join/${leagueId}`;
        navigator.clipboard.writeText(url);
        alert("Invite link copied to clipboard!");
    };

    useEffect(() => {
        if (viewMode === "analytics" && leagueId && bets.length > 0) {
            fetchAnalyticsData();
        }
    }, [viewMode, leagueId, bets]);

    const fetchAnalyticsData = async () => {
        setAnalyticsLoading(true);
        const resolvedBets = bets.filter(b => b.status === "RESOLVED").sort((a, b) => (a.closesAt?.seconds || 0) - (b.closesAt?.seconds || 0));

        // Cumulative state map: userId -> { profit: number, invested: number }
        const cumulativeMap: Record<string, { profit: number, invested: number }> = {};
        // Initialize for known members
        members.forEach(m => cumulativeMap[m.uid] = { profit: 0, invested: 0 });

        const dataPoints: any[] = [];
        // Add start point
        const startPoint: any = { date: 'Start' };
        members.forEach(m => {
            startPoint[`${m.uid}_profit`] = 0;
            startPoint[`${m.uid}_roi`] = 0;
            startPoint[`${m.uid}_rank`] = 1; // Start tied at 1
        });
        dataPoints.push(startPoint);

        for (const bet of resolvedBets) {
            const wagersCol = collection(db, "leagues", leagueId as string, "bets", bet.id, "wagers");
            const wagersSnap = await getDocs(wagersCol);

            // Process updates 
            wagersSnap.docs.forEach(doc => {
                const w = doc.data() as Wager;
                const uid = w.userId;
                if (!cumulativeMap[uid]) cumulativeMap[uid] = { profit: 0, invested: 0 };

                let change = 0;
                if (w.status === "WON") {
                    // ROI Calculation: We use total payout (Gross Return) vs Total Invested
                    // If we want "Return" %: (Total Payout / Total Invested) * 100
                    // If we want "Profit" % (ROI): ((Total Payout - Total Invested) / Total Invested) * 100
                    // The user requested "calculated roi should no consider the point placed on bets as 'lost'"
                    // This implies they likely want Gross Return (Payout includes stake).
                    // Or they think "Profit" is subtracting stake when Payout is already Net?
                    // Let's assume Payout is Gross (includes stake).
                    // So Profit = Payout - Stake.

                    // If the user thinks counting stake as 'lost' is wrong, maybe they mean:
                    // Profit = Payout? (No, that's revenue).

                    // Let's try switching to Payout based logic if that's what they mean by "not lost".
                    change = (w.payout || 0) - w.amount;
                }
                else if (w.status === "LOST") change = -w.amount;

                cumulativeMap[uid].invested += w.amount;
                cumulativeMap[uid].profit += change;
            });

            // --- MOCK DATA ---
            if (members.some(m => m.uid.startsWith("test"))) {
                ["test1", "test2", "test3"].forEach(uid => {
                    if (!cumulativeMap[uid]) return;
                    const seed = bet.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + uid.charCodeAt(3);
                    const rand = seed % 100;
                    let won = false; let amount = 100; let profit = 0;
                    if (uid === "test1") won = rand < 70;
                    else if (uid === "test2") { won = rand < 45; amount = (seed % 500) + 100; }
                    else won = rand < 20;

                    if (won) {
                        const odds = (seed % 200) / 100 + 1.2;
                        profit = Math.floor(amount * odds) - amount;
                    } else { profit = -amount; }
                    cumulativeMap[uid].invested += amount;
                    cumulativeMap[uid].profit += profit;
                });
            }

            // Snapshot
            const snapshot: any = {
                date: new Date(bet.closesAt?.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            };

            // Calculate Rank based on Profit
            const sortedUids = Object.keys(cumulativeMap).sort((a, b) => cumulativeMap[b].profit - cumulativeMap[a].profit);

            Object.entries(cumulativeMap).forEach(([uid, stats]) => {
                snapshot[`${uid}_profit`] = stats.profit;
                snapshot[`${uid}_roi`] = stats.invested > 0 ? Number(((stats.profit / stats.invested) * 100).toFixed(1)) : 0;
                snapshot[`${uid}_rank`] = sortedUids.indexOf(uid) + 1;
            });

            dataPoints.push(snapshot);
        }

        setAnalyticsData(dataPoints);
        setAnalyticsLoading(false);
    };

    const handleStatusUpdate = async (newStatus: "STARTED" | "FINISHED" | "ARCHIVED") => {
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
        setActionLoading(true);
        try {
            await updateLeagueStatus(leagueId, newStatus);
            await fetchLeagueData();
        } catch (error) {
            console.error(error);
            alert("Failed to update status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRebuy = async () => {
        const amount = Number(prompt("Enter Buy-In/Rebuy Amount:", "1000"));
        if (!amount || amount <= 0) return;
        if (!user) return;

        setActionLoading(true);
        try {
            await rebuy(leagueId, user.uid, amount);
            await fetchLeagueData();
            alert("Funds added!");
        } catch (error) {
            console.error(error);
            alert("Rebuy failed");
        } finally {
            setActionLoading(false);
        }
    };

    const stats = useMemo(() => {
        let activeWagered = 0;
        let potentialWin = 0;

        Object.entries(myActiveWagers).forEach(([betId, wager]) => {
            const bet = bets.find(b => b.id === betId);
            // Only consider NON-RESOLVED bets for active stats
            // IMPORTANT: RESOLVED bets should NOT count toward active wagers
            if (bet && !["RESOLVED", "INVALID"].includes(bet.status)) {
                activeWagered += wager.amount;

                // Calculate potential win for CHOICE bets where we know the pool distribution
                if (bet.type === "CHOICE" && bet.options) {
                    const optIndex = Number(wager.selection);
                    const option = bet.options[optIndex];
                    if (option && option.totalWagered > 0) {
                        //Simple Tote calculation: (My Stake / Total Stake on Option) * Total Pool
                        // Subtract stake to get just the "Win" amount (profit)
                        const estimatedReturn = (wager.amount / option.totalWagered) * bet.totalPool;
                        potentialWin += (estimatedReturn - wager.amount);
                    }
                } else {
                    // For other bet types, without complex pool data, strictly user might want an estimate
                    // We'll conservatively assume 1:1 return (doubling money) for now so it's not 0
                    // Or we can leave it as 0 if we want to be strict. 
                    // Let's assume a standard 2.0x odds for estimation if unknown
                    potentialWin += wager.amount;
                }
            }
        });

        return {
            activeWagered: Math.floor(activeWagered),
            potentialWin: Math.floor(potentialWin)
        };
    }, [myActiveWagers, bets]);

    // Fetch all members' active wagers (public information in league)
    const [allMembersActiveWagers, setAllMembersActiveWagers] = useState<Record<string, number>>({});

    useEffect(() => {
        async function fetchAllActiveWagers() {
            if (league?.id) {
                const { getAllMembersActiveWagers } = await import("@/lib/services/league-service");
                const activeWagers = await getAllMembersActiveWagers(league.id);
                setAllMembersActiveWagers(activeWagers);
            }
        }
        fetchAllActiveWagers();
    }, [league?.id, bets]); // Re-fetch when bets change

    if (loading || dataLoading) {

        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!league) return null;



    // Derived state for view logic
    const isOwner = user?.uid === league?.ownerId;
    const myMemberProfile = members.find(m => m.uid === user?.uid);

    // Helper to render bet item
    const handleDeleteBet = async (betId: string) => {
        setActionLoading(true);
        try {
            await deleteBet(leagueId, betId);
            // If using real-time listeners, this might be redundant but harmless
            if (typeof fetchLeagueData === 'function') {
                await fetchLeagueData();
            }
        } catch (error) {
            console.error("Failed to delete bet:", error);
            alert(tBets('deleteError'));
        } finally {
            setActionLoading(false);
        }
    };

    const renderBetItem = (bet: Bet, userPoints: number, mode: League["mode"]) => {
        const isExpanded = expandedBets.has(bet.id);
        const wager = myActiveWagers[bet.id];

        let displayedOdds = "-";
        let displayedReturn = "-";
        let returnColor = "text-gray-400";

        if (wager) {
            if (bet.status === "RESOLVED") {
                // Show actual results for resolved bets
                if (wager.status === "WON") {
                    const profit = (wager.payout || 0) - wager.amount;
                    displayedReturn = `+${profit.toLocaleString()} ${tBets('pts')}`;
                    displayedOdds = wager.payout ? (wager.payout / wager.amount).toFixed(2) + "x" : "-";
                    returnColor = "text-green-600";
                } else if (wager.status === "LOST") {
                    displayedReturn = `-${wager.amount.toLocaleString()} ${tBets('pts')}`;
                    displayedOdds = "0.00x";
                    returnColor = "text-red-500";
                } else if (wager.status === "PUSH") {
                    displayedReturn = tBets('refunded');
                    displayedOdds = "1.00x";
                    returnColor = "text-yellow-600 font-black";
                }
            } else if (mode === "ZERO_SUM" && bet.type === "CHOICE" && bet.options) {
                // ZERO SUM: Parimutuel Odds
                const optIdx = Number(wager.selection);
                const opt = bet.options[optIdx];
                if (opt && opt.totalWagered > 0) {
                    const odds = bet.totalPool / opt.totalWagered;
                    displayedOdds = odds.toFixed(2) + "x";
                    const totalReturn = Math.floor(wager.amount * odds);
                    const profit = totalReturn - wager.amount;
                    displayedReturn = `+${profit.toLocaleString()} ${tBets('pts')}`;
                    returnColor = "text-green-600";
                } else {
                    // No bets on this option yet, show potential loss
                    displayedOdds = "---x";
                    displayedReturn = `-${wager.amount.toLocaleString()} ${tBets('pts')}`;
                    returnColor = "text-red-500";
                }

            } else {
                // ARCADE: Fixed points (No Wager Amount)
                displayedOdds = "-";
                // Fixed 1 point for winning in Arcade Mode
                displayedReturn = `1 ${tBets('pts')}`;
                returnColor = "text-green-600";
            }
        }

        return (
            <div key={bet.id} id={`bet-${bet.id}`} className="bg-white border-2 border-black rounded-xl overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <button
                    onClick={() => {
                        const newExpanded = new Set(expandedBets);
                        if (isExpanded) {
                            newExpanded.delete(bet.id);
                        } else {
                            newExpanded.add(bet.id);
                        }
                        setExpandedBets(newExpanded);
                    }}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-all"
                >
                    {/* Top Row: Stepper/Status spanning full width */}
                    <div className="mb-3">
                        {(bet.status !== "OPEN" || (bet.status === "OPEN" && bet.closesAt && bet.closesAt.toDate() < new Date())) && bet.status !== "DRAFT" && bet.status !== "INVALID" ? (
                            <div className="pointer-events-none w-full">
                                <BetStatusStepper bet={bet} isOwner={user?.uid === bet.creatorId} hideStatusCard={true} />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded border-2 border-black font-black ${bet.status === "OPEN" ? "bg-green-400" :
                                    "bg-gray-400"
                                    }`}>
                                    {tBets('status_' + bet.status)}
                                </span>
                                <span className="text-xs text-gray-600 font-bold">{bet.type}</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Question | Date/Timer | Odds/Return | Icons */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Question Text */}
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-black text-lg truncate">{bet.question}</p>

                            {/* Event Date & Betting Timer */}
                            {(bet.eventDate || bet.closesAt) && (
                                <div className="flex items-center gap-3 mt-1">
                                    {/* Event Date */}
                                    {bet.eventDate && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-gray-400">📅</span>
                                            <span className="text-[10px] font-bold text-gray-600">
                                                {new Date(bet.eventDate.toDate()).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    )}

                                    {/* Betting Timer */}
                                    {bet.closesAt && bet.status === "OPEN" && (() => {
                                        const now = new Date();
                                        const closesAt = bet.closesAt.toDate();
                                        const hoursLeft = Math.max(0, Math.floor((closesAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
                                        const minutesLeft = Math.max(0, Math.floor(((closesAt.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)));

                                        if (hoursLeft === 0 && minutesLeft === 0) return null;

                                        return (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-gray-400">⏰</span>
                                                <span className={`text-[10px] font-bold ${hoursLeft < 1 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {hoursLeft}h {minutesLeft}m left to bet
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Odds & Return */}
                        <div className="flex gap-6 text-sm shrink-0">
                            <div className="text-center">
                                <p className="text-gray-500 text-xs font-bold">{tBets('odds')}</p>
                                <p className="font-black text-black text-lg">{displayedOdds}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500 text-xs font-bold">Net Result</p>
                                <p className={`font-black text-lg ${returnColor}`}>{displayedReturn}</p>
                            </div>
                        </div>

                        {/* Action Icons */}
                        <div className="text-black text-xl font-bold flex items-center gap-2 shrink-0">
                            {isOwner && (
                                <div className="flex items-center gap-1">
                                    {(bet.wagerCount === 0 || !bet.wagerCount) && (
                                        <div
                                            role="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBetToEdit(bet);
                                                setIsBetModalOpen(true);
                                            }}
                                            className="p-1.5 hover:bg-blue-100 rounded-lg text-gray-300 hover:text-blue-500 transition-colors"
                                            title="Edit Bet (No Wagers Yet)"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Delete this bet? ALL existing wagers will be refunded to players.")) {
                                                handleDeleteBet(bet.id);
                                            }
                                        }}
                                        className="p-1.5 hover:bg-red-100 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                                        title="Delete Bet (Refunds Players)"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </div>
                                </div>
                            )}
                            {isExpanded ? "▲" : "▼"}
                        </div>
                    </div>
                </button>
                {isExpanded && (
                    <div className="border-t-2 border-black p-4 bg-gray-50">
                        <BetCard
                            bet={bet}
                            userPoints={userPoints}
                            mode={mode}
                            userWager={wager}
                            onWagerSuccess={fetchLeagueData}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen text-foreground pb-20">
            {/* Header with Admin Controls */}
            {/* Header with Admin Controls */}
            {/* Header with Admin Controls */}
            {/* Header with Admin Controls */}
            <header className="pt-6 pb-0">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-black">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black text-black drop-shadow-md flex items-center gap-2 font-comic uppercase tracking-wide">
                                {league.name}
                                <span className="text-xs font-bold bg-primary/10 px-2 py-0.5 rounded border-2 border-black text-primary">
                                    {league.mode === "ZERO_SUM" ? "ZERO SUM" : "ARCADE"}
                                </span>
                            </h1>
                            <p className="text-xs text-gray-600 font-bold tracking-widest uppercase mt-1">
                                {t('statusLabel')}: <span className="text-primary font-black">{league.status}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <>
                                {league.status === "NOT_STARTED" && (
                                    <button onClick={() => handleStatusUpdate("STARTED")} className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-green-500 hover:text-green-600" title={t('startLeague')}>
                                        <Play className="h-5 w-5" />
                                    </button>
                                )}
                                {league.status === "STARTED" && (
                                    <button onClick={() => handleStatusUpdate("FINISHED")} className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-red-500 hover:text-red-600" title={t('endLeague')}>
                                        <Flag className="h-5 w-5" />
                                    </button>
                                )}
                                {league.status === "FINISHED" && (
                                    <button onClick={() => handleStatusUpdate("ARCHIVED")} className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-zinc-500 hover:text-zinc-600" title={t('archiveLeague')}>
                                        <Archive className="h-5 w-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-black hover:bg-gray-50"
                                >
                                    <Settings className="h-5 w-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setIsQROpen(true)}
                            className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-purple-600 hover:bg-purple-50"
                            title={t('showQR')}
                        >
                            <QrCode className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* TABS: BETS vs ANALYTICS (Folder Tab Style) */}
                <div className="w-full border-b-4 border-black">
                    <div className="max-w-5xl mx-auto px-6 flex items-end gap-0"> {/* Gap 0 for tight folder look */}
                        <button
                            onClick={() => setViewMode("bets")}
                            className={`relative px-8 py-3 rounded-t-xl border-t-2 border-x-2 border-black font-black uppercase tracking-wider transition-all duration-200 ${viewMode === "bets"
                                ? "bg-pattern-pink -mb-[4px] pb-4 z-10 text-black shadow-none border-b-0" // Active: pink pattern
                                : "bg-gray-300 text-gray-500 hover:bg-gray-200 mb-0 z-0 inset-shadow-sm" // Inactive: darker, behind
                                }`}
                        >
                            {t('tabBets')}
                        </button>
                        <button
                            onClick={() => setViewMode("analytics")}
                            className={`relative px-8 py-3 rounded-t-xl border-t-2 border-x-2 border-black font-black uppercase tracking-wider transition-all duration-200 -ml-0.5 ${viewMode === "analytics"
                                ? "bg-pattern-pink -mb-[4px] pb-4 z-10 text-black shadow-none border-b-0"
                                : "bg-gray-300 text-gray-500 hover:bg-gray-200 mb-0 z-0"
                                }`}
                        >
                            {t('tabAnalytics')}
                        </button>
                    </div>
                </div>
            </header>

            {/* Register Content Background Wrapper */}
            <div className={`w-full min-h-screen ${viewMode === "bets" || viewMode === "analytics" ? "bg-pattern-pink" : ""}`}>
                <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                    {viewMode === "analytics" ? (
                        <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-black tracking-tight text-black font-comic uppercase">
                                    {t('perfHistory')}
                                </h3>
                                {/* Metric Selector */}
                                <div className="flex bg-gray-100 rounded-lg p-1 border border-black/10">
                                    {(["profit", "roi", "rank"] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setAnalyticsMetric(m)}
                                            className={`px-3 py-1 text-xs font-black uppercase rounded transition-all ${analyticsMetric === m ? "bg-white text-black shadow-sm border border-black/10" : "text-gray-400 hover:text-gray-600"}`}
                                        >
                                            {m === "profit" ? t('metricProfit') : m === "roi" ? t('metricROI') : t('metricRank')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-[400px] w-full">
                                {analyticsLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={analyticsData}
                                            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                            <XAxis dataKey="date" stroke="#888" fontSize={12} tickMargin={10} />
                                            <YAxis
                                                stroke="#888"
                                                fontSize={12}
                                                reversed={analyticsMetric === "rank"}
                                                domain={analyticsMetric === "rank" ? [1, 'auto'] : ['auto', 'auto']}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px', fontWeight: 'bold' }}
                                                itemStyle={{ padding: 0 }}
                                            />
                                            <Legend />
                                            {members.map((member, idx) => {
                                                // Generate consistent color
                                                const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];
                                                const color = colors[idx % colors.length];
                                                return (
                                                    <Line
                                                        key={member.uid}
                                                        type="monotone"
                                                        dataKey={`${member.uid}_${analyticsMetric}`}
                                                        stroke={color}
                                                        strokeWidth={3}
                                                        dot={{ fill: color, r: 3, strokeWidth: 1, stroke: '#fff' }}
                                                        name={member.displayName || "Player"}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <p className="text-center text-xs text-gray-400 font-bold mt-4">
                                {analyticsMetric === "profit" && t('metricProfitDesc')}
                                {analyticsMetric === "roi" && t('metricROIDesc')}
                                {analyticsMetric === "rank" && t('metricRankDesc')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats / Wallet Card (Zero Sum Only) */}
                            {league.mode === "ZERO_SUM" && myMemberProfile && (
                                <section>
                                    <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            {/* Balance */}
                                            <div>
                                                <p className="text-sm font-black uppercase text-white/80 tracking-widest">{t('myChips')}</p>
                                                <p className="text-5xl font-black text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] font-comic">
                                                    {/* Show total chips (wallet + active wagers from non-resolved bets only) */}
                                                    {(myMemberProfile.points + stats.activeWagered).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-white/90 font-bold mt-1">
                                                    {t('wallet')}: {myMemberProfile.points.toLocaleString()} | {t('active')}: {stats.activeWagered.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-white/70 font-bold mt-0.5">
                                                    {t('totalInvested')}: {(myMemberProfile.totalBought || (league.buyInType === "FIXED" ? league.startCapital : 0)).toLocaleString()} {t('chipsLower')}
                                                </p>
                                            </div>

                                            {/* Active Stats */}
                                            <div className="flex gap-8 bg-black/20 p-4 rounded-xl border-2 border-white/10 backdrop-blur-sm">
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-white/70 uppercase mb-1">{t('activeWagers')}</p>
                                                    <p className="text-xl font-black text-white">{stats.activeWagered.toLocaleString()}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-white/70 uppercase mb-1">{t('potentialWin')}</p>
                                                    <p className="text-xl font-black text-green-300">+{stats.potentialWin.toLocaleString()}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-white/70 uppercase mb-1">{t('potentialLoss')}</p>
                                                    <p className="text-xl font-black text-red-300">-{stats.activeWagered.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* Rebuy */}
                                            <button
                                                onClick={handleRebuy}
                                                disabled={actionLoading || league.buyInType === "FIXED"}
                                                title={league.buyInType === "FIXED" ? t('rebuyDisabledFixed') : t('rebuyTooltip')}
                                                className={`flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl text-lg font-black text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] ${league.buyInType === "FIXED" ? "bg-gray-300 cursor-not-allowed opacity-70" : "bg-yellow-400 hover:bg-yellow-500"}`}
                                            >
                                                <Coins className="h-5 w-5 text-black" />
                                                {t('rebuyButton')}
                                            </button>
                                        </div>

                                    </div>
                                </section>
                            )}

                            {/* 1. DRAFTS */}
                            {(() => {
                                const drafts = bets.filter(b => b.status === "DRAFT");
                                if (drafts.length === 0) return null;

                                return (
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center justify-between gap-2 mb-4 bg-gray-100 p-2 rounded-lg border-2 border-dashed border-gray-400 cursor-pointer select-none" onClick={() => toggleSection('drafts')}>
                                            <div className="flex items-center gap-2">
                                                <div className={`transition-transform duration-200 ${collapsedSections['drafts'] ? '-rotate-90' : ''}`}>
                                                    <ChevronDown className="h-5 w-5 text-gray-700" />
                                                </div>
                                                <span className="text-xl">📝</span>
                                                <h3 className="text-lg font-black text-gray-700 font-comic uppercase">{t('draftsPrivate')}</h3>
                                            </div>
                                        </div>
                                        {!collapsedSections['drafts'] && drafts.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                    </div>
                                );
                            })()}

                            {/* 2. OPEN (Active Betting) */}
                            {(() => {
                                const now = new Date();
                                const openBets = bets.filter(b => b.status === "OPEN" && (!b.closesAt || new Date(b.closesAt.seconds * 1000) > now));
                                if (openBets.length === 0) return null;
                                // Sort by closing date (soonest first)
                                openBets.sort((a, b) => (a.closesAt?.seconds || 0) - (b.closesAt?.seconds || 0));

                                return (
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center justify-between gap-2 mb-4 cursor-pointer select-none" onClick={() => toggleSection('open')}>
                                            <div className="flex items-center gap-2">
                                                <div className={`transition-transform duration-200 ${collapsedSections['open'] ? '-rotate-90' : ''}`}>
                                                    <ChevronDown className="h-6 w-6 text-black" />
                                                </div>
                                                <div className="bg-green-500 rounded-full p-1 border-2 border-black">
                                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                                </div>
                                                <h3 className="text-2xl font-black text-green-600 font-comic uppercase tracking-tight">{t('openForBetting')}</h3>
                                            </div>
                                            {/* New Bet Button inside Header */}
                                            {!collapsedSections['open'] && (league.status === "STARTED" || (league.status === "NOT_STARTED" && isOwner)) && myMemberProfile && hasPermission(myMemberProfile.role, "CREATE_BET") && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsBetModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] transition-all uppercase flex items-center gap-1"
                                                >
                                                    <span>+</span> {tBets('newBet')}
                                                </button>
                                            )}
                                        </div>
                                        {!collapsedSections['open'] && openBets.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                    </div>
                                );
                            })()}

                            {/* 3. UNDER REVIEW / LOCKED / PROOFING (Waiting for Event or Resolution) */}
                            {(() => {
                                const now = new Date();
                                // Include LOCKED, PROOFING, DISPUTED, or OPEN bets that have expired
                                const underReviewBets = bets.filter(b =>
                                    b.status === "LOCKED" ||
                                    b.status === "PROOFING" ||
                                    b.status === "DISPUTED" ||
                                    (b.status === "OPEN" && b.closesAt && new Date(b.closesAt.seconds * 1000) < now)
                                );

                                if (underReviewBets.length === 0) return null;

                                // Sort: Action required first (Proofing/Disputed), then by time
                                underReviewBets.sort((a, b) => {
                                    // Prioritize action items
                                    const aAction = a.status === "PROOFING" || a.status === "DISPUTED";
                                    const bAction = b.status === "PROOFING" || b.status === "DISPUTED";
                                    if (aAction && !bAction) return -1;
                                    if (!aAction && bAction) return 1;

                                    // Then date
                                    return (a.closesAt?.seconds || 0) - (b.closesAt?.seconds || 0);
                                });

                                return (
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center gap-2 mb-4 cursor-pointer select-none" onClick={() => toggleSection('locked')}>
                                            <div className={`transition-transform duration-200 ${collapsedSections['locked'] ? '-rotate-90' : ''}`}>
                                                <ChevronDown className="h-6 w-6 text-black" />
                                            </div>
                                            <div className="bg-amber-400 rounded-full p-1 border-2 border-black">
                                                <Timer className="h-4 w-4 text-black" />
                                            </div>
                                            <h3 className="text-xl font-black text-amber-600 font-comic uppercase tracking-tight">{t('underReview')}</h3>
                                        </div>
                                        {!collapsedSections['locked'] && underReviewBets.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                    </div>
                                );
                            })()}

                            {/* 4. REMOVED PROOFING SECTION (Merged Above) */}

                            {/* 5. HISTORY (Resolved & Invalid) */}
                            {(() => {
                                const history = bets.filter(b => b.status === "RESOLVED" || b.status === "INVALID");
                                if (history.length === 0) return null;
                                history.sort((a, b) => (b.resolvedAt?.seconds || 0) - (a.resolvedAt?.seconds || 0));

                                return (
                                    <div className="space-y-3 pt-6 border-t-4 border-black border-dashed">
                                        <div className="flex items-center gap-2 mb-6 cursor-pointer select-none" onClick={() => toggleSection('history')}>
                                            <div className={`transition-transform duration-200 ${collapsedSections['history'] ? '-rotate-90' : ''}`}>
                                                <ChevronDown className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <Trophy className="h-6 w-6 text-gray-400" />
                                            <h3 className="text-2xl font-black text-gray-400 font-comic uppercase">{t('theArchive')}</h3>
                                        </div>
                                        {!collapsedSections['history'] && history.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                    </div>
                                );
                            })()}

                            {/* 4. VOID / CANCELLED */}
                            {(() => {
                                const voided = bets.filter(b => b.status === "CANCELLED" || b.status === "INVALID");
                                if (voided.length === 0) return null;

                                return (
                                    <div className="space-y-3 pt-4 border-t-2 border-dashed border-gray-300">
                                        <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleSection('voided')}>
                                            <div className={`transition-transform duration-200 ${collapsedSections['voided'] ? '-rotate-90' : ''}`}>
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <XCircle className="h-5 w-5 text-gray-400" />
                                            <h3 className="text-xl font-black text-gray-500 font-comic">Voided</h3>
                                        </div>
                                        {!collapsedSections['voided'] && (
                                            <div className="opacity-60 grayscale hover:grayscale-0 transition-all space-y-3">
                                                {voided.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}



                </main >
            </div >

            {/* 3. MODALS */}
            {
                league && (
                    <>
                        <CreateBetModal
                            isOpen={isBetModalOpen}
                            onClose={() => {
                                setIsBetModalOpen(false);
                                setBetToEdit(undefined);
                            }}
                            leagueId={leagueId}
                            betToEdit={betToEdit}
                            onSuccess={fetchLeagueData}
                        />
                        <LeagueSettingsModal
                            isOpen={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                            league={league}
                            onUpdate={() => {
                                fetchLeagueData();
                                setIsSettingsOpen(false);
                            }}
                        />

                        {/* QR Code Modal (Simple Overlay) */}
                        {isQROpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsQROpen(false)}>
                                <div className="bg-white rounded-2xl border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_white] relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setIsQROpen(false)}
                                        className="absolute top-4 right-4 text-black hover:text-gray-600"
                                    >
                                        <XCircle className="w-8 h-8" />
                                    </button>
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-black font-comic uppercase mb-2">Join League</h3>
                                        <p className="text-gray-500 font-bold">Scan to join {league.name}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border-2 border-black mb-6 flex justify-center">
                                        <QRCode
                                            value={`${window.location.origin}/join/${leagueId}`}
                                            size={200}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            copyInviteLink();
                                            setIsQROpen(false);
                                        }}
                                        className="w-full py-3 bg-black text-white font-black uppercase rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(120,120,120,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(120,120,120,1)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Copy Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )
            }
        </div >
    );
}

