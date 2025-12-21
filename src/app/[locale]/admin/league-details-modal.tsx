"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Users, Star, Crown, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { League, LeagueMember } from "@/lib/services/league-service";
import { getLeagueMembers } from "@/lib/services/admin-service";
import { format } from "date-fns";

interface LeagueDetailsModalProps {
    league: League | null;
    onClose: () => void;
}

export function LeagueDetailsModal({ league, onClose }: LeagueDetailsModalProps) {
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [betsCount, setBetsCount] = useState(0);

    useEffect(() => {
        if (league) {
            setLoading(true);

            // Parallel fetch: Members and Bets Count
            const membersPromise = getLeagueMembers(league.id);
            const statsPromise = import("firebase/firestore").then(({ getCountFromServer, collection }) => {
                const { db } = require("@/lib/firebase/config");
                return getCountFromServer(collection(db, "leagues", league.id, "bets"));
            });

            Promise.all([membersPromise, statsPromise])
                .then(([m, stats]) => {
                    setMembers(m);
                    setBetsCount(stats.data().count);
                })
                .finally(() => setLoading(false));
        }
    }, [league]);

    if (!league) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-notebook border-b-4 border-black p-6 flex items-start justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                            <Trophy className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 flex gap-4 items-center">
                            <div className="h-16 w-16 bg-white border-2 border-black rounded-xl flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {league.icon || "🏆"}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase font-comic tracking-wide">{league.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${league.mode === 'ZERO_SUM' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                                        {league.mode.replace("_", " ")}
                                    </span>
                                    <span className="text-xs font-bold text-gray-500">
                                        ID: {league.id}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="relative z-10 bg-white p-2 rounded-lg border-2 border-black hover:bg-red-50 hover:text-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-4 border-b-2 border-black divide-x-2 divide-black bg-gray-50">
                        <div className="p-4 text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase">Members</div>
                            <div className="text-xl font-black">{league.memberCount}</div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase">Total Bets</div>
                            <div className="text-xl font-black">{betsCount}</div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase">Start Date</div>
                            <div className="text-lg font-black truncate">
                                {league.createdAt?.seconds ? format(new Date(league.createdAt.seconds * 1000), 'MMM d, yy') : '-'}
                            </div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase">Status</div>
                            <div className={`text-xl font-black ${league.isFinished ? 'text-red-600' : 'text-green-600'}`}>
                                {league.isFinished ? "FINISHED" : "ACTIVE"}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-dots">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5" />
                            <h3 className="font-black text-lg uppercase">Roster & Standings</h3>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse border-2 border-transparent" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {members.sort((a, b) => (b.role === "OWNER" ? 1 : 0) - (a.role === "OWNER" ? 1 : 0)).map((member) => (
                                    <div
                                        key={member.uid}
                                        className="bg-white p-3 rounded-xl border-2 border-black flex items-center justify-between shadow-sm hover:translate-x-1 transition-transform"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-black overflow-hidden relative">
                                                {member.photoURL ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={member.photoURL} alt={member.displayName || ""} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center font-bold text-gray-400">
                                                        {member.displayName?.charAt(0) || "?"}
                                                    </div>
                                                )}
                                                {member.role === "OWNER" && (
                                                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-0.5 rounded-full border border-black z-10">
                                                        <Crown className="h-3 w-3 text-black" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold">{member.displayName}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                    {member.role === "OWNER" ? (
                                                        <span className="text-yellow-600 bg-yellow-50 px-1 rounded border border-yellow-200">Owner</span>
                                                    ) : member.role === "ADMIN" ? (
                                                        <span className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">Admin</span>
                                                    ) : (
                                                        <span className="text-gray-400">Member</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-sm font-black w-24">
                                                {league.mode === "ZERO_SUM"
                                                    ? `Inv: $${(member.totalInvested || 0).toLocaleString()}`
                                                    : `${Math.floor(member.points || 0)} pts`
                                                }
                                            </div>
                                            {/* Win Rate could go here if available */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
