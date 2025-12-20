"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { getUserLeagues, League } from "@/lib/services/league-service";
import { useTranslations } from 'next-intl';
import { CreateLeagueModal } from "@/components/create-league-modal";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getUserDashboardStats, DashboardBetWithWager, DashboardStats, dismissBet, clearDismissedSection } from "@/lib/services/bet-service";
import {
    ActionBadges,
    StatsGauges,
    ActivityFeed,
    ActivityItem,
    WeeklySummary,
    LeagueCard,
    BetTabs
} from "@/components/dashboard";
import { subDays } from "date-fns";
import { LiveBetsSection } from "@/components/live-bets-section";

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const { user, loading } = useAuth();
    const router = useRouter();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        activeBets: 0,
        pendingResults: 0,
        wonBets: 0,
        lostBets: 0,
        refundedBets: 0,
        toResolve: 0,
        availableBets: 0,
        activeBetsList: [],
        pendingResultsList: [],
        wonBetsList: [],
        lostBetsList: [],
        refundedBetsList: [],
        toResolveList: [],
        availableBetsList: []
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
    const [selectedBetTab, setSelectedBetTab] = useState<"active" | "available" | "pending" | "history">("active");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        async function fetchLeagues() {
            if (user) {
                const userLeagues = await getUserLeagues(user.uid);
                setLeagues(userLeagues);
            }
        }
        if (user) {
            fetchLeagues();
        }
    }, [user]);

    useEffect(() => {
        async function fetchStats() {
            if (user && leagues.length > 0) {
                const s = await getUserDashboardStats(user, leagues);
                setStats(s);

                // Generate activity items from stats
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
                        betId: bet.id
                    });
                });

                // Add refunded/invalid bets to activity
                s.refundedBetsList.slice(0, 2).forEach((bet, idx) => {
                    items.push({
                        id: `refund-${bet.id}`,
                        type: "resolved", // Using resolved type for now, but could add "refunded" type
                        title: `Refunded: ${bet.question}`,
                        points: 0,
                        timestamp: bet.resolvedAt?.toDate() || new Date(),
                        leagueId: bet.leagueId,
                        leagueName: bet.leagueName,
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
                        betId: bet.id
                    });
                });

                // Sort by timestamp
                items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setActivityItems(items);
            }
        }
        fetchStats();
    }, [user, leagues]);

    const refreshStats = async () => {
        if (user && leagues.length > 0) {
            const s = await getUserDashboardStats(user, leagues);
            setStats(s);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    // Calculate aggregated stats
    const totalWins = stats.wonBets;
    const totalLosses = stats.lostBets;
    const winRate = totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0;
    const pointsGained = stats.wonBetsList.reduce((sum, b) => sum + (b.wager?.payout || 0) - (b.wager?.amount || 0), 0);
    const bestBet = Math.max(...stats.wonBetsList.map(b => (b.wager?.payout || 0) - (b.wager?.amount || 0)), 0);

    // Count votes needed (DISPUTED bets where user hasn't voted)
    const votesNeeded = stats.pendingResultsList.filter(b => b.status === "DISPUTED").length;

    // Count pending proofing (PROOFING bets waiting for period end)
    const pendingProofing = stats.pendingResultsList.filter(b => b.status === "PROOFING").length;

    // History = won + lost + refunded
    const historyBets = [...stats.wonBetsList, ...stats.lostBetsList, ...stats.refundedBetsList];

    return (
        <div className="min-h-screen text-foreground relative">
            <main className="container mx-auto py-6 px-4">
                {/* Action Badges - Urgent Items */}
                <ActionBadges
                    votesNeeded={votesNeeded}
                    pendingProofing={pendingProofing}
                    toResolve={stats.toResolve}
                    newBets={stats.availableBets}
                    onVotesClick={() => { setSelectedBetTab('pending'); setTimeout(() => document.getElementById('bet-tabs-section')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                    onPendingClick={() => { setSelectedBetTab('pending'); setTimeout(() => document.getElementById('bet-tabs-section')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                    onResolveClick={() => { setSelectedBetTab('pending'); setTimeout(() => document.getElementById('bet-tabs-section')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                    onNewBetsClick={() => { setSelectedBetTab('available'); setTimeout(() => document.getElementById('bet-tabs-section')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                />

                {/* 🔴 Live Bets Section - Real-time scores */}
                <LiveBetsSection userId={user.uid} />

                {/* Stats Gauges */}
                <StatsGauges
                    winRate={winRate}
                    activeBets={stats.activeBets}
                    maxActiveBets={Math.max(stats.activeBets, 10)}
                    pointsTrend={pointsGained > 0 ? Math.min(Math.round((pointsGained / 100) * 10), 100) : Math.max(Math.round((pointsGained / 100) * 10), -100)}
                    winStreak={Math.min(totalWins, 5)}
                />

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Leagues Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-black tracking-wide font-comic text-primary drop-shadow-[2px_2px_0_rgba(0,0,0,1)] uppercase">
                                    {t('yourLeagues')}
                                </h2>
                                <Button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create
                                </Button>
                            </div>

                            {leagues.length === 0 ? (
                                <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center bg-gray-50">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                        <Trophy className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <h3 className="mt-4 text-lg font-bold">{t('noLeagues')}</h3>
                                    <p className="mt-2 text-gray-500 text-sm">{t('noLeaguesDesc')}</p>
                                    <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                                        Create League
                                    </Button>
                                </div>
                            ) : (
                                <motion.div
                                    initial="hidden"
                                    animate="show"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                                    }}
                                    className="grid gap-4 sm:grid-cols-2"
                                >
                                    {leagues.map((league, idx) => (
                                        <motion.div
                                            key={league.id}
                                            variants={{
                                                hidden: { opacity: 0, y: 20 },
                                                show: { opacity: 1, y: 0 }
                                            }}
                                        >
                                            <LeagueCard
                                                league={league}
                                                rank={idx + 1}
                                                points={league.startCapital || 500}
                                                maxPoints={1000}
                                                activeBets={stats.activeBetsList.filter(b => b.leagueId === league.id).length}
                                                pendingBets={stats.pendingResultsList.filter(b => b.leagueId === league.id).length}
                                                winRate={winRate}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Bet Tabs Section */}
                        <div id="bet-tabs-section">
                            <h2 className="text-2xl font-black tracking-wide font-comic text-primary drop-shadow-[2px_2px_0_rgba(0,0,0,1)] uppercase mb-4">
                                📋 My Bets
                            </h2>
                            <BetTabs
                                activeBets={stats.activeBetsList}
                                availableBets={stats.availableBetsList}
                                pendingBets={[
                                    ...stats.pendingResultsList,
                                    ...stats.toResolveList.filter(resolveBet =>
                                        !stats.pendingResultsList.some(pendingBet => pendingBet.id === resolveBet.id)
                                    )
                                ]}
                                historyBets={historyBets}
                                userId={user.uid}
                                onDismiss={async (betId) => {
                                    await dismissBet(user.uid, betId);
                                    refreshStats();
                                }}
                                onClearAll={async (betIds) => {
                                    await clearDismissedSection(user.uid, betIds);
                                    refreshStats();
                                }}
                                onRefresh={refreshStats}
                                initialTab={selectedBetTab}
                            />
                        </div>
                    </div>

                    {/* Right Column - 1/3 width */}
                    <div className="space-y-6">
                        {/* Activity Feed */}
                        <ActivityFeed items={activityItems} maxItems={8} />

                        {/* Weekly Summary */}
                        <WeeklySummary
                            pointsGained={pointsGained}
                            wins={totalWins}
                            losses={totalLosses}
                            bestBet={bestBet}
                            sparklineData={[10, 25, 15, 40, 30, 55, 45]}
                        />
                    </div>
                </div>
            </main>

            <CreateLeagueModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
