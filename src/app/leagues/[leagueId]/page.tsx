"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { League, LeagueMember } from "@/lib/services/league-service";
import { getLeagueBets, Bet } from "@/lib/services/bet-service";
import { BetCard } from "@/components/bet-card";
import { ArrowLeft, Share2, Crown, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { CreateBetModal } from "@/components/create-bet-modal";
import { LeagueSettingsModal } from "@/components/league-settings-modal";

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

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
            return;
        }

        async function fetchLeagueData() {
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

    if (loading || dataLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!league) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-xl font-bold">{league.name}</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {user?.uid === league?.ownerId && (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                ⚙️ Settings
                            </button>
                        )}
                        <button
                            onClick={copyInviteLink}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Invite
                        </button>
                    </div>
                </div>
            </header>

            <main className="container py-6 space-y-8">
                {/* Leaderboard Section */}
                <section>
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Leaderboard</h2>
                    <div className="rounded-lg border bg-card shadow-sm">
                        <div className="divide-y divide-border">
                            {members.map((member, index) => (
                                <div key={member.uid} className="flex items-center justify-between p-4 bg-card hover:bg-accent/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
                                            {index + 1}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {member.photoURL ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={member.photoURL} alt={member.displayName} className="h-10 w-10 rounded-full" />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium leading-none flex items-center gap-2">
                                                    {member.displayName}
                                                    {member.role === 'OWNER' && <Crown className="h-3 w-3 text-yellow-500" />}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {member.role.toLowerCase()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-lg font-bold text-primary">
                                        {member.points.toLocaleString()} pts
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bets Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold tracking-tight">Active Bets</h2>
                        <button
                            onClick={() => setIsBetModalOpen(true)}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            + New Bet
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {bets.length === 0 ? (
                            <div className="col-span-2 text-center text-muted-foreground py-8 border border-dashed rounded-lg">
                                No active bets. Be the first to create one!
                            </div>
                        ) : (
                            bets.map(bet => {
                                // Find current user points safely
                                const myMemberProfile = members.find(m => m.uid === user?.uid);
                                const myPoints = myMemberProfile?.points || 0;

                                return (
                                    <BetCard key={bet.id} bet={bet} userPoints={myPoints} />
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
