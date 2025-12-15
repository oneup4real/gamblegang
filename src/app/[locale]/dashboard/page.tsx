"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Trophy } from "lucide-react";
import { getUserLeagues, League } from "@/lib/services/league-service";
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CreateLeagueModal } from "@/components/create-league-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

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
                <div className="container mx-auto flex h-14 items-center justify-between">
                    <div className="mr-4 flex">
                        <h1 className="text-xl font-bold text-primary">{t('title')}</h1>
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
                        <Link href="/settings">
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full">
                                <span className="sr-only sm:not-sr-only">Settings</span>
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={logout}
                            className="h-9 px-3"
                        >
                            <LogOut className="mr-2 h-4 w-4 comic-icon" />
                            <span className="sr-only sm:not-sr-only sm:ml-2">{t('signOut')}</span>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto py-6">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold tracking-tight font-comic text-primary drop-shadow-sm">{t('yourLeagues')}</h2>
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
            </main>

            <CreateLeagueModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
