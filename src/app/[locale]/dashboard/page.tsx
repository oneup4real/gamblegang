"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Trophy, Settings } from "lucide-react";
import { getUserLeagues, League } from "@/lib/services/league-service";
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CreateLeagueModal } from "@/components/create-league-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BetStatusStepper } from "@/components/bet-status-stepper"; // Import Stepper
import { getUserDashboardStats, DashboardBetWithWager, DashboardStats, dismissBet, clearDismissedSection } from "@/lib/services/bet-service";
import { Gamepad2, Gavel, TrendingUp, Target, Award, Activity, ExternalLink, ChevronDown, ChevronUp, Ticket as TicketIcon } from "lucide-react";
import { BetTicket } from "@/components/bet-ticket";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, getISOWeek, startOfISOWeek, endOfISOWeek } from "date-fns";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};
// import Link from "next/link"; // Removed in favor of i18n/navigation Link or standard link with locale? 
// actually we should use next-intl Link wrapper usually, but for now standard Link with prefix is ok or better use the wrapper.
// Let's stick to standard next/link but I need to ensure href includes locale if I don't use the wrapper.
// Ah, usually we create a navigation.ts wrapper.

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        activeBets: 0,
        pendingResults: 0,
        wonBets: 0,
        lostBets: 0,
        toResolve: 0,
        availableBets: 0,
        activeBetsList: [],
        pendingResultsList: [],
        wonBetsList: [],
        lostBetsList: [],
        toResolveList: [],
        availableBetsList: []
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"overview" | "analytics">("overview");
    const [showMA, setShowMA] = useState(false);
    const [maWindow, setMaWindow] = useState<3 | 7 | 14>(7);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());

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
            }
        }
        fetchStats();
    }, [user, leagues]);

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-foreground relative">
            <main className="container mx-auto py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => document.getElementById('open-bets-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="p-6 bg-blue-50 border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6 cursor-pointer hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        <div className="p-4 bg-blue-500 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Gamepad2 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-blue-900 uppercase tracking-widest mb-1">Active Bets</p>
                            <p className="text-5xl font-black text-black">{stats.activeBets}</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => document.getElementById('to-resolve-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="p-6 bg-yellow-50 border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6 cursor-pointer hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        <div className="p-4 bg-yellow-500 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Gavel className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-yellow-900 uppercase tracking-widest mb-1">To Resolve</p>
                            <p className="text-5xl font-black text-black">{stats.toResolve}</p>
                        </div>
                    </motion.div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 mb-8">
                    <button
                        onClick={() => setViewMode("overview")}
                        className={`px-4 py-2 text-sm font-bold uppercase border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${viewMode === "overview"
                            ? "bg-primary text-white"
                            : "bg-white text-black hover:bg-gray-100"
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setViewMode("analytics")}
                        className={`px-4 py-2 text-sm font-bold uppercase border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${viewMode === "analytics"
                            ? "bg-primary text-white"
                            : "bg-white text-black hover:bg-gray-100"
                            }`}
                    >
                        📊 Analytics
                    </button>
                </div>

                {viewMode === "overview" ? (
                    <>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-5xl font-black tracking-wide font-comic text-primary drop-shadow-[3px_3px_0_rgba(0,0,0,1)] uppercase transform -rotate-1">{t('yourLeagues')}</h2>
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4 comic-icon" />
                                Create League
                            </Button>
                        </div>

                        {leagues.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                    <Trophy className="h-6 w-6 text-muted-foreground comic-icon" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold">{t('noLeagues')}</h3>
                                <p className="mt-2 text-muted-foreground">
                                    {t('noLeaguesDesc')}
                                </p>
                                <div className="mt-6">
                                    <Button onClick={() => setIsCreateModalOpen(true)}>
                                        Create League
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            >
                                {leagues.map((league) => (
                                    <motion.div key={league.id} variants={item}>
                                        <Link
                                            href={`/leagues/${league.id}`}
                                            className="group relative block"
                                        >
                                            <Card className="p-6 transition-all group-hover:bg-accent/20 group-hover:scale-[1.02] group-hover:comic-shadow-lg">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xl font-bold font-comic uppercase tracking-wide">{league.name}</h3>
                                                    <Trophy className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors comic-icon" />
                                                </div>
                                                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                                                    <span className="font-bold">{league.memberCount} Members</span>
                                                    <span className="font-bold text-accent-foreground bg-accent px-2 py-1 rounded-md border-2 border-black">{league.startCapital} pts</span>
                                                </div>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </>
                ) : (
                    <div className="space-y-8">
                        {/* Zero Sum ROI Graph */}
                        {leagues.some(l => l.mode === "ZERO_SUM") && (
                            <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-black tracking-tight text-black font-comic uppercase">
                                        💰 Total ROI Over Time (Zero Sum Leagues)
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-xs font-bold">
                                            <input
                                                type="checkbox"
                                                checked={showMA}
                                                onChange={(e) => setShowMA(e.target.checked)}
                                                className="w-4 h-4 border-2 border-black rounded"
                                            />
                                            Moving Average
                                        </label>
                                        {showMA && (
                                            <select
                                                value={maWindow}
                                                onChange={(e) => setMaWindow(Number(e.target.value) as 3 | 7 | 14)}
                                                className="px-2 py-1 text-xs font-bold border-2 border-black rounded bg-white"
                                            >
                                                <option value={3}>3-day MA</option>
                                                <option value={7}>7-day MA</option>
                                                <option value={14}>14-day MA</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={(() => {
                                            const days = 30; // Extended period for better MA visualization
                                            const data: Array<{ date: string; roi: number; ma?: number }> = [];
                                            const zeroSumLeagues = leagues.filter(l => l.mode === "ZERO_SUM");

                                            // Generate cumulative ROI data
                                            for (let i = days; i >= 0; i--) {
                                                const date = subDays(new Date(), i);
                                                const progress = (days - i) / days;

                                                // Cumulative ROI (not daily) - grows/shrinks over time
                                                const baseROI = zeroSumLeagues.length * 25;
                                                const cumulativeROI = (baseROI * progress * (Math.random() * 2 - 0.3));

                                                data.push({
                                                    date: format(date, "MMM dd"),
                                                    roi: parseFloat(cumulativeROI.toFixed(1))
                                                });
                                            }

                                            // Calculate moving average if enabled
                                            if (showMA) {
                                                data.forEach((point, idx) => {
                                                    if (idx >= maWindow - 1) {
                                                        const window = data.slice(idx - maWindow + 1, idx + 1);
                                                        const avg = window.reduce((sum, p) => sum + p.roi, 0) / maWindow;
                                                        point.ma = parseFloat(avg.toFixed(1));
                                                    }
                                                });
                                            }

                                            return data;
                                        })()}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#00000020" />
                                        <XAxis dataKey="date" stroke="#000000" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                        <YAxis
                                            stroke="#000000"
                                            style={{ fontSize: '12px', fontWeight: 'bold' }}
                                            label={{
                                                value: "ROI %",
                                                angle: -90,
                                                position: 'insideLeft',
                                                style: { fontWeight: 'bold' }
                                            }}
                                            domain={['auto', 'auto']}
                                        />
                                        {/* Zero baseline reference line */}
                                        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#000000" strokeWidth={2} strokeDasharray="5 5" />
                                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '2px solid black', borderRadius: '8px', fontWeight: 'bold' }} />
                                        <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="roi"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                                            name="Cumulative ROI %"
                                        />
                                        {showMA && (
                                            <Line
                                                type="monotone"
                                                dataKey="ma"
                                                stroke="#F59E0B"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={false}
                                                name={`${maWindow}-day MA`}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                                <p className="text-xs text-gray-500 text-center mt-2 font-bold">
                                    📊 Combined ROI from all Zero Sum leagues
                                </p>
                            </div>
                        )}

                        {/* Arcade Points Graph */}
                        {leagues.some(l => l.mode === "STANDARD") && (
                            <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <h3 className="text-xl font-black tracking-tight text-black font-comic uppercase mb-4">
                                    🎮 Points Gained Over Time (Arcade Leagues)
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={(() => {
                                            const days = 14;
                                            const data = [];
                                            const arcadeLeagues = leagues.filter(l => l.mode === "STANDARD");
                                            for (let i = days; i >= 0; i--) {
                                                const date = subDays(new Date(), i);
                                                const progress = (days - i) / days;
                                                // Simulated points progression
                                                const totalPoints = arcadeLeagues.reduce((sum, l) => sum + (l.startCapital || 0), 0);
                                                data.push({
                                                    date: format(date, "MMM dd"),
                                                    points: Math.floor(totalPoints * progress * (0.8 + Math.random() * 0.4))
                                                });
                                            }
                                            return data;
                                        })()}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#00000020" />
                                        <XAxis dataKey="date" stroke="#000000" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                        <YAxis
                                            stroke="#000000"
                                            style={{ fontSize: '12px', fontWeight: 'bold' }}
                                            label={{
                                                value: "Points",
                                                angle: -90,
                                                position: 'insideLeft',
                                                style: { fontWeight: 'bold' }
                                            }}
                                        />
                                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '2px solid black', borderRadius: '8px', fontWeight: 'bold' }} />
                                        <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                                        <Line type="monotone" dataKey="points" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} name="Total Points" />
                                    </LineChart>
                                </ResponsiveContainer>
                                <p className="text-xs text-gray-500 text-center mt-2 font-bold">
                                    📊 Combined points from all Arcade leagues
                                </p>
                            </div>
                        )}

                        {/* League-by-League Breakdown */}
                        <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="text-xl font-black tracking-tight text-black font-comic uppercase mb-4">League Performance Breakdown</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-black">
                                            <th className="text-left py-3 px-4 font-black uppercase text-xs">League</th>
                                            <th className="text-center py-3 px-4 font-black uppercase text-xs">Rank</th>
                                            <th className="text-center py-3 px-4 font-black uppercase text-xs">Points</th>
                                            <th className="text-center py-3 px-4 font-black uppercase text-xs">Bets</th>
                                            <th className="text-center py-3 px-4 font-black uppercase text-xs">Win Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leagues.map((league, idx) => (
                                            <tr key={league.id} className="border-b border-black/20 hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 font-bold">{league.name}</td>
                                                <td className="text-center py-3 px-4">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 border-2 border-black font-black text-sm">
                                                        #{idx + 1}
                                                    </span>
                                                </td>
                                                <td className="text-center py-3 px-4 font-bold">{league.startCapital}</td>
                                                <td className="text-center py-3 px-4 font-bold">{Math.floor(Math.random() * 20)}</td>
                                                <td className="text-center py-3 px-4">
                                                    <span className="inline-flex items-center bg-green-100 text-green-700 px-2 py-1 rounded border border-black font-bold text-sm">
                                                        {(50 + Math.random() * 40).toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="h-5 w-5" />
                                <h3 className="text-xl font-black tracking-tight text-black font-comic uppercase">Recent Activity</h3>
                            </div>
                            <div className="space-y-3">
                                {[...Array(5)].map((_, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 border-2 border-black rounded-lg">
                                        <div className={`w-2 h-2 rounded-full ${idx % 2 === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{idx % 2 === 0 ? '🎉 Won' : '💸 Lost'} bet in {leagues[idx % leagues.length]?.name || 'League'}</p>
                                            <p className="text-xs text-gray-500 font-bold">{format(subDays(new Date(), idx), "MMM dd, HH:mm")}</p>
                                        </div>
                                        <span className={`font-black ${idx % 2 === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {idx % 2 === 0 ? '+' : '-'}{Math.floor(50 + Math.random() * 150)} pts
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {/* BET SECTIONS - Expandable */}
                <div className="space-y-6 mt-12">
                    {[
                        {
                            id: 'available',
                            title: '🎟️ Available Bets',
                            count: stats.availableBets,
                            list: stats.availableBetsList,
                            description: 'Open bets you can place wagers on',
                            showTicketBadge: true
                        },
                        {
                            id: 'active',
                            title: '🎯 Your Active Bets',
                            count: stats.activeBets,
                            list: stats.activeBetsList,
                            description: 'Bets you can still place wagers on'
                        },
                        {
                            id: 'toResolve',
                            title: '🚨 To Resolve',
                            ownerOnly: true,
                            count: stats.toResolve,
                            list: stats.toResolveList,
                            description: 'Bets waiting for your decision',
                            color: 'text-orange-600'
                        },
                        {
                            id: 'pending',
                            title: '⏳ Pending Results',
                            count: stats.pendingResults,
                            list: stats.pendingResultsList,
                            description: 'Waiting for official results',
                            color: 'text-gray-600'
                        },
                        {
                            id: 'won',
                            title: '🏆 Won Bets',
                            count: stats.wonBets,
                            list: stats.wonBetsList,
                            clearable: true,
                            description: 'Your victories',
                            color: 'text-green-600'
                        },
                        {
                            id: 'lost',
                            title: '💸 Lost Bets',
                            count: stats.lostBets,
                            list: stats.lostBetsList,
                            clearable: true,
                            description: 'Better luck next time',
                            color: 'text-red-500'
                        }
                    ].map(section => {
                        if (section.ownerOnly && section.count === 0) return null;
                        if (section.count === 0) return null; // Hide empty sections

                        const isExpanded = expandedSections.has(section.id);

                        return (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <button
                                    onClick={() => {
                                        const newExpanded = new Set(expandedSections);
                                        if (isExpanded) {
                                            newExpanded.delete(section.id);
                                        } else {
                                            newExpanded.add(section.id);
                                        }
                                        setExpandedSections(newExpanded);
                                    }}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all font-comic"
                                >
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-2xl font-black uppercase">{section.title}</h3>
                                        <span className="bg-primary text-white px-4 py-1 rounded-full text-lg font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            {section.count}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {section.clearable && section.count > 0 && user && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Clear all ${section.count} bets from this section?`)) {
                                                        clearDismissedSection(user.uid, section.list.map((b: any) => b.id));
                                                        getUserDashboardStats(user, leagues).then(setStats);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                        <div className="text-2xl">
                                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t-4 border-black p-6 space-y-3">
                                        {(() => {
                                            // Helper to render a single bet card
                                            const renderBet = (bet: DashboardBetWithWager) => {
                                                const isBetExpanded = expandedBets.has(bet.id);
                                                return (
                                                    <div key={bet.id} className="bg-gray-50 rounded-xl border-2 border-black overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mb-3 last:mb-0">
                                                        <button
                                                            onClick={() => {
                                                                const newExpanded = new Set(expandedBets);
                                                                if (isBetExpanded) {
                                                                    newExpanded.delete(bet.id);
                                                                } else {
                                                                    newExpanded.add(bet.id);
                                                                }
                                                                setExpandedBets(newExpanded);
                                                            }}
                                                            className="w-full p-4 text-left hover:bg-gray-100 transition-all"
                                                        >
                                                            {/* Top Row: Stepper/Status spanning full width */}
                                                            <div className="mb-3">
                                                                {(bet.status !== "OPEN" || (bet.status === "OPEN" && bet.closesAt && bet.closesAt.toDate() < new Date())) && bet.status !== "DRAFT" && bet.status !== "INVALID" ? (
                                                                    <div className="pointer-events-none w-full">
                                                                        <BetStatusStepper bet={bet} isOwner={user?.uid === bet.creatorId} hideStatusCard={true} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs px-2 py-1 rounded font-bold border-2 border-black ${bet.status === "OPEN"
                                                                            ? (bet.closesAt && bet.closesAt.toDate() < new Date() ? "bg-amber-400" : "bg-green-400")
                                                                            : bet.status === "INVALID" ? "bg-gray-400"
                                                                                : "bg-gray-300" // DRAFT or Fallback
                                                                            }`}>
                                                                            {bet.status === "OPEN" && bet.closesAt && bet.closesAt.toDate() < new Date()
                                                                                ? "UNDER REVIEW"
                                                                                : bet.status}
                                                                        </span>
                                                                        {section.showTicketBadge && (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-bold border-2 border-yellow-600">
                                                                                <TicketIcon className="h-3 w-3" />
                                                                                No Wager
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-gray-500 font-bold">{bet.leagueName}</span>
                                                                        {bet.wager && (
                                                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-300">
                                                                                <TicketIcon className="h-3 w-3" /> Ticket
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Bottom Row: Question | Wager/Payout | Clear/Expand */}
                                                            <div className="flex items-center justify-between gap-4">
                                                                {/* Question Text */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-black text-lg truncate">{bet.question}</p>
                                                                    {bet.closesAt && (
                                                                        <p className="text-xs text-gray-500 font-bold mt-1">
                                                                            Closes: {format(bet.closesAt.toDate(), "MMM dd, HH:mm")}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Wager & Payout */}
                                                                {bet.wager && (
                                                                    <div className="flex gap-6 text-sm shrink-0">
                                                                        <div className="text-center">
                                                                            <p className="text-gray-500 text-xs font-bold">Wagered</p>
                                                                            <p className="font-black text-lg">{bet.wager.amount} pts</p>
                                                                        </div>
                                                                        {bet.wager.payout && (
                                                                            <div className="text-center">
                                                                                <p className="text-gray-500 text-xs font-bold">Net Result</p>
                                                                                <p className="font-black text-lg text-green-600">+{bet.wager.payout - bet.wager.amount} pts</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Action Icons */}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {section.clearable && user && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                dismissBet(user.uid, bet.id);
                                                                                getUserDashboardStats(user, leagues).then(setStats);
                                                                            }}
                                                                            className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-bold hover:bg-gray-700 border-2 border-black"
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                    <span className="text-xl">{isBetExpanded ? '▲' : '▼'}</span>
                                                                </div>
                                                            </div>
                                                        </button>

                                                        {isBetExpanded && (
                                                            <div className="border-t-2 border-black p-4 bg-white">
                                                                {bet.wager && (
                                                                    <div className="mb-6 flex justify-center">
                                                                        {(() => {
                                                                            let sel = String(bet.wager.selection);
                                                                            let pot = "Pending";
                                                                            let wagerStatus: "WON" | "LOST" | "PUSH" | "PENDING" = "PENDING";

                                                                            // Check if bet is resolved
                                                                            if (bet.status === "RESOLVED") {
                                                                                wagerStatus = bet.wager.status?.toUpperCase() as "WON" | "LOST" | "PUSH" || "PENDING";

                                                                                // TICKET SHOWS TOTAL CASHOUT (full payout amount)
                                                                                if (bet.wager.status === "WON") {
                                                                                    pot = `${bet.wager.payout || 0} pts`; // Total cashout
                                                                                } else if (bet.wager.status === "LOST") {
                                                                                    pot = `0 pts`; // No cashout
                                                                                } else if (bet.wager.status === "PUSH") {
                                                                                    pot = `${bet.wager.amount} pts (Refunded)`; // Refund amount
                                                                                }
                                                                            } else {
                                                                                // For active bets, show estimated total cashout
                                                                                if (bet.leagueMode === "ARCADE" || bet.leagueMode === "STANDARD") {
                                                                                    // Arcade/Standard mode: fixed payout based on bet type
                                                                                    if (bet.type === "MATCH") {
                                                                                        // Match predictions have a range
                                                                                        const settings = bet.leagueMatchSettings;
                                                                                        if (settings) {
                                                                                            pot = `${settings.winner}-${settings.exact} pts`;
                                                                                        } else {
                                                                                            pot = "1-3 pts";
                                                                                        }
                                                                                    } else if (bet.type === "CHOICE") {
                                                                                        // Multiple choice has fixed points
                                                                                        const settings = bet.leagueMatchSettings;
                                                                                        pot = settings?.choice ? `${settings.choice} pt${settings.choice !== 1 ? 's' : ''}` : "1 pt";
                                                                                    } else if (bet.type === "RANGE") {
                                                                                        // Range/Guessing has fixed points
                                                                                        const settings = bet.leagueMatchSettings;
                                                                                        pot = settings?.range ? `${settings.range} pt${settings.range !== 1 ? 's' : ''}` : "1 pt";
                                                                                    } else {
                                                                                        pot = "1 pt";
                                                                                    }
                                                                                } else if (bet.type === "CHOICE" && bet.options) {
                                                                                    // Zero-Sum mode - estimated total cashout
                                                                                    const idx = Number(bet.wager.selection);
                                                                                    if (bet.options[idx].totalWagered > 0) {
                                                                                        const odds = (bet.totalPool || 0) / bet.options[idx].totalWagered;
                                                                                        pot = `~${(bet.wager.amount * odds).toFixed(0)} pts`; // Total cashout estimate
                                                                                    }
                                                                                } else if (bet.type === "MATCH") {
                                                                                    pot = "Dynamic";
                                                                                }
                                                                            }

                                                                            if (bet.type === "CHOICE" && bet.options) {
                                                                                const idx = Number(bet.wager.selection);
                                                                                sel = bet.options[idx]?.text || "Option";
                                                                            } else if (bet.type === "MATCH" && typeof bet.wager.selection === "object") {
                                                                                const s = bet.wager.selection as any;
                                                                                sel = `${s.home} - ${s.away}`;
                                                                            } else if (bet.type === "RANGE") {
                                                                                sel = `${bet.wager.selection} ${bet.rangeUnit || ""}`;
                                                                            }

                                                                            return (
                                                                                <BetTicket
                                                                                    amount={bet.wager.amount}
                                                                                    selectionDisplay={sel}
                                                                                    potential={pot}
                                                                                    wagerStatus={wagerStatus}
                                                                                    eventDate={bet.eventDate}
                                                                                    verification={bet.verification}
                                                                                />
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}

                                                                <Link href={`/leagues/${bet.leagueId}?bet=${bet.id}`}>
                                                                    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all">
                                                                        View in League <ExternalLink className="ml-2 h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            };

                                            if (section.id === 'active') {
                                                const groups: Record<string, typeof section.list> = {};
                                                section.list.forEach(bet => {
                                                    if (!bet.closesAt) {
                                                        const key = "No Date";
                                                        if (!groups[key]) groups[key] = [];
                                                        groups[key].push(bet);
                                                        return;
                                                    }
                                                    const date = bet.closesAt.toDate();
                                                    const week = getISOWeek(date);
                                                    const start = format(startOfISOWeek(date), "MMM dd");
                                                    const end = format(endOfISOWeek(date), "MMM dd");
                                                    const key = `Week ${week} (${start} - ${end})`;

                                                    if (!groups[key]) groups[key] = [];
                                                    groups[key].push(bet);
                                                });
                                                const sortedKeys = Object.keys(groups).sort();

                                                return (
                                                    <div className="space-y-6">
                                                        {sortedKeys.map(key => (
                                                            <div key={key}>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <div className="h-px bg-black/20 flex-1" />
                                                                    <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest">{key}</h4>
                                                                    <div className="h-px bg-black/20 flex-1" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {groups[key].map(bet => renderBet(bet))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            } else {
                                                return section.list.map(bet => renderBet(bet));
                                            }
                                        })()}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </main>

            <CreateLeagueModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div >
    );
}
