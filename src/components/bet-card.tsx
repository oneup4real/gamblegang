"use client";

import { Bet, BetType, placeWager, resolveBet } from "@/lib/services/bet-service";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";
import { Coins, Loader2, Gavel } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BetCardProps {
    bet: Bet;
    userPoints: number;
}

export function BetCard({ bet, userPoints }: BetCardProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [wagerAmount, setWagerAmount] = useState<number>(0);
    const [selectedOption, setSelectedOption] = useState<string | number>("");
    const [resolveValue, setResolveValue] = useState<string | number>("");
    const [loading, setLoading] = useState(false);
    const [hasPlaced, setHasPlaced] = useState(false);

    // Quick wager presets
    const presets = [50, 100, 200, 500];
    const isOwner = user?.uid === bet.creatorId;

    const handlePlaceBet = async () => {
        if (!user) return;
        if (wagerAmount <= 0) return alert("Enter a wager amount");
        if (!selectedOption && selectedOption !== 0) return alert("Make a selection");
        if (wagerAmount > userPoints) return alert("Insufficient funds");

        setLoading(true);
        try {
            await placeWager(bet.leagueId, bet.id, user, wagerAmount, selectedOption);
            setHasPlaced(true);
            setIsExpanded(false);
            // Ideally trigger a refresh of parent data (points update)
        } catch (e) {
            alert("Error placing bet. See console.");
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!user) return;
        if (!resolveValue && resolveValue !== 0) return alert("Select a result");

        if (!confirm("Are you sure? This will trigger payouts and cannot be undone.")) return;

        setLoading(true);
        try {
            await resolveBet(bet.leagueId, bet.id, user, resolveValue);
            alert("Bet resolved!");
            setIsResolving(false);
            setIsExpanded(false);
            window.location.reload(); // Simple reload to refresh state for now
        } catch (e) {
            console.error(e);
            alert("Error resolving bet");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`rounded-lg border bg-card shadow-sm transition-all hover:border-primary/50 relative overflow-hidden ${bet.status === "RESOLVED" ? "opacity-75" : ""}`}>
            {bet.status === "RESOLVED" && (
                <div className="absolute top-0 right-0 p-2 bg-green-500 text-white text-xs font-bold rounded-bl-lg z-10">
                    RESOLVED
                </div>
            )}

            <div
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-start pr-8">
                    <h3 className="font-semibold text-lg">{bet.question}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${bet.status === "OPEN" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {bet.status}
                    </span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                    <span>Pool: {bet.totalPool} pts</span>
                    <span>Ends: {new Date(bet.closesAt?.seconds * 1000).toLocaleDateString()}</span>
                </div>
                {bet.status === "RESOLVED" && (
                    <div className="mt-2 text-sm font-medium text-green-600">
                        Winner: {bet.type === "CHOICE" ? bet.options?.find(o => o.id === String(bet.winningOutcome))?.text : bet.winningOutcome}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && !hasPlaced && bet.status === "OPEN" && !isResolving && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t bg-accent/5 px-4 pb-4 overflow-hidden"
                    >
                        <div className="pt-4 space-y-4">
                            {bet.type === "CHOICE" && bet.options ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {bet.options.map(opt => {
                                        // Calculate live odds
                                        const odds = opt.totalWagered > 0
                                            ? (bet.totalPool / opt.totalWagered).toFixed(2)
                                            : "-"; // No odds yet or "Infinite"

                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSelectedOption(opt.id)}
                                                className={`p-2 text-sm rounded-md border transition-all flex justify-between items-center ${selectedOption === opt.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                                            >
                                                <span>{opt.text}</span>
                                                <span className="font-mono text-xs opacity-80 bg-black/20 px-1 rounded">x{odds}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm">Your Prediction ({bet.rangeUnit})</label>
                                    <input
                                        type="number"
                                        className="flex h-9 w-full rounded-md border bg-background px-3"
                                        min={bet.rangeMin}
                                        max={bet.rangeMax}
                                        onChange={(e) => setSelectedOption(Number(e.target.value))}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-yellow-500" />
                                    Wager Amount (Max: {userPoints})
                                </label>
                                <div className="flex gap-2 mb-2">
                                    {presets.map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setWagerAmount(amt)}
                                            className="text-xs border rounded-full px-3 py-1 hover:bg-secondary"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={wagerAmount}
                                    onChange={(e) => setWagerAmount(Number(e.target.value))}
                                    className="flex h-10 w-full rounded-md border bg-background px-3"
                                    placeholder="Custom Amount"
                                />
                                {wagerAmount > 0 && selectedOption && bet.type === "CHOICE" && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Est. Return: <span className="text-green-500 font-bold">~{
                                            (wagerAmount * (bet.totalPool + wagerAmount) / ((bet.options?.find(o => o.id === selectedOption)?.totalWagered || 0) + wagerAmount)).toFixed(0)
                                        } pts</span>
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handlePlaceBet}
                                disabled={loading}
                                className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
                                Place Wager
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Owner Resolution UI */}
                {isExpanded && isOwner && bet.status === "OPEN" && (
                    <div className="p-4 border-t bg-yellow-500/5">
                        {!isResolving ? (
                            <button
                                onClick={() => setIsResolving(true)}
                                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-yellow-600 hover:underline"
                            >
                                <Gavel className="h-4 w-4" /> Resolve / End Bet
                            </button>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-sm font-bold text-yellow-600">Select Winning Outcome</p>
                                {bet.type === "CHOICE" && bet.options ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {bet.options.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setResolveValue(opt.id)}
                                                className={`p-2 text-sm rounded-md border transition-all ${resolveValue === opt.id ? "bg-yellow-500 text-white border-yellow-600" : "bg-background"}`}
                                            >
                                                {opt.text}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        placeholder="Winning Number"
                                        className="flex h-9 w-full rounded-md border bg-background px-3"
                                        onChange={(e) => setResolveValue(Number(e.target.value))}
                                    />
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
                        )}
                    </div>
                )}

                {hasPlaced && (
                    <div className="p-4 bg-green-500/10 text-green-500 text-sm text-center font-medium">
                        Wager Placed! Good Luck.
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
