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

import { createBet } from "@/lib/services/bet-service";
import { generateBulkBets } from "@/app/actions/ai-bet-actions";

export function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
    const [name, setName] = useState("");
    const [startCapital, setStartCapital] = useState(1000);
    const [mode, setMode] = useState<LeagueMode>("ZERO_SUM");
    const [buyInType, setBuyInType] = useState<BuyInType>("FIXED");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // AI Auto-Fill
    const [useAi, setUseAi] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiTimeframe, setAiTimeframe] = useState("Upcoming"); // Default

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const { user } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setLoadingMessage("Creating League...");

        try {
            // 1. Create League
            const leagueId = await createLeague(
                user,
                name,
                mode,
                startCapital,
                buyInType,
                startDate ? new Date(startDate) : undefined,
                endDate ? new Date(endDate) : undefined
            );

            // 2. AI Population
            if (useAi && aiTopic.trim()) {
                setLoadingMessage("🤖 AI is generating schedule...");
                // Pass user defined timeframe
                const bets = await generateBulkBets(aiTopic, aiTimeframe || "Upcoming", "MATCH");

                if (Array.isArray(bets) && bets.length > 0) {
                    setLoadingMessage(`Creating ${bets.length} bets...`);
                    for (const bet of bets) {
                        const date = bet.date ? new Date(bet.date) : new Date(Date.now() + 86400000);
                        await createBet(
                            leagueId,
                            user,
                            bet.question,
                            bet.type,
                            date, // closesAt
                            date, // eventDate
                            bet.type === "CHOICE" ? bet.options : undefined,
                            undefined, // range
                            bet.type === "MATCH" ? { home: bet.matchHome, away: bet.matchAway } : undefined
                        );
                    }
                }
            }

            onClose();
            router.push(`/leagues/${leagueId}`);
        } catch (error) {
            console.error(error);
            alert("Failed to create league. See console.");
        } finally {
            setLoading(false);
            setLoadingMessage("");
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
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto"
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

                            {/* AI Auto-Fill Section */}
                            <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
                                <button
                                    type="button"
                                    onClick={() => setUseAi(!useAi)}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${useAi ? "bg-purple-100 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]" : "bg-gray-50 border-gray-200 hover:border-black"}`}
                                >
                                    <div className="text-left">
                                        <p className={`font-black uppercase ${useAi ? "text-purple-700" : "text-gray-500"}`}>✨ AI Auto- Populate</p>
                                        <p className="text-xs font-bold text-gray-400">Instantly fill league with games/events</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${useAi ? "bg-purple-600 border-purple-600" : "border-gray-300 bg-white"}`}>
                                        {useAi && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {useAi && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-2 p-1">
                                                <label className="text-sm font-black uppercase text-purple-800">Topic / League</label>
                                                <input
                                                    type="text"
                                                    value={aiTopic}
                                                    onChange={(e) => setAiTopic(e.target.value)}
                                                    placeholder="e.g. Premier League, NBA..."
                                                    className="flex h-12 w-full rounded-xl border-2 border-purple-200 bg-white px-3 py-2 text-black font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2 p-1">
                                                <label className="text-sm font-black uppercase text-purple-800">Timeframe</label>
                                                <input
                                                    type="text"
                                                    value={aiTimeframe}
                                                    onChange={(e) => setAiTimeframe(e.target.value)}
                                                    placeholder="e.g. Next Week, This Weekend"
                                                    className="flex h-12 w-full rounded-xl border-2 border-purple-200 bg-white px-3 py-2 text-black font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                                    className="px-8 h-12 bg-gradient-to-r from-primary to-green-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg uppercase font-black tracking-widest hover:translate-y-[-2px] transition-all"
                                >
                                    {loading ? (loadingMessage || "Creating...") : "Create League"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
