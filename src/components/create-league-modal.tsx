"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Coins, Calendar } from "lucide-react";
import { createLeague, LeagueMode, BuyInType } from "@/lib/services/league-service";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CreateLeagueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
    const [name, setName] = useState("");
    const [startCapital, setStartCapital] = useState(1000);
    const [mode, setMode] = useState<LeagueMode>("ZERO_SUM");
    const [buyInType, setBuyInType] = useState<BuyInType>("FIXED");
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
                buyInType,
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
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black tracking-tight font-comic uppercase">Create League</h2>
                            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-black uppercase">League Name</label>
                                <div className="relative">
                                    <Trophy className="absolute left-3 top-3.5 h-5 w-5 text-black" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. The Sunday Gamblers"
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 pl-10 text-lg font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-black uppercase">League Mode</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setMode("ZERO_SUM")}
                                        className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${mode === "ZERO_SUM"
                                            ? "border-black bg-blue-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-400"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Coins className={`h-5 w-5 ${mode === "ZERO_SUM" ? "text-blue-600" : "text-gray-400"}`} />
                                            <span className={`font-black ${mode === "ZERO_SUM" ? "text-blue-900" : "text-gray-500"}`}>Zero Sum</span>
                                        </div>
                                        <p className="text-xs font-bold leading-tight">Real stakes simulation. Buy-in, Re-buys.</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setMode("STANDARD")}
                                        className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${mode === "STANDARD"
                                            ? "border-black bg-purple-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-400"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Trophy className={`h-5 w-5 ${mode === "STANDARD" ? "text-purple-600" : "text-gray-400"}`} />
                                            <span className={`font-black ${mode === "STANDARD" ? "text-purple-900" : "text-gray-500"}`}>Arcade</span>
                                        </div>
                                        <p className="text-xs font-bold leading-tight">Points only. Climb the leaderboard.</p>
                                    </button>
                                </div>
                            </div>

                            {mode === "ZERO_SUM" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-black uppercase">Buy-In Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setBuyInType("FIXED")}
                                                className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${buyInType === "FIXED"
                                                        ? "border-black bg-green-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span className={`font-black text-sm ${buyInType === "FIXED" ? "text-green-900" : "text-gray-500"}`}>
                                                    💰 Fixed
                                                </span>
                                                <p className="text-[10px] font-bold leading-tight text-gray-600">
                                                    Everyone gets starting capital
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBuyInType("FLEXIBLE")}
                                                className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${buyInType === "FLEXIBLE"
                                                        ? "border-black bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span className={`font-black text-sm ${buyInType === "FLEXIBLE" ? "text-yellow-900" : "text-gray-500"}`}>
                                                    🔓 Flexible
                                                </span>
                                                <p className="text-[10px] font-bold leading-tight text-gray-600">
                                                    Start at 0, buy points anytime
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    <label className="text-sm font-black uppercase">{buyInType === "FIXED" ? "Starting Capital" : "Rebuy Unit"}</label>
                                    <div className="relative">
                                        <Coins className="absolute left-3 top-3.5 h-5 w-5 text-black" />
                                        <input
                                            type="number"
                                            required
                                            min={100}
                                            max={100000}
                                            value={startCapital}
                                            onChange={(e) => setStartCapital(parseInt(e.target.value))}
                                            className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 pl-10 text-lg font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 ml-1">
                                        Initial chips each player starts with.
                                    </p>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-black font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 h-12 bg-gradient-to-r from-primary to-green-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg"
                                >
                                    {loading ? "Creating..." : "Create League"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
