'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { joinLeague, League } from '@/lib/services/league-service';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Loader2, Trophy, ArrowRight, User as UserIcon } from 'lucide-react';

export default function JoinLeaguePage() {
    const { leagueId } = useParams() as { leagueId: string };
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const t = useTranslations('Join');

    const [league, setLeague] = useState<League | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState("");
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        const checkLeague = async () => {
            if (!leagueId) {
                console.error("League ID missing from URL");
                setError("Invalid Join Link");
                return;
            }

            console.log("=== JOIN PAGE DEBUG ===");
            console.log("Raw leagueId from params:", leagueId);
            console.log("Type of leagueId:", typeof leagueId);
            console.log("Attempting to fetch league from Firestore...");

            setLoading(true);
            try {
                const docRef = doc(db, "leagues", String(leagueId));
                console.log("Document path:", docRef.path);
                const snap = await getDoc(docRef);
                console.log("Snapshot exists:", snap.exists());

                if (snap.exists()) {
                    console.log("League data:", snap.data());
                    setLeague({ id: snap.id, ...snap.data() } as League);
                } else {
                    console.error("League doc does not exist:", leagueId);
                    console.error("Tried path:", docRef.path);
                    setError(t('notFound'));
                }
            } catch (e: any) {
                console.error("Error fetching league:", e);
                console.error("Error details:", e.message, e.code);
                setError(t('notFound'));
            } finally {
                setLoading(false);
            }
        };
        checkLeague();
    }, [leagueId, t]);

    useEffect(() => {
        const checkMembership = async () => {
            if (!user || !leagueId) return;
            try {
                const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
                const snap = await getDoc(memberRef);
                if (snap.exists()) {
                    setIsMember(true);
                }
            } catch (e) {
                console.error(e);
            }
        };
        checkMembership();
    }, [user, leagueId]);

    const handleJoin = async () => {
        if (!user) {
            router.push(`/login?returnUrl=/join/${leagueId}`);
            return;
        }

        setJoining(true);
        try {
            await joinLeague(leagueId, user);
            router.push(`/leagues/${leagueId}`);
        } catch (e) {
            console.error(e);
            alert("Failed to join");
        } finally {
            setJoining(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !league) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md text-center space-y-4">
                    <h1 className="text-2xl font-black">{error || t('notFound')}</h1>
                    <Button onClick={() => router.push('/dashboard')}>Go Home</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-dot-pattern p-4">
            {/* Background Flair */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 -z-10" />

            <div className="w-full max-w-md rounded-2xl border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-6">

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Trophy className="h-10 w-10 text-black" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-sm font-black uppercase text-gray-500 tracking-widest">{t('intro')}</h2>
                    <h1 className="text-4xl font-black font-comic tracking-tight uppercase transform -rotate-2">{league.name}</h1>
                </div>

                {/* League Info Badges */}
                <div className="flex justify-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full border-2 border-black bg-purple-100 text-xs font-bold uppercase">
                        {league.mode === "ZERO_SUM" ? "Zero Sum" : "Standard"}
                    </span>
                    <span className="px-3 py-1 rounded-full border-2 border-black bg-blue-100 text-xs font-bold uppercase flex items-center gap-1">
                        <UserIcon className="h-3 w-3" /> {league.memberCount} Members
                    </span>
                </div>

                <div className="pt-4 space-y-3">
                    {isMember ? (
                        <div className="space-y-3">
                            <div className="p-3 bg-green-100 border-2 border-green-500 rounded-xl text-green-800 font-bold">
                                {t('alreadyMember')}
                            </div>
                            <Button
                                onClick={() => router.push(`/leagues/${leagueId}`)}
                                className="w-full h-14 text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all bg-black text-white hover:bg-gray-900"
                            >
                                {t('btnGoToLeague')} <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        user ? (
                            <Button
                                onClick={handleJoin}
                                disabled={joining}
                                className="w-full h-14 text-lg font-black uppercase tracking-widest bg-green-500 hover:bg-green-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                {joining ? <Loader2 className="h-6 w-6 animate-spin" /> : t('btnJoin')}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => router.push(`/login?returnUrl=/join/${leagueId}`)}
                                className="w-full h-14 text-lg font-black uppercase tracking-widest bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                {t('loginToJoin')}
                            </Button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
