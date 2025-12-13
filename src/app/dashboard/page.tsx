"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Trophy } from "lucide-react";
import { getUserLeagues, League } from "@/lib/services/league-service";
import { CreateLeagueModal } from "@/components/create-league-modal";
import Link from "next/link";

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <div className="mr-4 flex">
                        <h1 className="text-xl font-bold text-primary">GambleGang</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {user.photoURL && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || "User"}
                                    className="h-8 w-8 rounded-full ring-2 ring-border"
                                />
                            )}
                        </div>
                        <button
                            onClick={logout}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-2">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>
            <main className="container py-6">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">Your Leagues</h2>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create League
                    </button>
                </div>

                {leagues.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Trophy className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">No leagues yet</h3>
                        <p className="mt-2 text-muted-foreground">
                            Create a league to start betting with your friends.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                            >
                                Create League
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {leagues.map((league) => (
                            <Link
                                key={league.id}
                                href={`/leagues/${league.id}`}
                                className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:bg-accent/50 hover:shadow-md"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold">{league.name}</h3>
                                    <Trophy className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{league.memberCount} Members</span>
                                    <span>{league.startCapital} pts</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <CreateLeagueModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
