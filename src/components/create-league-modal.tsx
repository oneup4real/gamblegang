"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Coins } from "lucide-react";
import { createLeague, LeagueMode } from "@/lib/services/league-service";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

interface CreateLeagueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
    const [name, setName] = useState("");
    const [startCapital, setStartCapital] = useState(1000);
    const [mode, setMode] = useState<LeagueMode>("ZERO_SUM");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const leagueId = await createLeague(
                user,
                name,
                mode,
                startCapital,
                startDate ? new Date(startDate) : undefined,
                endDate ? new Date(endDate) : undefined
            );
            onClose();
            router.push(`/leagues/${leagueId}`);
        } catch (error) {
            console.error(error);
            // Ideally show toast error here
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Create League</h2>
                            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white drop-shadow-md">League Name</label>
                                <div className="relative">
                                    <Trophy className="absolute left-3 top-3.5 h-5 w-5 text-purple-400" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. The Sunday Gamblers"
                                        className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 pl-10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-white drop-shadow-md">League Mode</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setMode("ZERO_SUM")}
                                        className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${mode === "ZERO_SUM"
                                            ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,255,128,0.2)]"
                                            : "border-white/10 bg-black/20 hover:bg-white/5"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-5 w-5 text-primary" />
                                            <span className="font-bold text-white">Zero Sum</span>
                                        </div>
                                        <p className="text-xs text-white/60">Real stakes simulation. Buy-in, Re-buys, and Bankruptcy.</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setMode("STANDARD")}
                                        className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${mode === "STANDARD"
                                            ? "border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(255,0,255,0.2)]"
                                            : "border-white/10 bg-black/20 hover:bg-white/5"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-secondary" />
                                            <span className="font-bold text-white">Arcade</span>
                                        </div>
                                        <p className="text-xs text-white/60">Points only. Start at 0, climb the leaderboard.</p>
                                    </button>
                                </div>
                            </div>

                            {mode === "ZERO_SUM" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <label className="text-sm font-bold text-white drop-shadow-md">Buy-In Amount</label>
                                    <div className="relative">
                                        <Coins className="absolute left-3 top-3.5 h-5 w-5 text-primary" />
                                        <input
                                            type="number"
                                            required
                                            min={100}
                                            max={100000}
                                            value={startCapital}
                                            onChange={(e) => setStartCapital(parseInt(e.target.value))}
                                            className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 pl-10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-white/40 ml-1">
                                        Initial chips each player starts with.
                                    </p>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white drop-shadow-md">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all [color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white drop-shadow-md">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-green-400 px-6 py-2 text-sm font-bold text-black shadow-[0_0_20px_rgba(0,255,100,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,255,100,0.5)] disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : "Create League"}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
