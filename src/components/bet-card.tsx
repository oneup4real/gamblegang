"use client";

import { Bet, BetType, placeWager, resolveBet, calculateOdds, getReturnPotential, Wager, startProofing, confirmVerification } from "@/lib/services/bet-service";
import { verifyBetResult } from "@/app/actions/ai-bet-actions";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";
import { Coins, Loader2, Gavel, Wallet, Trophy, BrainCircuit, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BetCardProps {
    bet: Bet;
    userPoints: number;
    userWager?: Wager;
    mode: "ZERO_SUM" | "STANDARD";
}

export function BetCard({ bet, userPoints, userWager, mode }: BetCardProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [wagerAmount, setWagerAmount] = useState<number>(mode === "STANDARD" ? 100 : 0);
    const [selectedOption, setSelectedOption] = useState<string | number>(""); // For CHOICE bets
    const [rangeValue, setRangeValue] = useState<number | "">(""); // For RANGE bets
    const [winningOption, setWinningOption] = useState<string | number>(""); // For CHOICE resolution
    const [winningRange, setWinningRange] = useState<number | "">(""); // For RANGE resolution

    const [resolveValue, setResolveValue] = useState<string | number>("");
    const [loading, setLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    // Quick wager presets
    // State for Match Wager
    const [matchHome, setMatchHome] = useState<number | "">("");
    const [matchAway, setMatchAway] = useState<number | "">("");

    // State for Match Resolution
    const [resHome, setResHome] = useState<number | "">("");
    const [resAway, setResAway] = useState<number | "">("");

    const isExpired = new Date(bet.closesAt.seconds * 1000) < new Date();
    const isOwner = user?.uid === bet.creatorId;

    // Helper to format selection for display
    const formatSelection = (sel: string | number | { home: number, away: number }) => {
        if (typeof sel === "object" && sel !== null && "home" in sel) {
            return `${sel.home} - ${sel.away}`;
        }
        if (bet.type === "CHOICE" && bet.options) {
            const opt = bet.options[Number(sel)];
            return opt ? opt.text : sel;
        }
        return sel;
    }


    const handleAiverify = async () => {
        setVerifying(true);
        try {
            const suggestion = await verifyBetResult(bet.question, bet.matchDetails);
            setAiSuggestion(suggestion);
        } catch (e) {
            console.error(e);
            alert("AI Verification Failed");
        } finally {
            setVerifying(false);
        }
    };

    const handleStartProofing = async () => {
        if (!user || !aiSuggestion) return;
        setLoading(true);
        try {
            await startProofing(bet.leagueId, bet.id, user, aiSuggestion);
            alert("Proofing started! 24h timer set.");
            setAiSuggestion(null);
        } catch (e) {
            console.error(e);
            alert("Failed to start proofing");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmVerification = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await confirmVerification(bet.leagueId, bet.id, user);
            alert("Verification Confirmed! Ready to resolve.");
        } catch (e) {
            console.error(e);
            alert("Failed to confirm");
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceWager = async () => {
        if (!user) return;
        // Validation: If Zero Sum, check balance. If Standard, ignore.
        if (mode === "ZERO_SUM") {
            if (userPoints < wagerAmount || wagerAmount <= 0) return alert("Insufficient points or invalid amount");
        }

        let prediction: string | number | { home: number, away: number } = selectedOption;

        if (bet.type === "RANGE") {
            prediction = Number(rangeValue);
        } else if (bet.type === "MATCH") {
            if (matchHome === "" || matchAway === "") return;
            prediction = { home: Number(matchHome), away: Number(matchAway) };
        } else if (bet.type === "CHOICE") {
            if (selectedOption === "") return;
            prediction = selectedOption;
        } else {
            return alert("Invalid bet type or selection.");
        }

        setLoading(true);
        try {
            // For Standard mode, we just pass 100 or whatever, backend forces it to 100 anyway.
            await placeWager(bet.leagueId, bet.id, user, mode === "STANDARD" ? 100 : wagerAmount, prediction as any);
            if (mode === "ZERO_SUM") setWagerAmount(0);
            setSelectedOption("");
            setRangeValue("");
            setMatchHome("");
            setMatchAway("");
            alert("Wager placed!");
        } catch (error) {
            console.error(error);
            alert("Failed to place wager");
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!user || !isOwner) return;

        let outcome: string | number | { home: number, away: number } = winningOption;

        if (bet.type === "RANGE") {
            outcome = Number(winningRange);
        } else if (bet.type === "MATCH") {
            if (resHome === "" || resAway === "") return;
            outcome = { home: Number(resHome), away: Number(resAway) };
        } else if (bet.type === "CHOICE") {
            if (winningOption === "") return;
            outcome = winningOption;
        } else {
            return alert("Invalid bet type or resolution value.");
        }

        if (!confirm("Are you sure? This cannot be undone.")) return;

        setLoading(true);
        try {
            const result = await resolveBet(bet.leagueId, bet.id, user, outcome);
            alert(`Resolved! ${result.winnerCount} winners.`);
        } catch (error) {
            console.error(error);
            alert("Failed to resolve bet");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="glass rounded-xl p-6 relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider shadow-sm ${bet.status === "OPEN" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                        bet.status === "RESOLVED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                            bet.status === "PROOFING" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                                "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                        }`}>
                        {bet.status} • {bet.type}
                    </span>
                    <h3 className="mt-3 text-xl font-bold text-white drop-shadow-md">{bet.question}</h3>
                    {bet.type === "MATCH" && bet.matchDetails && (
                        <p className="text-sm text-primary font-medium mt-1">
                            {bet.matchDetails.homeTeam} vs {bet.matchDetails.awayTeam} • {new Date(bet.matchDetails.date).toLocaleDateString()}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                        Pool: {bet.totalPool} pts • Closes {new Date(bet.closesAt.seconds * 1000).toLocaleDateString()}
                    </p>
                </div>
                {bet.status === "RESOLVED" && <Trophy className="h-6 w-6 text-yellow-500" />}
            </div>

            {/* If Resolved, show outcome */}
            {bet.status === "RESOLVED" && (
                <div className="mb-6 rounded-lg bg-muted/50 p-4 border border-border/50">
                    <p className="text-sm font-medium text-muted-foreground">Winning Outcome</p>
                    <p className="text-xl font-bold mt-1 text-primary">
                        {bet.type === "MATCH" && typeof bet.winningOutcome === "object" && bet.winningOutcome !== null && "home" in bet.winningOutcome
                            ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                            : String(bet.winningOutcome)}
                    </p>
                    {userWager && userWager.status === "WON" && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-3 flex items-center gap-2 text-green-500"
                        >
                            <span className="font-bold">You Won +{userWager.payout} pts!</span>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Wager Input Section for OPEN bets */}
            {bet.status === "OPEN" && !isExpired && !userWager && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-medium text-purple-200">
                            {mode === "ZERO_SUM" ? `My Points: ${userPoints}` : "Arcade Mode: Free Entry"}
                        </span>
                    </div>

                    {/* CHOICE BETS */}
                    {bet.type === "CHOICE" && bet.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {bet.options.map((opt, idx) => {
                                const odds = calculateOdds(bet.totalPool, opt.totalWagered);
                                // For standard mode, assume wagerAmount is 100 for potential calculation
                                const calcWager = mode === "STANDARD" ? 100 : wagerAmount;
                                const potential = calcWager > 0
                                    ? getReturnPotential(calcWager, bet.totalPool + calcWager, opt.totalWagered + calcWager).toFixed(0)
                                    : (1.0 * (Number(odds) || 1) * 10).toFixed(0);

                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSelectedOption(String(idx))}
                                        className={`relative flex flex-col items-start rounded-lg border p-3 text-left transition-all duration-300 ${selectedOption === String(idx)
                                            ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,255,128,0.3)] scale-[1.02]"
                                            : "border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20"
                                            }`}
                                    >
                                        <span className="font-bold text-sm tracking-wide text-white">{opt.text}</span>
                                        <div className="mt-2 flex w-full items-center justify-between text-xs text-muted-foreground">
                                            <span className="font-mono text-purple-300">{odds}x</span>
                                            {selectedOption === String(idx) && (
                                                <span className="text-primary font-bold text-shadow-neon">Est. Pts: {potential}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* RANGE BETS */}
                    {bet.type === "RANGE" && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-purple-200">Your Prediction ({bet.rangeMin} - {bet.rangeMax} {bet.rangeUnit})</label>
                            <input
                                type="number"
                                value={rangeValue}
                                onChange={(e) => setRangeValue(Number(e.target.value))}
                                className="flex h-12 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all"
                                placeholder={`Enter number (${bet.rangeMin}-${bet.rangeMax})`}
                            />
                        </div>
                    )}

                    {/* MATCH BETS */}
                    {bet.type === "MATCH" && (
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-purple-200">Predict Score</label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 text-center">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                                        {bet.matchDetails?.homeTeam || "Home"}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={matchHome}
                                        onChange={(e) => setMatchHome(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="h-14 w-full rounded-xl border border-white/10 bg-black/30 text-center text-2xl font-black text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    />
                                </div>
                                <span className="text-2xl font-bold text-white/20">-</span>
                                <div className="flex-1 text-center">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                                        {bet.matchDetails?.awayTeam || "Away"}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={matchAway}
                                        onChange={(e) => setMatchAway(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="h-14 w-full rounded-xl border border-white/10 bg-black/30 text-center text-2xl font-black text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-center gap-4 text-[10px] text-zinc-400 font-mono uppercase tracking-tight">
                                <span>Exact: x5 Share</span>
                                <span>Diff: x3 Share</span>
                                <span>Winner: x1 Share</span>
                            </div>
                        </div>
                    )}

                    {mode === "ZERO_SUM" && (
                        <div className="flex items-center gap-4 pt-4">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-3.5 text-purple-500 text-xs font-black">PTS</span>
                                <input
                                    type="number"
                                    value={wagerAmount}
                                    onChange={(e) => setWagerAmount(Number(e.target.value))}
                                    className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 py-2 text-lg font-bold text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                                    placeholder="Wager"
                                    min="1"
                                    max={userPoints}
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePlaceWager}
                                disabled={loading}
                                className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-green-400 px-8 text-sm font-bold text-black shadow-[0_0_20px_rgba(0,255,100,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,255,100,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Place Bet
                            </motion.button>
                        </div>
                    )}

                    {mode === "STANDARD" && (
                        <div className="pt-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePlaceWager}
                                disabled={loading}
                                className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-secondary to-pink-500 px-8 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,0,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(255,0,255,0.5)] disabled:opacity-50"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Lock In Prediction (Free)
                            </motion.button>
                        </div>
                    )}

                </div>
            )}

            {/* My Wager Display if already placed */}
            {userWager && (
                <div className="mt-4 rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Your Wager</p>
                            <p className="font-bold text-foreground">
                                {formatSelection(userWager.selection)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-muted-foreground">Amount</p>
                            <p className="font-bold">{userWager.amount} pts</p>
                        </div>
                    </div>
                </div>
            )}

            {/* OWNER RESOLUTION UI */}
            {isOwner && bet.status === "OPEN" && !isExpired && (
                <div className="mt-8 pt-6 border-t border-border border-dashed">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-4">Owner Controls</p>

                    <div className="space-y-4">
                        {bet.type === "CHOICE" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {bet.options?.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setWinningOption(String(bet.options?.findIndex(o => o.id === opt.id)))}
                                        className={`p-2 text-sm rounded-md border transition-all ${winningOption === String(bet.options?.findIndex(o => o.id === opt.id)) ? "bg-yellow-500 text-white border-yellow-600" : "bg-background"}`}
                                    >
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        ) : bet.type === "RANGE" ? (
                            <input
                                type="number"
                                value={winningRange}
                                onChange={(e) => setWinningRange(e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder={`Correct Value (${bet.rangeMin}-${bet.rangeMax})`}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Home Score</label>
                                    <input
                                        type="number"
                                        value={resHome}
                                        onChange={(e) => setResHome(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-center"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Away Score</label>
                                    <input
                                        type="number"
                                        value={resAway}
                                        onChange={(e) => setResAway(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-center"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleResolve}
                                disabled={loading}
                                className="flex-1 rounded-md bg-yellow-600 py-2 text-sm font-medium text-white shadow hover:bg-yellow-700"
                            >
                                {loading ? "Processing..." : "Confirm & Payout"}
                            </button>
                            <button
                                onClick={() => setIsResolving(false)}
                                className="px-4 text-sm hover:underline"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
