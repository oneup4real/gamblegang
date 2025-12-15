"use client";

import { Bet, BetType, placeWager, resolveBet, calculateOdds, getReturnPotential, Wager, startProofing, confirmVerification, publishBet, disputeBetResult, voteOnDisputedBet, markBetInvalidAndRefund, checkDisputeVoting } from "@/lib/services/bet-service";
import { aiAutoResolveBet, verifyBetResult } from "@/app/actions/ai-bet-actions";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";
import { Coins, Loader2, Gavel, Wallet, Trophy, BrainCircuit, CheckCircle, AlertTriangle, Timer, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CoinFlow } from "@/components/animations/coin-flow";
import { BetTicketAnimation } from "@/components/animations/bet-ticket-animation";
import { BetTicket } from "@/components/bet-ticket";
import { AllInModal } from "@/components/all-in-modal";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface BetCardProps {
    bet: Bet;
    userPoints: number;
    userWager?: Wager;
    mode: "ZERO_SUM" | "STANDARD";
    onEdit?: (bet: Bet) => void;
    onWagerSuccess?: () => void;
}

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function BetCard({ bet, userPoints, userWager, mode, onEdit, onWagerSuccess }: BetCardProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [wagerAmount, setWagerAmount] = useState<number | "">(mode === "STANDARD" ? 100 : "");
    const [selectedOption, setSelectedOption] = useState<string | number>(""); // For CHOICE bets
    const [rangeValue, setRangeValue] = useState<number | "">(""); // For RANGE bets
    const [winningOption, setWinningOption] = useState<string | number>(""); // For CHOICE resolution
    const [winningRange, setWinningRange] = useState<number | "">(""); // For RANGE resolution

    const [resolveValue, setResolveValue] = useState<string | number>("");
    const [loading, setLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [showCoinFlow, setShowCoinFlow] = useState(false);
    const [showAllInModal, setShowAllInModal] = useState(false);
    const [pendingWagerData, setPendingWagerData] = useState<{ amount: number, prediction: any } | null>(null);
    const [lastWager, setLastWager] = useState<{ amount: number, potential: string, selectionDisplay: string } | null>(null);
    const [userVote, setUserVote] = useState<"approve" | "reject" | null>(bet.votes?.[user?.uid || ""] || null);
    const [votingLoading, setVotingLoading] = useState(false);
    const [disputeLoading, setDisputeLoading] = useState(false);
    const [aiResolving, setAiResolving] = useState(false);
    const [aiHighlighted, setAiHighlighted] = useState(false);

    useEffect(() => {
        if (userWager && userWager.status === "WON") {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }, [userWager]);

    // Dynamic Odds Calculation for Match/Range (Zero Sum)
    const [dynamicMatchOdds, setDynamicMatchOdds] = useState<{ [key: string]: string }>({});
    const [dynamicRangeOdds, setDynamicRangeOdds] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        if (mode === "ZERO_SUM" && (bet.type === "MATCH" || bet.type === "RANGE") && bet.status === "OPEN") {
            const fetchWagersForOdds = async () => {
                const wagersRef = collection(db, "leagues", bet.leagueId, "bets", bet.id, "wagers");
                const snap = await getDocs(wagersRef);
                const wagers = snap.docs.map(d => d.data() as Wager);

                if (bet.type === "MATCH") {
                    const pools: { [key: string]: number } = {};
                    wagers.forEach(w => {
                        const sel = w.selection as { home: number, away: number };
                        const key = `${sel.home}-${sel.away}`;
                        pools[key] = (pools[key] || 0) + w.amount;
                    });
                    const odds: { [key: string]: string } = {};
                    Object.keys(pools).forEach(k => {
                        odds[k] = calculateOdds(bet.totalPool, pools[k]);
                    });
                    setDynamicMatchOdds(odds);
                } else if (bet.type === "RANGE") {
                    const pools: { [key: number]: number } = {};
                    wagers.forEach(w => {
                        const val = Number(w.selection);
                        pools[val] = (pools[val] || 0) + w.amount;
                    });
                    const odds: { [key: number]: string } = {};
                    Object.keys(pools).forEach(k => {
                        odds[Number(k)] = calculateOdds(bet.totalPool, pools[Number(k)]);
                    });
                    setDynamicRangeOdds(odds);
                }
            };
            fetchWagersForOdds();
        }
    }, [bet, mode]);

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
            if (userPoints < (Number(wagerAmount) || 0) || (Number(wagerAmount) || 0) <= 0) return alert("Insufficient points or invalid amount");
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

        const amount = mode === "STANDARD" ? 0 : Number(wagerAmount);

        // Check if player is going ALL-IN (betting everything they have)
        if (mode === "ZERO_SUM" && amount >= userPoints && amount > 0) {
            // Save wager data and show confirmation modal
            setPendingWagerData({ amount, prediction });
            setShowAllInModal(true);
            return;
        }

        // Proceed with normal wager
        await executePlaceWager(amount, prediction);
    };

    const executePlaceWager = async (amount: number, prediction: any) => {
        setLoading(true);
        try {
            await placeWager(bet.leagueId, bet.id, user!, amount, prediction as any);
            // Prepare ticket data
            let selectionDisplay = String(prediction);
            let potentialDisplay = "TBD";

            if (bet.type === "CHOICE" && bet.options) {
                const idx = Number(prediction);
                selectionDisplay = bet.options[idx]?.text || "Option";
                // Estimate based on current odds (approx)
                if (bet.options[idx].totalWagered > 0) {
                    const odds = bet.totalPool / bet.options[idx].totalWagered;
                    potentialDisplay = `~${(amount * odds).toFixed(0)} pts`;
                }
            } else if (bet.type === "MATCH") {
                selectionDisplay = `${prediction.home} - ${prediction.away}`;
                potentialDisplay = "High Return"; // Dynamic
            } else if (bet.type === "RANGE") {
                selectionDisplay = `${prediction} ${bet.rangeUnit || ""}`;
            }

            setLastWager({
                amount,
                selectionDisplay,
                potential: potentialDisplay
            });

            if (mode === "ZERO_SUM") setWagerAmount("");
            setSelectedOption("");
            setRangeValue("");
            setMatchHome("");
            setMatchAway("");
            setShowCoinFlow(true);
            if (onWagerSuccess) {
                setTimeout(() => onWagerSuccess(), 1500); // Delay refresh to let animation play
            }
        } catch (error) {
            console.error(error);
            alert("Failed to place wager");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!user || !isOwner) return;
        setLoading(true);
        try {
            await publishBet(bet.leagueId, bet.id);
            alert("Bet Published! It is now live.");
        } catch (error) {
            console.error(error);
            alert("Failed to publish bet");
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

    const handleDispute = async () => {
        if (!user) return;
        if (!confirm("Are you sure you want to dispute this result? This will trigger a vote among all players.")) return;

        setDisputeLoading(true);
        try {
            await disputeBetResult(bet.leagueId, bet.id, user.uid);
            alert("Dispute filed! Voting has begun.");
            if (onWagerSuccess) onWagerSuccess();
        } catch (error: any) {
            alert(error.message || "Failed to dispute bet");
        } finally {
            setDisputeLoading(false);
        }
    };

    const handleVote = async (vote: "approve" | "reject") => {
        if (!user) return;

        setVotingLoading(true);
        try {
            await voteOnDisputedBet(bet.leagueId, bet.id, user.uid, vote);
            setUserVote(vote);
            alert(`Vote recorded: ${vote === "approve" ? "✅ Approved" : "❌ Rejected"}`);
            if (onWagerSuccess) onWagerSuccess();
        } catch (error: any) {
            alert(error.message || "Failed to vote");
        } finally {
            setVotingLoading(false);
        }
    };

    const handleMarkInvalid = async () => {
        if (!confirm("Mark this bet as INVALID? All players will be refunded. This cannot be undone.")) return;

        setLoading(true);
        try {
            await markBetInvalidAndRefund(bet.leagueId, bet.id);
            alert("Bet marked as INVALID. All wagers have been refunded.");
            if (onWagerSuccess) onWagerSuccess();
        } catch (error: any) {
            alert(error.message || "Failed to mark bet invalid");
        } finally {
            setLoading(false);
        }
    };

    const getDisputeTimeRemaining = () => {
        if (!bet.disputeDeadline) return null;
        const deadline = bet.disputeDeadline.toDate();
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();

        if (diff <= 0) return "Expired";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    };

    const handleAIResolve = async () => {
        setAiResolving(true);
        try {
            const result = await aiAutoResolveBet(bet);
            if (!result) {
                alert("AI couldn't determine the result. Please enter manually.");
                return;
            }

            // Prefill based on type
            if (result.type === "MATCH") {
                setResHome(result.home);
                setResAway(result.away);
            } else if (result.type === "CHOICE") {
                setWinningOption(String(result.optionIndex));
            } else if (result.type === "RANGE") {
                setWinningRange(result.value);
            }

            // Trigger animation
            setAiHighlighted(true);
            setTimeout(() => setAiHighlighted(false), 3000);

            alert("✅ Result found and filled by AI!");
        } catch (error: any) {
            alert(error.message || "AI resolution failed");
        } finally {
            setAiResolving(false);
        }
    };


    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, rotate: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-xl border-2 border-black bg-white p-6 relative comic-shadow mb-6"
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <span className={`inline-flex items-center border-2 border-black rounded-lg px-2 py-0.5 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${bet.status === "RESOLVED" ? "bg-blue-400 text-black" :
                        bet.status === "PROOFING" ? "bg-yellow-400 text-black" :
                            bet.status === "DISPUTED" ? "bg-orange-500 text-white animate-pulse" :
                                bet.status === "INVALID" ? "bg-gray-400 text-black" :
                                    bet.status === "DRAFT" ? "bg-gray-300 text-gray-800 border-dashed" :
                                        isExpired ? "bg-red-400 text-black" :
                                            "bg-green-400 text-black pb-1"
                        }`}>
                        {bet.status === "INVALID" ? "♻️ INVALID (REFUNDED)" :
                            bet.status === "OPEN" && isExpired ? "LOCKED" :
                                bet.status} • {bet.type}
                    </span>

                    {/* Dispute Timer */}
                    {bet.disputeDeadline && !bet.disputeActive && bet.status === "PROOFING" && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-orange-600">
                            <Timer className="h-4 w-4" />
                            Dispute Period: {getDisputeTimeRemaining()} remaining
                        </div>
                    )}
                    <h3 className="mt-3 text-xl font-bold font-comic text-black leading-tight max-w-[90%]">{bet.question}</h3>
                    {bet.type === "MATCH" && bet.matchDetails && (
                        <p className="text-sm text-blue-600 font-black mt-1 uppercase tracking-tight">
                            {bet.matchDetails.homeTeam} vs {bet.matchDetails.awayTeam} • {new Date(bet.matchDetails.date).toLocaleDateString()}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 font-bold">
                        {mode === "ZERO_SUM"
                            ? `Total Pot: ${bet.totalPool} pts`
                            : `Total Bets: ${bet.wagerCount || 0}`}
                        {bet.eventDate && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 px-1 border border-black rounded-md">
                                Kick-off: {new Date(bet.eventDate.seconds * 1000).toLocaleString()}
                            </span>
                        )}
                        <span className="block mt-1 text-red-600">
                            Betting Closes: {new Date(bet.closesAt.seconds * 1000).toLocaleString()}
                        </span>
                    </p>
                </div>
                {bet.status === "RESOLVED" && <Trophy className="h-8 w-8 text-yellow-500 fill-yellow-500 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" />}
            </div>

            {/* If Resolved, show outcome */}
            {bet.status === "RESOLVED" && (
                <div className="mb-6 rounded-lg bg-blue-50 p-4 border-2 border-black border-dashed">
                    <p className="text-sm font-black text-blue-600 uppercase">Winning Outcome</p>
                    <p className="text-2xl font-black mt-1 text-black">
                        {bet.type === "MATCH" && typeof bet.winningOutcome === "object" && bet.winningOutcome !== null && "home" in bet.winningOutcome
                            ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                            : String(bet.winningOutcome)}
                    </p>
                    {userWager && userWager.status === "WON" && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-3 flex items-center gap-2 text-green-600 font-black text-lg"
                        >
                            <CheckCircle className="h-5 w-5 fill-green-600 text-white" />
                            <span>You Won +{userWager.payout} pts!</span>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Active Wager Ticket */}
            {userWager && (
                <div className="mb-6 flex justify-center">
                    {(() => {
                        let sel = String(userWager.selection);
                        let pot = "Pending";
                        if (bet.type === "CHOICE" && bet.options) {
                            const idx = Number(userWager.selection);
                            sel = bet.options[idx]?.text || "Option";
                            if (bet.options[idx].totalWagered > 0) {
                                const odds = bet.totalPool / bet.options[idx].totalWagered;
                                pot = `~${(userWager.amount * odds).toFixed(0)} pts`;
                            }
                        } else if (bet.type === "MATCH" && typeof userWager.selection === "object") {
                            // Assuming local shape might differ from strict TS types if using 'any' in places
                            const s = userWager.selection as any;
                            sel = `${s.home} - ${s.away}`;
                            // Use basic 2.0x calculation for display with asterisk
                            pot = `~${(userWager.amount * 2).toFixed(0)} pts*`;
                        } else if (bet.type === "RANGE") {
                            sel = `${userWager.selection} ${bet.rangeUnit || ""}`;
                        }

                        return (
                            <BetTicket
                                amount={userWager.amount}
                                selectionDisplay={sel}
                                potential={pot}
                                explanation={pot.includes("*") ? "* Odds fluctuate based on total pool distribution" : undefined}
                            />
                        );
                    })()}
                </div>
            )}

            {/* Wager Input Section for OPEN bets */}
            {bet.status === "OPEN" && !isExpired && !userWager && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 p-2 bg-purple-100 border-2 border-black rounded-lg w-max">
                        <Wallet className="h-4 w-4 text-black" />
                        <span className="text-xs font-bold text-black uppercase">
                            {mode === "ZERO_SUM" ? `Your Points: ${userPoints}` : "Arcade Mode: Free Entry"}
                        </span>
                    </div>

                    {/* CHOICE BETS */}
                    {bet.type === "CHOICE" && bet.options && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {bet.options.map((opt, idx) => {
                                    const odds = calculateOdds(bet.totalPool, opt.totalWagered);
                                    // For standard mode, assume wagerAmount is 100 for potential calculation
                                    const calcWager = mode === "STANDARD" ? 100 : (Number(wagerAmount) || 0);
                                    const potential = calcWager > 0
                                        ? getReturnPotential(calcWager, bet.totalPool + calcWager, opt.totalWagered + calcWager).toFixed(0)
                                        : (1.0 * (Number(odds) || 1) * 10).toFixed(0);

                                    // Calculate precise percentage of pool (excluding current hypothetical wager for display stability)
                                    const percentage = bet.totalPool > 0 ? Math.round((opt.totalWagered / bet.totalPool) * 100) : 0;

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSelectedOption(String(idx))}
                                            className={`relative overflow-hidden flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${selectedOption === String(idx)
                                                ? "border-black bg-white ring-2 ring-primary ring-offset-2" // Selected needs highlight
                                                : "border-black bg-white hover:bg-gray-50"
                                                }`}
                                        >
                                            {/* Progress Bar Background */}
                                            <div
                                                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out z-0 ${selectedOption === String(idx) ? "bg-primary/20" : "bg-gray-100"}`}
                                                style={{ width: `${percentage}%` }}
                                            />

                                            <div className="relative z-10 w-full">
                                                <div className="flex justify-between items-start w-full">
                                                    <span className="font-bold text-sm tracking-wide text-black">{opt.text}</span>
                                                    <span className="text-xs font-black text-gray-400">{percentage}%</span>
                                                </div>
                                                <div className="mt-2 text-xs">
                                                    {mode === "ZERO_SUM" ? (
                                                        <div className="flex items-center justify-between bg-yellow-200/50 p-1 rounded border border-black/20">
                                                            <div className="flex flex-col leading-none">
                                                                <span className="text-[9px] uppercase font-bold text-gray-500">Dynamic Odds</span>
                                                                <span className="font-black text-sm">{odds}x</span>
                                                            </div>
                                                            <div className="flex flex-col items-end leading-none">
                                                                <span className="text-[9px] uppercase font-bold text-gray-500">Est. Return</span>
                                                                <span className="font-black text-sm">{potential} pts</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-mono font-bold text-black bg-gray-100 px-1 border border-black rounded">{odds}x</span>
                                                            <span className="font-medium text-gray-500">
                                                                Return: <span className="text-black font-bold">{potential}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* RANGE BETS */}
                    {bet.type === "RANGE" && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-black uppercase">Your Prediction ({bet.rangeMin} - {bet.rangeMax} {bet.rangeUnit})</label>
                            <input
                                type="number"
                                value={rangeValue}
                                onChange={(e) => setRangeValue(Number(e.target.value))}
                                className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                placeholder={`Enter number (${bet.rangeMin}-${bet.rangeMax})`}
                            />
                            {mode === "ZERO_SUM" && rangeValue !== "" && (
                                <p className="text-xs font-bold text-gray-500 mt-1 text-right">
                                    Current Odds for {rangeValue}: {dynamicRangeOdds[Number(rangeValue)] || calculateOdds(bet.totalPool, 0)}x
                                </p>
                            )}
                        </div>
                    )}

                    {/* MATCH BETS */}
                    {bet.type === "MATCH" && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-black uppercase">Predict Score</label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 text-center">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">
                                        {bet.matchDetails?.homeTeam || "Home"}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={matchHome}
                                        onChange={(e) => setMatchHome(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="h-14 w-full rounded-xl border-2 border-black bg-white text-center text-3xl font-black text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                                <span className="text-3xl font-black text-black">-</span>
                                <div className="flex-1 text-center">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">
                                        {bet.matchDetails?.awayTeam || "Away"}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={matchAway}
                                        onChange={(e) => setMatchAway(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="h-14 w-full rounded-xl border-2 border-black bg-white text-center text-3xl font-black text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                            </div>
                            {mode === "STANDARD" ? (
                                <div className="flex justify-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                    <span>Exact: x5 Share</span>
                                    <span>Diff: x3 Share</span>
                                    <span>Winner: x1 Share</span>
                                </div>
                            ) : (
                                matchHome !== "" && matchAway !== "" && (
                                    <div className="mt-2 text-center">
                                        <span className="text-xs font-bold bg-yellow-100 px-2 py-1 rounded border border-black text-black">
                                            Current Odds for {matchHome}-{matchAway}: {
                                                (dynamicMatchOdds[`${matchHome}-${matchAway}`] && dynamicMatchOdds[`${matchHome}-${matchAway}`] !== "---")
                                                    ? dynamicMatchOdds[`${matchHome}-${matchAway}`] + "x"
                                                    : (bet.totalPool > 0 ? "Untouched (High Potential)" : "2.00x")
                                            }
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {mode === "ZERO_SUM" && (
                        <div className="flex items-center gap-4 pt-4">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-3.5 text-black font-black text-xs">PTS</span>
                                <input
                                    type="number"
                                    value={wagerAmount}
                                    onChange={(e) => setWagerAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="flex h-12 w-full rounded-xl border-2 border-black bg-white pl-10 pr-3 py-2 text-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    placeholder="Wager"
                                    min="1"
                                    max={userPoints}
                                />
                            </div>
                            <Button
                                onClick={handlePlaceWager}
                                disabled={loading}
                                className="h-12 bg-green-400 hover:bg-green-500 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Place Bet
                            </Button>
                        </div>
                    )}

                    {mode === "STANDARD" && (
                        <div className="pt-4">
                            <Button
                                onClick={handlePlaceWager}
                                disabled={loading}
                                className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Lock In Prediction (Free)
                            </Button>
                        </div>
                    )}

                </div>
            )}



            {/* DISPUTE BUTTON (For Players during dispute period) */}
            {userWager && bet.disputeDeadline && !bet.disputeActive && bet.status === "PROOFING" && new Date() < bet.disputeDeadline.toDate() && (
                <div className="mt-4">
                    <Button
                        onClick={handleDispute}
                        disabled={disputeLoading}
                        className="w-full bg-red-500 text-white border-2 border-black hover:bg-red-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black"
                    >
                        {disputeLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Filing Dispute...
                            </>
                        ) : (
                            "🚨 Dispute This Result"
                        )}
                    </Button>
                </div>
            )}

            {/* VOTING UI (For disputed bets) */}
            {bet.status === "DISPUTED" && userWager && (
                <div className="mt-6 p-4 bg-orange-50 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-black uppercase text-black">⚖️ Vote on Result</h4>
                    </div>

                    {/* Show proposed result */}
                    <div className="mb-3 p-3 bg-white rounded-lg border-2 border-black">
                        <p className="text-xs font-bold text-gray-600 uppercase mb-1">Proposed Result:</p>
                        <p className="font-black text-lg">
                            {bet.winningOutcome ?
                                (bet.type === "MATCH" && typeof bet.winningOutcome === "object" && bet.winningOutcome !== null && "home" in bet.winningOutcome
                                    ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                                    : String(bet.winningOutcome))
                                : "N/A"}
                        </p>
                    </div>

                    {/* Voting buttons or vote status */}
                    {!userVote ? (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <Button
                                onClick={() => handleVote("approve")}
                                disabled={votingLoading}
                                className="bg-green-500 text-white border-2 border-black hover:bg-green-600 font-black"
                            >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Approve
                            </Button>
                            <Button
                                onClick={() => handleVote("reject")}
                                disabled={votingLoading}
                                className="bg-red-500 text-white border-2 border-black hover:bg-red-600 font-black"
                            >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center p-3 bg-white border-2 border-black rounded-lg mb-3">
                            <p className="font-black">
                                Your vote: {userVote === "approve" ? "✅ Approved" : "❌ Rejected"}
                            </p>
                        </div>
                    )}

                    {/* Vote count */}
                    <p className="text-xs text-gray-600 text-center font-bold">
                        📊 {Object.keys(bet.votes || {}).length} vote(s) cast •{" "}
                        {Object.values(bet.votes || {}).filter(v => v === "approve").length} approve,{" "}
                        {Object.values(bet.votes || {}).filter(v => v === "reject").length} reject
                    </p>
                </div>
            )}

            {/* OWNER DRAFT CONTROLS */}
            {isOwner && bet.status === "DRAFT" && (
                <div className="mt-8 pt-6 border-t-2 border-black border-dashed">
                    <p className="text-xs font-black uppercase text-gray-500 mb-4">Draft Preview</p>
                    <div className="bg-yellow-100 p-4 rounded-lg border-2 border-black mb-4">
                        <p className="text-sm font-bold">This bet is invisible to players.</p>
                        <p className="text-xs text-gray-600 mt-1">Review the details above. When ready, click Publish to go live.</p>
                    </div>
                    <div className="flex gap-2">
                        {onEdit && (
                            <Button
                                onClick={() => onEdit(bet)}
                                disabled={loading}
                                variant="outline"
                                className="flex-1 bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                Edit Draft
                            </Button>
                        )}
                        <Button
                            onClick={handlePublish}
                            disabled={loading}
                            className="flex-[2] bg-green-400 text-black border-2 border-black hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            {loading ? "Publishing..." : "Publish Bet Now"}
                        </Button>
                    </div>
                </div>
            )}

            {/* OWNER RESOLUTION UI */}
            {isOwner && (bet.status === "OPEN" || bet.status === "PROOFING") && isExpired && (
                <div className="mt-8 pt-6 border-t-2 border-black border-dashed">
                    <p className="text-xs font-black uppercase text-gray-500 mb-4">Owner Controls</p>

                    <div className="space-y-4">
                        {/* AI Resolve Button */}
                        <Button
                            onClick={handleAIResolve}
                            disabled={aiResolving}
                            className="w-full bg-purple-500 text-white border-2 border-black hover:bg-purple-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black"
                        >
                            {aiResolving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    AI Looking Up Result...
                                </>
                            ) : (
                                <>
                                    <BrainCircuit className="h-4 w-4 mr-2" />
                                    🤖 AI Resolve
                                </>
                            )}
                        </Button>

                        {bet.type === "CHOICE" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {bet.options?.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setWinningOption(String(bet.options?.findIndex(o => o.id === opt.id)))}
                                        className={`p-2 text-sm font-bold rounded-lg border-2 border-black transition-all ${winningOption === String(bet.options?.findIndex(o => o.id === opt.id))
                                            ? "bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                            : "bg-white hover:bg-gray-50"
                                            } ${aiHighlighted && winningOption === String(bet.options?.findIndex(o => o.id === opt.id)) ? "animate-pulse ring-4 ring-purple-500" : ""}`}
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
                                className={`flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""}`}
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Home Score</label>
                                    <input
                                        type="number"
                                        value={resHome}
                                        onChange={(e) => setResHome(e.target.value === "" ? "" : Number(e.target.value))}
                                        className={`flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""}`}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Away Score</label>
                                    <input
                                        type="number"
                                        value={resAway}
                                        onChange={(e) => setResAway(e.target.value === "" ? "" : Number(e.target.value))}
                                        className={`flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""}`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                onClick={handleResolve}
                                disabled={loading}
                                className="flex-1 bg-yellow-400 text-black border-2 border-black hover:bg-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {loading ? "Processing..." : "Confirm & Payout"}
                            </Button>
                            <Button
                                onClick={() => setIsResolving(false)}
                                variant="ghost"
                                className="px-4 text-sm underline text-gray-500 hover:text-black"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* OWNER DISPUTE CONTROLS */}
            {isOwner && bet.status === "DISPUTED" && (
                <div className="mt-8 pt-6 border-t-2 border-black border-dashed">
                    <p className="text-xs font-black uppercase text-gray-500 mb-4">Dispute Management</p>

                    <div className="p-4 bg-yellow-50 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                        <h4 className="font-black uppercase mb-2 text-orange-600">⚠️ Bet Under Dispute</h4>
                        <p className="text-sm font-bold mb-3">
                            Voting Status: {Object.keys(bet.votes || {}).length} vote(s) •{" "}
                            {Object.values(bet.votes || {}).filter(v => v === "approve").length} approve,{" "}
                            {Object.values(bet.votes || {}).filter(v => v === "reject").length} reject
                        </p>

                        <div className="grid grid-cols-1 gap-2">
                            <Button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const result = await checkDisputeVoting(bet.leagueId, bet.id);
                                        if (result === "approve") {
                                            alert("✅ Result APPROVED by majority vote! You can now finalize resolution.");
                                        } else if (result === "reject") {
                                            alert("❌ Result REJECTED by majority vote. Please re-proof or mark invalid.");
                                        } else {
                                            alert("⚖️ No consensus reached. You can mark the bet as invalid and refund all players.");
                                        }
                                        if (onWagerSuccess) onWagerSuccess();
                                    } catch (error: any) {
                                        alert(error.message || "Failed to check voting");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="bg-blue-500 text-white border-2 border-black hover:bg-blue-600 font-black"
                            >
                                {loading ? "Checking..." : "📊 Check Voting Results"}
                            </Button>

                            <Button
                                onClick={handleMarkInvalid}
                                disabled={loading}
                                variant="outline"
                                className="bg-gray-500 text-white border-2 border-black hover:bg-gray-600 font-black"
                            >
                                ♻️ Mark Invalid & Refund All
                            </Button>
                        </div>

                        <p className="text-xs text-gray-600 mt-3 font-bold">
                            💡 Tip: Check voting results first. If approved, you can resolve normally. If no consensus, mark as invalid to refund everyone.
                        </p>
                    </div>
                </div>
            )}

            {showCoinFlow && <CoinFlow onComplete={() => setShowCoinFlow(false)} />}
            {/* Removed duplicate BetTicketAnimation - Inline ticket is sufficient */}
            <AllInModal
                isOpen={showAllInModal}
                amount={pendingWagerData?.amount || 0}
                onConfirm={async () => {
                    setShowAllInModal(false);
                    if (pendingWagerData) {
                        await executePlaceWager(pendingWagerData.amount, pendingWagerData.prediction);
                        setPendingWagerData(null);
                    }
                }}
                onCancel={() => {
                    setShowAllInModal(false);
                    setPendingWagerData(null);
                }}
            />
        </motion.div>
    );
}
