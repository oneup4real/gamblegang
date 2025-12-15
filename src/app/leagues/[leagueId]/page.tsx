"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { League, LeagueMember, updateLeagueStatus, rebuy } from "@/lib/services/league-service";
import { getLeagueBets, Bet } from "@/lib/services/bet-service";
import { BetCard } from "@/components/bet-card";
import { ArrowLeft, Share2, Crown, User as UserIcon, Settings, Play, Flag, Archive, Coins } from "lucide-react";
import Link from "next/link";
import { CreateBetModal } from "@/components/create-bet-modal";
import { LeagueSettingsModal } from "@/components/league-settings-modal";
import { motion } from "framer-motion";

export default function LeaguePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const leagueId = params.leagueId as string;

    const [league, setLeague] = useState<League | null>(null);
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [bets, setBets] = useState<Bet[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [isBetModalOpen, setIsBetModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchLeagueData = async () => {
        if (!user) return;
        try {
            const leagueRef = doc(db, "leagues", leagueId);
            const leagueSnap = await getDoc(leagueRef);

            if (leagueSnap.exists()) {
                setLeague({ id: leagueSnap.id, ...leagueSnap.data() } as League);

                // Fetch members (subcollection)
                const membersRef = collection(db, "leagues", leagueId, "members");
                const membersSnap = await getDocs(membersRef);
                const membersList = membersSnap.docs.map(doc => doc.data() as LeagueMember);
                setMembers(membersList.sort((a, b) => b.points - a.points)); // Sort by points desc

                // Fetch bets
                const betsList = await getLeagueBets(leagueId);
                setBets(betsList);
            } else {
                router.push("/dashboard"); // League not found
            }
        } catch (error) {
            console.error("Error fetching league:", error);
        } finally {
            setDataLoading(false);
        }
    }

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
            return;
        }
        if (user) {
            fetchLeagueData();
        }
    }, [user, loading, leagueId, router]);

    const copyInviteLink = () => {
        // Basic invite system: Link to join page (TODO: Implement actual join page)
        const url = `${window.location.origin}/join/${leagueId}`;
        navigator.clipboard.writeText(url);
        alert("Invite link copied to clipboard!");
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

    if (loading || dataLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!league) return null;

    const isOwner = user?.uid === league.ownerId;
    const myMemberProfile = members.find(m => m.uid === user?.uid);

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header with Admin Controls */}
            <header className="border-b border-white/10 bg-background/50 backdrop-blur sticky top-0 z-30">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white drop-shadow-md flex items-center gap-2">
                                {league.name}
                                <span className="text-xs font-mono font-normal bg-white/10 px-2 py-0.5 rounded border border-white/10 text-white/60">
                                    {league.mode === "ZERO_SUM" ? "ZERO SUM" : "ARCADE"}
                                </span>
                            </h1>
                            <p className="text-xs text-white/40 font-mono tracking-widest uppercase">
                                STATUS: <span className="text-primary">{league.status}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <>
                                {league.status === "NOT_STARTED" && (
                                    <button onClick={() => handleStatusUpdate("STARTED")} className="p-2 text-green-400 hover:bg-green-400/10 rounded" title="Start League">
                                        <Play className="h-5 w-5" />
                                    </button>
                                )}
                                {league.status === "STARTED" && (
                                    <button onClick={() => handleStatusUpdate("FINISHED")} className="p-2 text-red-400 hover:bg-red-400/10 rounded" title="End League">
                                        <Flag className="h-5 w-5" />
                                    </button>
                                )}
                                {league.status === "FINISHED" && (
                                    <button onClick={() => handleStatusUpdate("ARCHIVED")} className="p-2 text-zinc-400 hover:bg-zinc-400/10 rounded" title="Archive">
                                        <Archive className="h-5 w-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-2 text-white/60 hover:bg-white/10 hover:text-white rounded"
                                >
                                    <Settings className="h-5 w-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={copyInviteLink}
                            className="p-2 text-primary hover:bg-primary/10 rounded"
                        >
                            <Share2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container py-6 space-y-8">
                {/* Stats / Wallet Card (Zero Sum Only) */}
                {league.mode === "ZERO_SUM" && myMemberProfile && (
                    <section>
                        <div className="glass rounded-xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase text-white/40 tracking-widest">My Chips</p>
                                <p className="text-3xl font-black text-primary drop-shadow-neon">{myMemberProfile.points.toLocaleString()}</p>
                                <p className="text-xs text-white/40 mt-1">Total Invested: {myMemberProfile.totalInvested?.toLocaleString() || 0}</p>
                            </div>
                            <button
                                onClick={handleRebuy}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-all"
                            >
                                <Coins className="h-4 w-4 text-yellow-500" />
                                Rebuy
                            </button>
                        </div>
                    </section>
                )}

                {/* Leaderboard Section */}
                <section>
                    <h2 className="text-2xl font-bold tracking-tight mb-4 text-white drop-shadow-md">Leaderboard</h2>
                    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                        <div className="divide-y divide-white/5">
                            {members.map((member, index) => (
                                <div key={member.uid} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                            index === 1 ? "bg-zinc-400/20 text-zinc-400" :
                                                index === 2 ? "bg-amber-700/20 text-amber-600" :
                                                    "bg-white/5 text-white/40"
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {member.photoURL ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={member.photoURL} alt={member.displayName} className="h-10 w-10 rounded-full border border-white/10" />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white">{member.displayName}</span>
                                                    {member.role === 'OWNER' && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                                                            <Crown className="h-3 w-3" /> OWNER
                                                        </span>
                                                    )}
                                                    {member.role === 'ADMIN' && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                                                            <div className="h-3 w-3 rounded-sm bg-blue-500" /> ADMIN
                                                        </span>
                                                    )}
                                                    {member.role === 'MEMBER' && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 border border-white/10">
                                                            MEMBER
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-white/40 mt-1">
                                                    {league.mode === "ZERO_SUM"
                                                        ? `ROI: ${(member.totalInvested ? ((member.points - member.totalInvested) / member.totalInvested * 100).toFixed(1) : 0)}%`
                                                        : `Points Accumulation`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-lg font-bold text-primary text-shadow-neon">
                                            {member.points.toLocaleString()} pts
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bets Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Active Bets</h2>
                        {league.status === "STARTED" && (
                            <button
                                onClick={() => setIsBetModalOpen(true)}
                                className="text-sm font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                            >
                                + New Bet
                            </button>
                        )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {bets.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                                <p className="text-white/40">No active bets.</p>
                                {league.status === "NOT_STARTED" && <p className="text-xs text-primary mt-2">Waiting for League Start...</p>}
                            </div>
                        ) : (
                            bets.map(bet => {
                                const myPoints = myMemberProfile?.points || 0;
                                return (
                                    <BetCard key={bet.id} bet={bet} userPoints={myPoints} mode={league.mode} />
                                );
                            })
                        )}
                    </div>
                </section>

            </main>

            <CreateBetModal
                leagueId={leagueId}
                isOpen={isBetModalOpen}
                onClose={() => setIsBetModalOpen(false)}
                onSuccess={async () => {
                    const updatedBets = await getLeagueBets(leagueId);
                    setBets(updatedBets);
                }}
            />

            {league && (
                <LeagueSettingsModal
                    league={league}
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onUpdate={() => window.location.reload()} // Simple reload
                />
            )}
        </div>
    );
}
