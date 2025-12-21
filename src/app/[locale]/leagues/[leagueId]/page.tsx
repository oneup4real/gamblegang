"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { League, LeagueMember, rebuy, LEAGUE_COLOR_SCHEMES, finishLeague } from "@/lib/services/league-service";
import { getLeagueBets, Bet, Wager, deleteBet } from "@/lib/services/bet-service";
import { BetCard } from "@/components/bet-card";
import { GroupedBetsByTime } from "@/components/grouped-bets";
import { BetStatusStepper } from "@/components/bet-status-stepper";
import { format } from "date-fns";
import { LeagueChat } from "@/components/league-chat";
import { ArrowLeft, Crown, User as UserIcon, Settings, Play, Flag, Archive, Coins, AlertOctagon, CheckCircle2, XCircle, Trash2, Pencil, QrCode, Gamepad2, Gavel, TrendingUp, Target, Award, Activity, ExternalLink, ChevronDown, ChevronUp, Ticket as TicketIcon, Timer, Trophy, Megaphone, MessageSquare } from "lucide-react";
import QRCode from "react-qr-code";

import Link from "next/link";
import { CreateBetModal } from "@/components/create-bet-modal";
import { LeagueSettingsModal } from "@/components/league-settings-modal";
import { LeagueAnnouncementModal } from "@/components/league-announcement-modal";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from "next-intl";
import { hasPermission } from "@/lib/rbac";
import { ActivityLog } from "@/components/activity-log";
import { useLiveLeaderboard } from "@/hooks/use-live-leaderboard";
import { LiveLeaderboardRow, LiveIndicator, PositionChangeBadge, LiveDeltaBadge, LiveStatusDot } from "@/components/live-leaderboard";

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
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [finishConfirmation, setFinishConfirmation] = useState({
        betsDisabled: false,
        cannotUndo: false
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set()); // Track which bets are expanded
    const [expandAll, setExpandAll] = useState(false); // Toggle all expand/collapse
    const [viewMode, setViewMode] = useState<"bets" | "analytics" | "activity" | "chat">("bets");
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


                // Fetch members first
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

                // Initial Sort (Fallback)
                membersList.sort((a, b) => b.points - a.points);
                setMembers(membersList);

                // --- KEY FIX: Sync current user's avatar if missing/outdated ---
                // Check BOTH Firebase Auth (user.photoURL) AND Firestore user profile (users/{uid}/photoURL)
                if (user?.uid) {
                    // Fetch user profile from Firestore to get the latest photoURL
                    const userProfileRef = doc(db, "users", user.uid);
                    const userProfileSnap = await getDoc(userProfileRef);
                    const userProfile = userProfileSnap.exists() ? userProfileSnap.data() : null;

                    // Use Firestore profile photo first, fallback to Auth photo
                    const latestPhotoURL = userProfile?.photoURL || user.photoURL;
                    const latestDisplayName = userProfile?.displayName || user.displayName;

                    if (latestPhotoURL) {
                        const myMember = membersList.find(m => m.uid === user.uid);
                        // Check if member exists AND (photo is missing OR photo is different)
                        if (myMember && (!myMember.photoURL || myMember.photoURL !== latestPhotoURL)) {
                            console.log("[LeaguePage] Syncing member avatar for:", user.uid);

                            // 1. Update local state immediately so user sees it
                            myMember.photoURL = latestPhotoURL;
                            if (latestDisplayName) myMember.displayName = latestDisplayName;
                            setMembers([...membersList]); // Trigger re-render

                            // 2. Update Firestore background
                            const { updateDoc } = await import("firebase/firestore");
                            const memberRef = doc(db, "leagues", leagueId as string, "members", user.uid);
                            updateDoc(memberRef, {
                                photoURL: latestPhotoURL,
                                displayName: latestDisplayName || myMember.displayName
                            }).catch(e => console.error("Error syncing profile to league:", e));
                        }
                    }
                }
                // -------------------------------------------------------------

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

        // Refresh League Data
        const leagueDoc = await getDoc(doc(db, "leagues", leagueId as string));
        if (leagueDoc.exists()) {
            setLeague({ id: leagueDoc.id, ...leagueDoc.data() } as League);
        }

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

    const handleFinishLeague = async () => {
        if (!user?.uid) return;
        setActionLoading(true);
        try {
            await finishLeague(leagueId, user.uid);
            setIsFinishModalOpen(false);
            await fetchLeagueData();
        } catch (error) {
            console.error(error);
            alert("Failed to finish league");
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

        // Extended arcade stats
        let totalBets = 0;
        let wins = 0;
        let losses = 0;
        let biggestWin = 0;
        let currentStreak = 0;
        let bestStreak = 0;
        let activeBets = 0;
        let totalWagered = 0;
        let totalWon = 0;

        // Sort wagers by bet closesAt for streak calculation
        const allWagers = Object.entries(myActiveWagers).map(([betId, wager]) => ({
            betId,
            wager,
            bet: bets.find(b => b.id === betId)
        })).filter(w => w.bet).sort((a, b) => (a.bet?.closesAt?.seconds || 0) - (b.bet?.closesAt?.seconds || 0));

        allWagers.forEach(({ betId, wager, bet }) => {
            if (!bet) return;

            totalWagered += wager.amount;

            // Active bets (not yet resolved)
            if (!["RESOLVED", "INVALID"].includes(bet.status)) {
                activeWagered += wager.amount;
                activeBets++;

                // Calculate potential win for CHOICE bets where we know the pool distribution
                if (bet.type === "CHOICE" && bet.options) {
                    const optIndex = Number(wager.selection);
                    const option = bet.options[optIndex];
                    if (option && option.totalWagered > 0) {
                        const estimatedReturn = (wager.amount / option.totalWagered) * bet.totalPool;
                        potentialWin += (estimatedReturn - wager.amount);
                    }
                } else {
                    potentialWin += wager.amount;
                }
            } else if (bet.status === "RESOLVED") {
                // Resolved bets - count for stats
                totalBets++;

                if (wager.status === "WON") {
                    wins++;
                    const profit = (wager.payout || 0) - wager.amount;
                    totalWon += profit;
                    if (profit > biggestWin) biggestWin = profit;

                    // Streak tracking
                    if (currentStreak >= 0) {
                        currentStreak++;
                        if (currentStreak > bestStreak) bestStreak = currentStreak;
                    } else {
                        currentStreak = 1;
                    }
                } else if (wager.status === "LOST") {
                    losses++;
                    // Streak tracking
                    if (currentStreak <= 0) {
                        currentStreak--;
                    } else {
                        currentStreak = -1;
                    }
                }
            }
        });

        const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;

        return {
            activeWagered: Math.floor(activeWagered),
            potentialWin: Math.floor(potentialWin),
            // Extended stats
            totalBets,
            wins,
            losses,
            winRate,
            biggestWin: Math.floor(biggestWin),
            currentStreak,
            bestStreak,
            activeBets,
            totalWon: Math.floor(totalWon)
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

    // --------------------------------------------------------------------------
    // DYNAMIC RE-SORTING (Live Leaderboard)
    // --------------------------------------------------------------------------
    // We display "Total Points" = Wallet + Active Wagers. 
    // So we must sort by this total, not just the static wallet points.
    useEffect(() => {
        if (members.length > 0) {
            // Check if we need to re-sort
            // We create a copy to avoid infinite loops if setMembers triggers this again immediately without change
            const sorted = [...members].sort((a, b) => {
                const equityA = a.points + (allMembersActiveWagers[a.uid] || 0);
                const equityB = b.points + (allMembersActiveWagers[b.uid] || 0);
                return equityB - equityA; // Descending
            });

            // Only update if order actually changed to prevent render loops
            const isDifferent = sorted.some((m, i) => m.uid !== members[i].uid);
            if (isDifferent) {
                console.log("⚡️ [Leaderboard] Re-sorting based on Total Equity...");
                setMembers(sorted);
            }
        }
    }, [allMembersActiveWagers, members.length]); // Intentionally not including 'members' deep dependency to avoid loops, just length check or manual trigger

    // --------------------------------------------------------------------------
    // LIVE LEADERBOARD (Real-time position tracking)
    // --------------------------------------------------------------------------
    const {
        members: liveMembers,
        hasLiveBets,
        loading: liveLoading
    } = useLiveLeaderboard(leagueId, members, allMembersActiveWagers);


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
                // ZERO SUM: Parimutuel Odds - Show potential total return (like bet card)
                const optIdx = Number(wager.selection);
                const opt = bet.options[optIdx];
                if (opt && opt.totalWagered > 0) {
                    const odds = bet.totalPool / opt.totalWagered;
                    displayedOdds = odds.toFixed(2) + "x";
                    const totalReturn = Math.floor(wager.amount * odds);
                    // Show potential return (not profit) to match bet card's "Potential" display
                    displayedReturn = `+${totalReturn.toLocaleString()}`;
                    returnColor = "text-green-600";
                } else {
                    // No bets on this option yet - show potential (assume 2x odds)
                    displayedOdds = "2.00x";
                    const potentialReturn = wager.amount * 2;
                    displayedReturn = `+${potentialReturn.toLocaleString()}`;
                    returnColor = "text-green-600";
                }

            } else {
                // ARCADE: Fixed points (No Wager Amount)
                let multiplier = 1;
                if (wager.powerUp === 'x2') multiplier = 2;
                if (wager.powerUp === 'x3') multiplier = 3;
                if (wager.powerUp === 'x4') multiplier = 4;

                displayedOdds = multiplier > 1 ? `${multiplier}x` : "-";
                const potentialPts = 1 * multiplier;
                displayedReturn = `${potentialPts} ${tBets('pts')}`;
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

                    {/* Question Title - Full Width Row with Edit Icon */}
                    <div className="flex items-start gap-2 mb-2">
                        <p className="font-black text-black text-sm sm:text-lg flex-1">{bet.question}</p>
                        {isOwner && bet.status === "OPEN" && (
                            <div
                                role="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBetToEdit(bet);
                                    setIsBetModalOpen(true);
                                }}
                                className="p-1 hover:bg-blue-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors shrink-0"
                                title="Edit Bet"
                            >
                                <Pencil className="h-4 w-4" />
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Date/Timer | Odds/Return | Icons */}
                    <div className="flex items-center justify-between gap-2">
                        {/* Event Date & Betting Timer */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
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

                        {/* Odds & Return */}
                        <div className="flex gap-4 text-sm shrink-0">
                            {mode === "ZERO_SUM" && (
                                <div className="text-center">
                                    <p className="text-gray-500 text-[10px] font-bold">{tBets('odds')}</p>
                                    <p className="font-black text-black text-sm">{displayedOdds}</p>
                                </div>
                            )}
                            <div className="text-center">
                                <p className="text-gray-500 text-[10px] font-bold">{bet.status === "RESOLVED" ? "Net Result" : "Potential"}</p>
                                <p className={`font-black text-sm ${returnColor}`}>{displayedReturn}</p>
                            </div>
                        </div>

                        {/* Action Icons */}
                        <div className="text-black text-xl font-bold flex items-center gap-1 shrink-0">
                            {isOwner && (
                                <div className="flex items-center">
                                    {(bet.wagerCount === 0 || !bet.wagerCount) && (
                                        <div
                                            role="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBetToEdit(bet);
                                                setIsBetModalOpen(true);
                                            }}
                                            className="p-1 hover:bg-blue-100 rounded-lg text-gray-300 hover:text-blue-500 transition-colors"
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
                                        className="p-1 hover:bg-red-100 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
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
                            powerUps={(() => {
                                // Debug: trace the actual values
                                const memberPowerUps = myMemberProfile?.powerUps;
                                const leaguePowerUps = league.arcadePowerUpSettings;
                                console.log("[LeaguePage] Passing powerUps - member:", memberPowerUps, "league:", leaguePowerUps, "myMemberProfile:", myMemberProfile?.uid);
                                return memberPowerUps || leaguePowerUps || { x2: 3, x3: 3, x4: 2 };
                            })()}
                            onWagerSuccess={fetchLeagueData}
                            isOwnerOverride={isOwner || user?.uid === bet.creatorId}
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
            {/* Header Card - Separate from content */}
            <header className="pt-6 pb-4">
                <div className="max-w-5xl mx-auto px-3 sm:px-6">
                    <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {/* Title and controls row */}
                        <div className="p-4 md:px-6 md:py-4 flex flex-col md:flex-row items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <Link href="/dashboard" className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-black shrink-0">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-lg md:text-xl font-black text-black drop-shadow-md flex flex-wrap items-center gap-2 font-comic uppercase tracking-wide leading-tight">
                                        <span className="truncate">{league.name}</span>
                                        <span className="text-[10px] md:text-xs font-bold bg-primary/10 px-2 py-0.5 rounded border-2 border-black text-primary whitespace-nowrap shrink-0">
                                            {league.mode === "ZERO_SUM" ? "ZERO SUM" : "ARCADE"}
                                        </span>
                                    </h1>
                                    {league.isFinished && (
                                        <span className="text-[10px] md:text-xs font-bold bg-red-100 px-2 py-0.5 rounded border-2 border-black text-red-600 mt-1">
                                            FINISHED
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end md:justify-start">
                                {isOwner && (
                                    <>
                                        {!league.isFinished && (
                                            <button
                                                onClick={() => setIsFinishModalOpen(true)}
                                                className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-red-500 hover:text-red-600 hover:bg-red-50"
                                                title="Finish Season"
                                            >
                                                <Flag className="h-5 w-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsSettingsOpen(true)}
                                            className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-black hover:bg-gray-50"
                                            title="League Settings"
                                        >
                                            <Settings className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setIsAnnouncementOpen(true)}
                                            className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-orange-500 hover:bg-orange-50"
                                            title="Send Announcement"
                                        >
                                            <Megaphone className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsQROpen(true)}
                                    className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg hover:translate-y-[2px] hover:shadow-none transition-all text-purple-600 hover:bg-purple-50"
                                    title="Show QR Code"
                                >
                                    <QrCode className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            {/* Tabs + Main Content */}
            <main className="max-w-5xl mx-auto px-3 sm:px-6 pb-8 space-y-0">
                {/* 🏆 FINAL RESULTS BANNER */}
                {league.isFinished && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-6 md:p-8 bg-yellow-50 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500 animate-gradient-x" />

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="bg-yellow-100 p-4 rounded-full border-4 border-black shadow-lg mb-4">
                                <Trophy className="h-12 w-12 text-yellow-600 fill-yellow-400" />
                            </div>

                            <h2 className="text-3xl md:text-5xl font-black font-comic uppercase tracking-wider text-black mb-2 drop-shadow-sm">
                                Final Results
                            </h2>
                            <p className="text-base md:text-lg font-bold text-gray-600 mb-6 bg-white/50 px-4 py-1 rounded-full border-2 border-black/5 inline-block">
                                The season has officially ended. Congratulations to the winner!
                            </p>

                            {/* Winner Showcase */}
                            {members.length > 0 && (
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 h-10 w-10 text-yellow-500 fill-yellow-300 drop-shadow-md animate-bounce" />
                                        <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform">
                                            {members[0].photoURL ? (
                                                <img src={members[0].photoURL} className="w-16 h-16 rounded-full border-2 border-black object-cover" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center">
                                                    <span className="text-2xl">👤</span>
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <span className="block text-xs font-black uppercase text-yellow-600 tracking-widest mb-1">League Champion</span>
                                                <span className="block text-2xl md:text-3xl font-black text-black leading-none">{members[0].displayName}</span>
                                                <span className="block text-sm font-bold text-gray-500 mt-1">
                                                    {members[0].points.toLocaleString()} Points
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Message */}
                                    {members[0].uid === user?.uid && (
                                        <div className="mt-4 animate-pulse">
                                            <span className="px-4 py-2 bg-black text-white font-black uppercase rounded-lg shadow-lg rotate-2 inline-block">
                                                You Won! 🏆
                                            </span>
                                        </div>
                                    )}
                                    ```
                                </div>
                            )}
                        </div>

                        {/* Confetti Background Effect (CSS only for now) */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '30px 30px' }}></div>
                    </motion.div>
                )}

                {/* TABS: BETS vs ANALYTICS vs ACTIVITY */}
                <div className="flex items-end gap-1 md:gap-2 -mb-[2px] relative z-10 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setViewMode("bets")}
                        className={`relative px-3 md:px-6 py-2 rounded-t-lg font-black uppercase tracking-wider text-xs md:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${viewMode === "bets"
                            ? "bg-white text-black border-2 border-b-0 border-black pb-3 z-10"
                            : "bg-gray-200 text-gray-500 hover:bg-gray-300 border-2 border-transparent mb-[2px]"
                            }`}
                    >
                        {t('tabBets')}
                    </button>
                    <button
                        onClick={() => setViewMode("chat")}
                        className={`relative px-3 md:px-6 py-2 rounded-t-lg font-black uppercase tracking-wider text-xs md:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${viewMode === "chat"
                            ? "bg-white text-black border-2 border-b-0 border-black pb-3 z-10"
                            : "bg-gray-200 text-gray-500 hover:bg-gray-300 border-2 border-transparent mb-[2px]"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>TRASH TALK</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode("analytics")}
                        className={`relative px-3 md:px-6 py-2 rounded-t-lg font-black uppercase tracking-wider text-xs md:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${viewMode === "analytics"
                            ? "bg-white text-black border-2 border-b-0 border-black pb-3 z-10"
                            : "bg-gray-200 text-gray-500 hover:bg-gray-300 border-2 border-transparent mb-[2px]"
                            }`}
                    >
                        {t('tabAnalytics')}
                    </button>
                    {/* Activity Tab - Only for Admins/Owners */}
                    {(user?.uid === league?.ownerId || members.find(m => m.uid === user?.uid)?.role === 'ADMIN') && (
                        <button
                            onClick={() => setViewMode("activity")}
                            className={`relative px-3 md:px-6 py-2 rounded-t-lg font-black uppercase tracking-wider text-xs md:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${viewMode === "activity"
                                ? "bg-white text-black border-2 border-b-0 border-black pb-3 z-10"
                                : "bg-gray-200 text-gray-500 hover:bg-gray-300 border-2 border-transparent mb-[2px]"
                                }`}
                        >
                            <div className="flex items-center gap-1 md:gap-2">
                                <Activity className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Activity</span>
                                <span className="sm:hidden">Log</span>
                            </div>
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="bg-white border-2 border-black rounded-b-xl rounded-tr-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {viewMode === "chat" ? (
                        <LeagueChat leagueId={leagueId} currentUser={user!} members={members} />
                    ) : viewMode === "activity" ? (
                        <ActivityLog
                            leagueId={leagueId}
                            isAdmin={user?.uid === league?.ownerId || members.find(m => m.uid === user?.uid)?.role === 'ADMIN'}
                        />
                    ) : viewMode === "analytics" ? (
                        <div>
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
                                {analyticsMetric === "profit" && "Cumulative Net Profit (Points)"}
                                {analyticsMetric === "roi" && "Cumulative Return on Investment (%)"}
                                {analyticsMetric === "rank" && "League Ranking over Time (1 = Top)"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats / Wallet Card (Zero Sum Only) */}
                            {league.mode === "ZERO_SUM" && myMemberProfile && (
                                <section>
                                    <div className={`bg-gradient-to-r ${LEAGUE_COLOR_SCHEMES[league.colorScheme || 'blue'].from} ${LEAGUE_COLOR_SCHEMES[league.colorScheme || 'blue'].to} rounded-2xl border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6`}>
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            {/* Balance */}
                                            <div className="text-center md:text-left">
                                                <p className="text-sm font-black uppercase text-white/80 tracking-widest">My Points</p>
                                                <p className="text-5xl font-black text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] font-comic">
                                                    {/* Show total points (wallet + active wagers from non-resolved bets only) */}
                                                    {(myMemberProfile.points + stats.activeWagered).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-white/90 font-bold mt-1">
                                                    Wallet: {myMemberProfile.points.toLocaleString()} | Active: {stats.activeWagered.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-white/70 font-bold mt-0.5">
                                                    Total Invested: {(myMemberProfile.totalBought || (league.buyInType === "FIXED" ? league.startCapital : 0)).toLocaleString()} pts
                                                </p>
                                            </div>

                                            {/* Active Stats */}
                                            <div className="flex gap-8 bg-black/20 p-4 rounded-xl border-2 border-white/10 backdrop-blur-sm">
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-white/70 uppercase mb-1">Active Wagers</p>
                                                    <p className="text-xl font-black text-white">{stats.activeWagered.toLocaleString()}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-white/70 uppercase mb-1">Potential Win</p>
                                                    <p className="text-xl font-black text-green-300">+{stats.potentialWin.toLocaleString()}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-white/70 uppercase mb-1">Potential Loss</p>
                                                    <p className="text-xl font-black text-red-300">-{stats.activeWagered.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* Rebuy */}
                                            <button
                                                onClick={handleRebuy}
                                                disabled={actionLoading || league.buyInType === "FIXED"}
                                                title={league.buyInType === "FIXED" ? "Rebuys disabled in Fixed mode" : "Buy more points"}
                                                className={`flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl text-lg font-black text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] ${league.buyInType === "FIXED" ? "bg-gray-300 cursor-not-allowed opacity-70" : "bg-yellow-400 hover:bg-yellow-500"}`}
                                            >
                                                <Coins className="h-5 w-5 text-black" />
                                                REBUY
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Stats Card (Arcade Mode) - Compact & Clean Design */}
                            {league.mode === "STANDARD" && myMemberProfile && (
                                <section>
                                    <div className={`bg-gradient-to-r ${LEAGUE_COLOR_SCHEMES[league.colorScheme || 'purple'].from} ${LEAGUE_COLOR_SCHEMES[league.colorScheme || 'purple'].to} rounded-2xl border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6`}>
                                        {/* Main Row: Points + Stats + Power-Ups */}
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                                            {/* Left: Big Points Display */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-center md:text-left">
                                                    <p className="text-6xl font-black text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.4)] font-comic leading-none">
                                                        {myMemberProfile.points.toLocaleString()}
                                                    </p>
                                                    <p className="text-xs font-black text-white/80 uppercase tracking-wider mt-1">Points</p>
                                                </div>
                                            </div>

                                            {/* Center: Quick Stats Row */}
                                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                                {/* Win Rate */}
                                                <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                    <span className="text-lg">🎯</span>
                                                    <span className="font-black text-black">{stats.winRate}%</span>
                                                </div>

                                                {/* W/L Record */}
                                                <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                    <span className="font-black text-green-600">{stats.wins}W</span>
                                                    <span className="text-gray-400">/</span>
                                                    <span className="font-black text-red-500">{stats.losses}L</span>
                                                </div>

                                                {/* Streak */}
                                                {stats.currentStreak !== 0 && (
                                                    <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${stats.currentStreak > 0 ? 'bg-orange-400' : 'bg-blue-400'}`}>
                                                        <span className="text-lg">{stats.currentStreak > 0 ? '🔥' : '❄️'}</span>
                                                        <span className="font-black text-white">{Math.abs(stats.currentStreak)}</span>
                                                    </div>
                                                )}

                                                {/* Active Bets */}
                                                {stats.activeBets > 0 && (
                                                    <div className="flex items-center gap-1 bg-purple-500 rounded-full px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        <span className="text-lg">🎲</span>
                                                        <span className="font-black text-white">{stats.activeBets}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Power-Ups */}
                                            {myMemberProfile.powerUps && (
                                                <div className="flex items-center gap-2">
                                                    {/* x2 - Muscle */}
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400 to-green-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center">
                                                            <span className="text-lg leading-none">💪</span>
                                                            <span className="text-[10px] font-black text-white leading-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">×2</span>
                                                        </div>
                                                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center border-2 border-black">
                                                            {myMemberProfile.powerUps.x2 || 0}
                                                        </span>
                                                    </div>
                                                    {/* x3 - Flame */}
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center">
                                                            <span className="text-lg leading-none">🔥</span>
                                                            <span className="text-[10px] font-black text-white leading-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">×3</span>
                                                        </div>
                                                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center border-2 border-black">
                                                            {myMemberProfile.powerUps.x3 || 0}
                                                        </span>
                                                    </div>
                                                    {/* x4 - Explosion */}
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center">
                                                            <span className="text-lg leading-none">💥</span>
                                                            <span className="text-[10px] font-black text-white leading-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">×4</span>
                                                        </div>
                                                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center border-2 border-black">
                                                            {myMemberProfile.powerUps.x4 || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Leaderboard Section */}
                            <section>
                                {/* Unified Leaderboard Card */}
                                <div className="rounded-2xl border-4 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                                    {/* Header Part */}
                                    <div className={`bg-gradient-to-r ${LEAGUE_COLOR_SCHEMES[league.colorScheme || 'purple'].from} ${LEAGUE_COLOR_SCHEMES[league.colorScheme || 'purple'].to} p-6 border-b-4 border-black`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-4xl font-black tracking-tight text-white font-comic uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)] flex items-center gap-2">
                                                    <span className="relative">
                                                        <Trophy className="w-10 h-10 text-yellow-300 drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]" strokeWidth={2.5} />
                                                    </span>
                                                    {t('leaderboard')}
                                                </h2>
                                                <p className="text-sm text-white/90 font-bold mt-1">
                                                    {members.length} {members.length === 1 ? 'player' : 'players'} competing
                                                </p>
                                            </div>
                                            {/* Live indicator when there are live bets */}
                                            <LiveIndicator hasLiveBets={hasLiveBets} />
                                        </div>
                                    </div>

                                    {/* List Part - Use live members when available */}
                                    <div className="divide-y-2 divide-black bg-white">
                                        {(hasLiveBets ? liveMembers : members).map((member, index) => {
                                            // Cast to MemberWithLiveStats if we have live data
                                            const liveMember = hasLiveBets ? member as any : null;

                                            return (
                                                <div key={member.uid} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                        {/* Ranking */}
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm border-2 border-black ${index === 0 ? "bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" :
                                                            index === 1 ? "bg-zinc-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" :
                                                                index === 2 ? "bg-orange-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" :
                                                                    "bg-gray-100 text-gray-500"
                                                            }`}>
                                                            {index + 1}
                                                        </div>

                                                        {/* Avatar */}
                                                        <div className="shrink-0">
                                                            {member.photoURL ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={member.photoURL} alt={member.displayName} className="h-10 w-10 rounded-full border border-white/10" />
                                                            ) : (
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Name & badges */}
                                                        <div className="min-w-0">
                                                            <span className="font-black text-black truncate block">{member.displayName}</span>
                                                            {/* Role Badge */}
                                                            {member.role === 'OWNER' && (
                                                                <div className="mt-0.5">
                                                                    <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 border border-yellow-300">
                                                                        <Crown className="h-3 w-3" /> OWNER
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {member.role === 'ADMIN' && (
                                                                <div className="mt-0.5">
                                                                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-300">
                                                                        ADM
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {member.role === 'MEMBER' && (
                                                                <div className="mt-0.5">
                                                                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 border border-gray-300">
                                                                        MEMBER
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* ROI - Only show in Zero Sum mode */}
                                                            {league.mode === "ZERO_SUM" && (
                                                                <p className="text-xs text-gray-500 font-bold mt-1">
                                                                    {(() => {
                                                                        const buyIn = member.totalBought || (league.buyInType === "FIXED" ? league.startCapital : 0);
                                                                        if (buyIn === 0) return "ROI: 0.0%";
                                                                        const activeWagerAmount = allMembersActiveWagers[member.uid] || 0;
                                                                        const currentEquity = member.points + activeWagerAmount;
                                                                        const roi = ((currentEquity - buyIn) / buyIn * 100).toFixed(1);
                                                                        return `ROI: ${roi}%`;
                                                                    })()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right side: Live indicators + Points */}
                                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                        {/* Live indicators (only show when there are live bets) */}
                                                        {hasLiveBets && liveMember?.activeLiveBets > 0 && (
                                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                                {/* Position change arrow */}
                                                                <PositionChangeBadge change={liveMember.positionChange} compact />

                                                                {/* Delta points */}
                                                                <LiveDeltaBadge delta={liveMember.potentialDelta} compact />

                                                                {/* Status dot */}
                                                                <LiveStatusDot
                                                                    winningBets={liveMember.winningBets}
                                                                    losingBets={liveMember.losingBets}
                                                                    neutralBets={liveMember.neutralBets}
                                                                    compact
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Points */}
                                                        <div className="text-right">
                                                            <div className="font-black text-xl sm:text-2xl text-primary drop-shadow-[2px_2px_0_rgba(0,0,0,1)] font-comic">
                                                                {hasLiveBets && liveMember
                                                                    ? liveMember.livePoints.toLocaleString()
                                                                    : (member.points + (allMembersActiveWagers[member.uid] || 0)).toLocaleString()
                                                                } pts
                                                            </div>
                                                            {/* W/L Record under points */}
                                                            {member.recentResults && member.recentResults.length > 0 && (
                                                                <div className="flex items-center justify-end gap-2 mt-1">
                                                                    <span className="text-[11px] font-black text-green-600">
                                                                        {member.recentResults.filter(r => r === 'W').length}W
                                                                    </span>
                                                                    <span className="text-gray-300">/</span>
                                                                    <span className="text-[11px] font-black text-red-500">
                                                                        {member.recentResults.filter(r => r === 'L').length}L
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* Bets Section */}
                            <section>
                                {/* Header Removed as per update */}

                                {/* LIST VIEW (Grouped) */}
                                <div className="space-y-8">
                                    {bets.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                            <p className="text-gray-500 font-bold">{tBets('noBetsFound')}</p>
                                            {!league.isFinished && (
                                                <button
                                                    onClick={() => setIsBetModalOpen(true)}
                                                    className="mt-4 px-6 py-3 bg-primary text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all uppercase"
                                                >
                                                    {tBets('newBet')}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Global Create Bet Button (When bets exist) */}
                                            {!league.isFinished && myMemberProfile && hasPermission(myMemberProfile.role, "CREATE_BET") && (
                                                <div className="flex justify-end mb-4">
                                                    <button
                                                        onClick={() => setIsBetModalOpen(true)}
                                                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] transition-all uppercase flex items-center gap-1"
                                                    >
                                                        <span>+</span> {tBets('newBet')}
                                                    </button>
                                                </div>
                                            )}

                                            {/* 1. DRAFTS (Owner Only) */}
                                            {(() => {
                                                const drafts = bets.filter(b => b.status === "DRAFT");
                                                if (drafts.length === 0 || !isOwner) return null;

                                                return (
                                                    <div className="space-y-3 mb-8">
                                                        <div className="flex items-center justify-between gap-2 mb-4 bg-gray-100 p-2 rounded-lg border-2 border-dashed border-gray-400 cursor-pointer select-none" onClick={() => toggleSection('drafts')}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`transition-transform duration-200 ${collapsedSections['drafts'] ? '-rotate-90' : ''}`}>
                                                                    <ChevronDown className="h-5 w-5 text-gray-700" />
                                                                </div>
                                                                <span className="text-xl">📝</span>
                                                                <h3 className="text-lg font-black text-gray-700 font-comic uppercase">Drafts (Private)</h3>
                                                            </div>
                                                            {/* New Bet Button for Drafts is redundant if we have it in Open, but maybe useful? Keep it simple. */}
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

                                                return (
                                                    <div className="mb-8">

                                                        <GroupedBetsByTime
                                                            bets={openBets}
                                                            getClosingDate={(bet) => bet.closesAt ? new Date(bet.closesAt.seconds * 1000) : null}
                                                            renderBet={(bet) => renderBetItem(bet, myMemberProfile?.points || 0, league.mode)}
                                                        />
                                                    </div>
                                                );
                                            })()}

                                            {/* 3. LOCKED (Game in Progress / Waiting for Result) */}
                                            {(() => {
                                                const now = new Date();
                                                // Locked bets OR Open bets that have expired
                                                const lockedBets = bets.filter(b =>
                                                    b.status === "LOCKED" ||
                                                    (b.status === "OPEN" && b.closesAt && new Date(b.closesAt.seconds * 1000) < now)
                                                );

                                                if (lockedBets.length === 0) return null;

                                                // Sort by date
                                                lockedBets.sort((a, b) => (a.closesAt?.seconds || 0) - (b.closesAt?.seconds || 0));

                                                return (
                                                    <div className="space-y-3 mb-8">
                                                        <div className="flex items-center gap-2 mb-4 cursor-pointer select-none" onClick={() => toggleSection('locked')}>
                                                            <div className={`transition-transform duration-200 ${collapsedSections['locked'] ? '-rotate-90' : ''}`}>
                                                                <ChevronDown className="h-6 w-6 text-black" />
                                                            </div>
                                                            <div className="bg-amber-400 rounded-full p-1 border-2 border-black">
                                                                <Timer className="h-4 w-4 text-black" />
                                                            </div>
                                                            <h3 className="text-xl font-black text-amber-600 font-comic uppercase tracking-tight">Locked</h3>
                                                        </div>
                                                        {!collapsedSections['locked'] && lockedBets.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                                    </div>
                                                );
                                            })()}

                                            {/* 4. PROOFING (Result Proposed / Under Review) */}
                                            {(() => {
                                                const proofingBets = bets.filter(b => b.status === "PROOFING" || b.status === "DISPUTED");

                                                if (proofingBets.length === 0) return null;

                                                return (
                                                    <div className="space-y-3 mb-8">
                                                        <div className="flex items-center gap-2 mb-4 cursor-pointer select-none" onClick={() => toggleSection('proofing')}>
                                                            <div className={`transition-transform duration-200 ${collapsedSections['proofing'] ? '-rotate-90' : ''}`}>
                                                                <ChevronDown className="h-6 w-6 text-black" />
                                                            </div>
                                                            <div className="bg-blue-500 rounded-full p-1 border-2 border-black">
                                                                <Gavel className="h-4 w-4 text-white" />
                                                            </div>
                                                            <h3 className="text-xl font-black text-blue-600 font-comic uppercase tracking-tight">Proofing Phase</h3>
                                                        </div>
                                                        {!collapsedSections['proofing'] && proofingBets.map(bet => renderBetItem(bet, myMemberProfile?.points || 0, league.mode))}
                                                    </div>
                                                );
                                            })()}

                                            {/* 5. HISTORY (Resolved & Invalid) */}
                                            {(() => {
                                                const history = bets.filter(b => b.status === "RESOLVED" || b.status === "INVALID");
                                                if (history.length === 0) return null;
                                                history.sort((a, b) => (b.resolvedAt?.seconds || 0) - (a.resolvedAt?.seconds || 0));

                                                return (
                                                    <div className="space-y-3 pt-6 border-t-4 border-black border-dashed">
                                                        <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleSection('archive')}>
                                                            <div className={`transition-transform duration-200 ${collapsedSections['archive'] ? '-rotate-90' : ''}`}>
                                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                            <Archive className="h-5 w-5 text-gray-400" />
                                                            <h3 className="text-xl font-black text-gray-400 font-comic uppercase">The Archive</h3>
                                                            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{history.length}</span>
                                                        </div>
                                                        {!collapsedSections['archive'] && (
                                                            <div className="space-y-6">
                                                                {history.map(bet => {
                                                                    const wager = myActiveWagers[bet.id];
                                                                    return (
                                                                        <BetCard
                                                                            key={bet.id}
                                                                            bet={bet}
                                                                            userPoints={myMemberProfile?.points || 0}
                                                                            mode={league.mode}
                                                                            userWager={wager}
                                                                            powerUps={myMemberProfile?.powerUps || league.arcadePowerUpSettings}
                                                                            onWagerSuccess={fetchLeagueData}
                                                                            isOwnerOverride={isOwner || user?.uid === bet.creatorId}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
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
                                        </>
                                    )}
                                </div>
                            </section>
                        </div>
                    )
                    }

                    {
                        isBetModalOpen && (
                            <CreateBetModal
                                leagueId={leagueId}
                                leagueMode={league.mode}
                                aiAutoConfirmEnabled={league.aiAutoConfirmEnabled}
                                isOpen={isBetModalOpen}
                                onClose={() => {
                                    setIsBetModalOpen(false);
                                    setBetToEdit(undefined);
                                }}
                                onSuccess={() => {
                                    fetchLeagueData();
                                    setIsBetModalOpen(false);
                                }}
                                betToEdit={betToEdit}
                            />
                        )
                    }
                </div>
            </main >

            {/* League Settings Modal */}
            {
                league && (
                    <LeagueSettingsModal
                        league={league}
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        onUpdate={() => window.location.reload()}
                    />
                )
            }

            {/* QR Code Modal */}
            {
                isQROpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsQROpen(false)}>
                        {/* ... QR ModalContent ... */}
                        <div className="bg-white rounded-2xl border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setIsQROpen(false)}
                                className="absolute top-4 right-4 p-1 hover:bg-red-100 rounded-full transition-colors border-2 border-transparent hover:border-black"
                            >
                                <XCircle className="h-6 w-6 text-black" />
                            </button>
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4">
                                    <QrCode className="h-6 w-6 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-black font-comic uppercase tracking-wider">Join League</h3>
                                <p className="text-gray-500 text-sm font-bold">Scan to join {league?.name}</p>

                                <div className="bg-white p-4 rounded-xl border-2 border-black inline-block">
                                    <QRCode
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${leagueId}`}
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
                    </div>
                )
            }

            {/* Announcement Modal */}
            {league && user && (
                <LeagueAnnouncementModal
                    isOpen={isAnnouncementOpen}
                    onClose={() => setIsAnnouncementOpen(false)}
                    leagueId={leagueId as string}
                    leagueName={league.name}
                    user={user}
                />
            )}
            {/* Finish League Modal */}
            {isFinishModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full overflow-hidden"
                    >
                        <div className="bg-red-500 px-6 py-4 border-b-4 border-black flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase flex items-center gap-2 font-comic tracking-wide">
                                <Flag className="h-6 w-6" />
                                Finish Season?
                            </h2>
                            <button
                                onClick={() => setIsFinishModalOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-red-50 border-l-4 border-red-500 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertOctagon className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-bold text-red-700">
                                            Warning: This action is permanent!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-600 font-bold">
                                To confirm finishing the league <strong>{league.name}</strong>, please acknowledge the following:
                            </p>

                            <div className="space-y-3">
                                <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-transparent hover:bg-gray-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-5 h-5 border-2 border-black rounded text-primary focus:ring-primary"
                                        checked={finishConfirmation.betsDisabled}
                                        onChange={(e) => setFinishConfirmation(prev => ({ ...prev, betsDisabled: e.target.checked }))}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        I understand that all active bets will be cancelled and betting will be disabled.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-transparent hover:bg-gray-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-5 h-5 border-2 border-black rounded text-primary focus:ring-primary"
                                        checked={finishConfirmation.cannotUndo}
                                        onChange={(e) => setFinishConfirmation(prev => ({ ...prev, cannotUndo: e.target.checked }))}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        I understand this action <strong>cannot be undone</strong> and the winner will be declared immediately.
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleFinishLeague}
                                    disabled={!finishConfirmation.betsDisabled || !finishConfirmation.cannotUndo || actionLoading}
                                    className={`px-6 py-3 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-sm tracking-wide transition-all
                                        ${(!finishConfirmation.betsDisabled || !finishConfirmation.cannotUndo)
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border-gray-300'
                                            : 'bg-red-500 text-white hover:bg-red-600 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                                        }
                                    `}
                                >
                                    {actionLoading ? 'Finishing...' : 'Confirm & Finish'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
