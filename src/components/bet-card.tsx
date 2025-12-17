"use client";

import { Bet, BetType, placeWager, resolveBet, calculateOdds, getReturnPotential, Wager, startProofing, confirmVerification, publishBet, disputeBetResult, voteOnDisputedBet, markBetInvalidAndRefund, checkDisputeVoting, finalizeBet, submitDisputeResult } from "@/lib/services/bet-service";
import { aiAutoResolveBet, verifyBetResult } from "@/app/actions/ai-bet-actions";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";
import { Coins, Loader2, Gavel, Wallet, Trophy, BrainCircuit, CheckCircle, AlertTriangle, Timer, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CoinFlow } from "@/components/animations/coin-flow";
import { BetTicket } from "@/components/bet-ticket";
import { AllInModal } from "@/components/all-in-modal";
import confetti from "canvas-confetti";
import { BetStatusStepper } from "@/components/bet-status-stepper";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface BetCardProps {
    bet: Bet;
    userPoints: number;
    userWager?: Wager;
    mode: "ZERO_SUM" | "STANDARD";
    onEdit?: (bet: Bet) => void;
    onWagerSuccess?: () => void;
}

export function BetCard({ bet, userPoints, userWager, mode, onEdit, onWagerSuccess }: BetCardProps) {
    const { user } = useAuth();
    const [isResolving, setIsResolving] = useState(false);
    const [wagerAmount, setWagerAmount] = useState<number | "">(mode === "STANDARD" ? 100 : "");
    const [selectedOption, setSelectedOption] = useState<string | number>("");
    const [rangeValue, setRangeValue] = useState<number | "">("");
    const [winningOption, setWinningOption] = useState<string | number>("");
    const [winningRange, setWinningRange] = useState<number | "">("");

    // Match Wager State
    const [matchHome, setMatchHome] = useState<number | "">("");
    const [matchAway, setMatchAway] = useState<number | "">("");

    // Match Resolution State
    const [resHome, setResHome] = useState<number | "">("");
    const [resAway, setResAway] = useState<number | "">("");

    // UI States
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
    // Track verification data from AI
    const [verificationData, setVerificationData] = useState<any>(null);
    // Dispute submission state
    const [disputeHome, setDisputeHome] = useState<number | "">("");
    const [disputeAway, setDisputeAway] = useState<number | "">("");
    const [disputeSubmitting, setDisputeSubmitting] = useState(false);
    const hasSubmittedDispute = bet.disputeSubmissions?.[user?.uid || ""] !== undefined;

    // Dynamic Odds (Zero Sum)
    const [dynamicMatchOdds, setDynamicMatchOdds] = useState<{ [key: string]: string }>({});
    const [dynamicRangeOdds, setDynamicRangeOdds] = useState<{ [key: number]: string }>({});

    const isExpired = new Date(bet.closesAt.seconds * 1000) < new Date();
    const isOwner = user?.uid === bet.creatorId;

    useEffect(() => {
        if (userWager && userWager.status === "WON") {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    }, [userWager]);

    // Fetch Odds
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
                        const key = `${sel.home} -${sel.away} `;
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

    // Auto-finalize PROOFING bets when deadline has passed
    useEffect(() => {
        const checkAutoFinalize = async () => {
            // Only proceed if bet is in PROOFING status and we're the owner or it's flagged for auto-finalize
            if (bet.status !== "PROOFING" || !bet.disputeDeadline || !user) return;

            const deadline = bet.disputeDeadline.toDate ? bet.disputeDeadline.toDate() : new Date(bet.disputeDeadline);
            const isPastDeadline = new Date() >= deadline;

            // Auto-finalize if deadline passed and (owner viewing OR autoFinalize flag set)
            if (isPastDeadline && (isOwner || bet.autoFinalize)) {
                try {
                    console.log("Auto-finalizing bet:", bet.id);
                    await finalizeBet(bet.leagueId, bet.id, user);
                    console.log("Bet auto-finalized successfully");
                } catch (err) {
                    console.error("Auto-finalization failed:", err);
                }
            }
        };

        checkAutoFinalize();
    }, [bet.id, bet.status, bet.disputeDeadline, bet.autoFinalize, user, isOwner]);


    // --- HANDLERS ---

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
            alert("Proofing started! 12h timer set.");
            setAiSuggestion(null);
        } catch (e) {
            console.error(e);
            alert("Failed to start proofing");
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceWager = async () => {
        if (!user) return;
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

        if (mode === "ZERO_SUM" && amount >= userPoints && amount > 0) {
            setPendingWagerData({ amount, prediction });
            setShowAllInModal(true);
            return;
        }

        await executePlaceWager(amount, prediction);
    };

    const executePlaceWager = async (amount: number, prediction: any) => {
        setLoading(true);
        try {
            await placeWager(bet.leagueId, bet.id, user!, amount, prediction as any);
            let selectionDisplay = String(prediction);
            let potentialDisplay = "TBD";

            if (bet.type === "CHOICE" && bet.options) {
                const idx = Number(prediction);
                selectionDisplay = bet.options[idx]?.text || "Option";
                if (bet.options[idx].totalWagered > 0) {
                    const odds = bet.totalPool / bet.options[idx].totalWagered;
                    potentialDisplay = `~${(amount * odds).toFixed(0)} pts`;
                }
            } else if (bet.type === "MATCH") {
                selectionDisplay = `${prediction.home} - ${prediction.away} `;
                potentialDisplay = "High Return";
            } else if (bet.type === "RANGE") {
                selectionDisplay = `${prediction} ${bet.rangeUnit || ""} `;
            }

            setLastWager({ amount, selectionDisplay, potential: potentialDisplay });

            if (mode === "ZERO_SUM") setWagerAmount("");
            setSelectedOption("");
            setRangeValue("");
            setMatchHome("");
            setMatchAway("");
            setShowCoinFlow(true);
            if (onWagerSuccess) setTimeout(() => onWagerSuccess(), 1500);
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
            // Use AI verification data if available, otherwise mark as manual
            const verification = verificationData || {
                verified: true,
                source: "Manual Entry",
                verifiedAt: new Date().toISOString(),
                method: "MANUAL" as const
            };

            const result = await resolveBet(bet.leagueId, bet.id, user, outcome, verification);
            if (result) {
                // Finalized - payouts processed
                alert(`Resolved! ${result.winnerCount} winners.`);
            } else {
                // Sent to PROOFING - waiting for dispute period
                alert("Result submitted! Players now have time to dispute before payouts are processed.");
            }
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
            alert(`Vote recorded: ${vote === "approve" ? "✅ Approved" : "❌ Rejected"} `);
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
        return `${hours}h ${minutes} m`;
    };

    const handleAIResolve = async () => {
        setAiResolving(true);
        try {
            const result = await aiAutoResolveBet(bet);
            if (!result) {
                alert("AI couldn't determine the result. Please enter manually.");
                return;
            }
            if (result.type === "MATCH") {
                setResHome(result.home);
                setResAway(result.away);
            } else if (result.type === "CHOICE") {
                setWinningOption(String(result.optionIndex));
            } else if (result.type === "RANGE") {
                setWinningRange(result.value);
            }
            // Store verification data if provided
            if (result.verification) {
                setVerificationData(result.verification);
            }
            setAiHighlighted(true);
            setTimeout(() => setAiHighlighted(false), 3000);
            alert("✅ Result found and filled by AI!");
        } catch (error: any) {
            alert(error.message || "AI resolution failed");
        } finally {
            setAiResolving(false);
        }
    };

    const getStatusBadgeClass = () => {
        if (bet.status === "RESOLVED") return "bg-blue-400 text-black";
        if (bet.status === "PROOFING") return "bg-yellow-400 text-black";
        if (bet.status === "DISPUTED") return "bg-orange-500 text-white animate-pulse";
        if (bet.status === "INVALID") return "bg-gray-400 text-black";
        if (bet.status === "DRAFT") return "bg-gray-300 text-gray-800 border-dashed";
        if (isExpired) return "bg-amber-300 text-black";
        return "bg-green-400 text-black pb-1";
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, rotate: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-xl border-2 border-black bg-white p-4 relative comic-shadow mb-4"
        >
            {/* STEPPER for Non-Draft/Open bets or Open bets that are Under Review */}
            {(bet.status !== "DRAFT" && bet.status !== "INVALID" && (bet.status !== "OPEN" || isExpired)) && (
                <div className="mb-4">
                    <BetStatusStepper bet={bet} isOwner={isOwner} hideTimeline={true} />
                </div>
            )}

            <div className="flex justify-between items-start mb-2 relative z-10 hidden">
                {/* Hiding the header inside BetCard since it's redundant with the List Item header */}
                {/* Wait, if I hide it, I lose the question. Does the List Item header show the question fully? 
                    Yes, usually. The user says "Who" is there. 
                    Let's just make it very compact instead of hidden, or just keep the changes I planned.
                    Actually, if I hide it, I lose "Total Pot", "Kick-off", etc.
                    Better to just compact it.
                */}
                <div className="w-full">
                    {/* Old Badge only if Stepper not active */}
                    {((bet.status === "OPEN" && !isExpired) || bet.status === "DRAFT" || bet.status === "INVALID") && (
                        <span className={`inline - flex items - center border - 2 border - black rounded - lg px - 2 py - 0.5 text - xs font - bold uppercase tracking - wider shadow - [2px_2px_0px_0px_rgba(0, 0, 0, 1)] ${getStatusBadgeClass()} `}>
                            {bet.status === "INVALID" ? "♻️ INVALID (REFUNDED)" :
                                bet.status === "OPEN" && isExpired ? "UNDER REVIEW" :
                                    bet.status} • {bet.type}
                        </span>
                    )}

                    <h3 className="text-lg font-bold font-comic text-black leading-tight max-w-[90%]">{bet.question}</h3>
                    {bet.type === "MATCH" && bet.matchDetails && (
                        <p className="text-sm text-blue-600 font-black mt-1 uppercase tracking-tight">
                            {bet.matchDetails.homeTeam} vs {bet.matchDetails.awayTeam} • {new Date(bet.matchDetails.date).toLocaleDateString()}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 font-bold">
                        {mode === "ZERO_SUM"
                            ? `Total Pot: ${bet.totalPool} pts`
                            : `Total Bets: ${bet.wagerCount || 0} `}
                        {bet.eventDate && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 px-1 border border-black rounded-md">
                                Kick-off: {new Date(bet.eventDate.seconds * 1000).toLocaleString()}
                            </span>
                        )}
                        {/* Only show closes info if OPEN */}
                        {bet.status === "OPEN" && (
                            <span className="block mt-1 text-red-600">
                                Betting Closes: {new Date(bet.closesAt.seconds * 1000).toLocaleString()}
                            </span>
                        )}
                    </p>
                </div>
                {bet.status === "RESOLVED" && <Trophy className="h-6 w-6 text-yellow-500 fill-yellow-500 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" />}
            </div>

            {/* Resolved Outcome Info */}
            {bet.status === "RESOLVED" && (
                <div className="mb-4 rounded-lg bg-blue-50 p-3 border-2 border-black border-dashed">
                    <p className="text-xs font-black text-blue-600 uppercase">Winning Outcome</p>
                    <p className="text-xl font-black mt-1 text-black">
                        {(() => {
                            if (bet.type === "MATCH" && typeof bet.winningOutcome === "object" && bet.winningOutcome) {
                                return `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away} `;
                            }
                            if (bet.type === "CHOICE" && bet.options) {
                                const idx = Number(bet.winningOutcome);
                                return bet.options[idx]?.text || String(bet.winningOutcome);
                            }
                            if (bet.type === "RANGE") {
                                return `${bet.winningOutcome} ${bet.rangeUnit || ''} `;
                            }
                            return String(bet.winningOutcome);
                        })()}
                    </p>
                    {userWager && userWager.status === "WON" && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-2 flex items-center gap-2 text-green-600 font-black text-sm"
                        >
                            <CheckCircle className="h-4 w-4 fill-green-600 text-white" />
                            <span>You Won +{userWager.payout} pts!</span>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Active Wager Ticket */}
            {userWager && (
                <div className="mb-4 flex justify-center">
                    {(() => {
                        let sel = String(userWager.selection);
                        let pot = "Pending";
                        let wagerStatus: "WON" | "LOST" | "PUSH" | "PENDING" = "PENDING";

                        // Check if bet is resolved
                        if (bet.status === "RESOLVED") {
                            wagerStatus = userWager.status?.toUpperCase() as "WON" | "LOST" | "PUSH" || "PENDING";

                            // TICKET SHOWS TOTAL CASHOUT (full payout amount)
                            if (userWager.status === "WON") {
                                pot = `${userWager.payout || 0} pts`; // Total cashout
                            } else if (userWager.status === "LOST") {
                                pot = `0 pts`; // No cashout
                            } else if (userWager.status === "PUSH") {
                                pot = `${userWager.amount} pts(Refunded)`; // Refund amount
                            }
                        } else {
                            // For active bets, show estimated total cashout
                            // Arcade: Fixed 1 pt return
                            if (mode !== "ZERO_SUM") {
                                pot = "1 pt";
                            }
                        }

                        if (bet.type === "CHOICE" && bet.options) {
                            const idx = Number(userWager.selection);
                            sel = bet.options[idx]?.text || "Option";
                            if (mode === "ZERO_SUM" && bet.status !== "RESOLVED" && bet.options[idx].totalWagered > 0) {
                                const odds = bet.totalPool / bet.options[idx].totalWagered;
                                pot = `~${(userWager.amount * odds).toFixed(0)} pts`; // Total cashout estimate
                            }
                        } else if (bet.type === "MATCH" && typeof userWager.selection === "object") {
                            const s = userWager.selection as any;
                            sel = `${s.home} - ${s.away} `;
                            if (mode === "ZERO_SUM" && bet.status !== "RESOLVED") {
                                pot = `~${(userWager.amount * 2).toFixed(0)} pts * `; // Total cashout estimate
                            }
                        } else if (bet.type === "RANGE") {
                            sel = `${userWager.selection} ${bet.rangeUnit || ""} `;
                        }

                        return (
                            <BetTicket
                                amount={userWager.amount}
                                selectionDisplay={sel}
                                potential={pot}
                                wagerStatus={wagerStatus}
                                eventDate={bet.eventDate}
                                verification={bet.verification}
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
                            {mode === "ZERO_SUM" ? `Your Points: ${userPoints} ` : "Arcade Mode: Free Entry"}
                        </span>
                    </div>

                    {/* CHOICE BETS */}
                    {bet.type === "CHOICE" && bet.options && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {bet.options.map((opt, idx) => {
                                    const calcWager = mode === "STANDARD" ? 100 : (Number(wagerAmount) || 0);

                                    // Calculate odds including user's potential wager
                                    const projectedTotalPool = bet.totalPool + calcWager;
                                    const projectedOptionPool = opt.totalWagered + (selectedOption === String(idx) ? calcWager : 0);
                                    const odds = projectedOptionPool > 0
                                        ? (projectedTotalPool / projectedOptionPool).toFixed(2)
                                        : "---";

                                    let potential = "1 pt";
                                    let percentage = 0;

                                    if (mode === "ZERO_SUM") {
                                        if (calcWager > 0) {
                                            const totalReturn = getReturnPotential(calcWager, bet.totalPool + calcWager, opt.totalWagered + calcWager);
                                            const profit = totalReturn - calcWager;
                                            potential = profit > 0 ? `+ ${profit.toFixed(0)} pts` : `${profit.toFixed(0)} pts`;
                                        } else {
                                            potential = (1.0 * (Number(odds) || 1) * 10).toFixed(0);
                                        }
                                        percentage = bet.totalPool > 0 ? Math.round((opt.totalWagered / bet.totalPool) * 100) : 0;
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSelectedOption(String(idx))}
                                            className={`relative overflow - hidden flex flex - col items - center justify - center rounded - xl border - 3 p - 5 transition - all duration - 200 shadow - [4px_4px_0px_0px_rgba(0, 0, 0, 1)] active: translate - y - [2px] active: shadow - [2px_2px_0px_0px_rgba(0, 0, 0, 1)] min - h - [100px] ${selectedOption === String(idx)
                                                ? "border-black bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 ring-4 ring-purple-400 ring-offset-2"
                                                : "border-black bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 hover:from-blue-200 hover:via-purple-200 hover:to-pink-200"
                                                } `}
                                        >
                                            {mode === "ZERO_SUM" && (
                                                <div
                                                    className={`absolute left - 0 top - 0 bottom - 0 transition - all duration - 500 ease - out z - 0 ${selectedOption === String(idx) ? "bg-purple-400/30" : "bg-blue-100/40"} `}
                                                    style={{ width: `${percentage}% ` }}
                                                />
                                            )}
                                            <div className="relative z-10 w-full text-center space-y-2">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="font-black text-xl tracking-tight text-black drop-shadow-sm">{opt.text}</span>
                                                    {mode === "ZERO_SUM" && (
                                                        <span className="text-xs font-bold text-gray-500 bg-white/60 px-2 py-0.5 rounded-full">{percentage}%</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-center gap-3">
                                                    {mode === "ZERO_SUM" && (
                                                        <span className="font-mono font-black text-sm text-black bg-white px-2 py-1 border-2 border-black rounded-lg shadow-sm">{odds}x</span>
                                                    )}
                                                    <span className="font-bold text-sm text-gray-600">
                                                        Return: <span className="text-black font-black text-base">{potential}</span>
                                                    </span>
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
                                placeholder={`Enter number(${bet.rangeMin} - ${bet.rangeMax})`}
                            />
                            {mode === "ZERO_SUM" && rangeValue !== "" && (
                                <p className="text-xs font-bold text-gray-500 mt-1 text-right">
                                    Current Odds: {dynamicRangeOdds[Number(rangeValue)] || "1.00"}x
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
                                        value={matchHome}
                                        onChange={(e) => setMatchHome(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-xl font-black text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        placeholder="0"
                                    />
                                </div>
                                <span className="text-2xl font-black text-gray-400">-</span>
                                <div className="flex-1 text-center">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">
                                        {bet.matchDetails?.awayTeam || "Away"}
                                    </label>
                                    <input
                                        type="number"
                                        value={matchAway}
                                        onChange={(e) => setMatchAway(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-xl font-black text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Wager Button */}
                    <div className="mt-4 flex gap-4">
                        {mode === "ZERO_SUM" && (
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={wagerAmount}
                                    onChange={(e) => setWagerAmount(Number(e.target.value))}
                                    className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    placeholder="Wager Amount"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">PTS</span>
                            </div>
                        )}
                        <Button
                            onClick={handlePlaceWager}
                            disabled={loading}
                            className={`h - 12 border - 2 border - black text - white font - black uppercase tracking - widest shadow - [4px_4px_0px_0px_rgba(0, 0, 0, 1)] hover: translate - y - [-2px] hover: shadow - [6px_6px_0px_0px_rgba(0, 0, 0, 1)] transition - all ${mode === "ZERO_SUM" ? "w-32 bg-primary" : "w-full bg-green-500"} `}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Place Bet"}
                        </Button>
                    </div>
                </div>
            )}

            {/* PLAYER DISPUTE CONTROLS - Show during PROOFING or DISPUTED status */}
            {!isOwner && userWager && (bet.status === "PROOFING" || bet.status === "DISPUTED") && (
                <div className="mt-6 pt-6 border-t-2 border-black border-dashed">
                    <p className="text-xs font-black uppercase text-gray-500 mb-4">Player Actions</p>

                    {bet.status === "PROOFING" && !bet.disputeActive && (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-500 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            <h4 className="font-black uppercase mb-2 text-yellow-700">⏳ Result Proofing Period</h4>
                            <p className="text-sm font-bold mb-3">
                                The owner has submitted a result. You have {getDisputeTimeRemaining()} to dispute if you disagree.
                            </p>
                            <p className="text-xs font-bold text-gray-600 mb-3">
                                Result: {typeof bet.winningOutcome === 'object'
                                    ? `${bet.winningOutcome.home} - ${bet.winningOutcome.away} `
                                    : bet.winningOutcome}
                            </p>
                            <Button
                                onClick={handleDispute}
                                disabled={disputeLoading}
                                className="w-full bg-orange-500 text-white border-2 border-black hover:bg-orange-600 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {disputeLoading ? "Filing..." : "⚠️ Dispute This Result"}
                            </Button>
                        </div>
                    )}

                    {bet.status === "DISPUTED" && (
                        <div className="p-4 bg-orange-50 border-2 border-orange-500 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            <h4 className="font-black uppercase mb-2 text-orange-700">🗳️ Bet Under Dispute - Submit Your Result</h4>
                            <p className="text-sm font-bold mb-3">
                                The original result has been disputed. All players must submit what they believe is the correct result.
                            </p>
                            <p className="text-xs font-bold text-gray-600 mb-3">
                                Original Result: {typeof bet.winningOutcome === 'object'
                                    ? `${bet.winningOutcome.home} - ${bet.winningOutcome.away}`
                                    : bet.winningOutcome}
                            </p>

                            {/* Show existing submissions */}
                            {bet.disputeSubmissions && Object.keys(bet.disputeSubmissions).length > 0 && (
                                <div className="mb-4 p-3 bg-white border-2 border-black rounded-lg">
                                    <p className="text-xs font-black uppercase text-gray-500 mb-2">Submitted Results:</p>
                                    <div className="space-y-1">
                                        {Object.entries(bet.disputeSubmissions).map(([uid, submission]) => (
                                            <div key={uid} className="flex justify-between text-sm">
                                                <span className="font-bold">{submission.displayName || "Player"}</span>
                                                <span className="font-black">
                                                    {typeof submission.result === 'object'
                                                        ? `${(submission.result as { home: number; away: number }).home} - ${(submission.result as { home: number; away: number }).away}`
                                                        : submission.result}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {hasSubmittedDispute ? (
                                <div className="p-3 bg-green-100 border-2 border-green-500 rounded-lg">
                                    <p className="text-sm font-black text-center text-green-700">
                                        ✅ You submitted: {(() => {
                                            const sub = bet.disputeSubmissions?.[user?.uid || ""];
                                            if (!sub) return "N/A";
                                            return typeof sub.result === 'object'
                                                ? `${(sub.result as { home: number; away: number }).home} - ${(sub.result as { home: number; away: number }).away}`
                                                : sub.result;
                                        })()}
                                    </p>
                                    <p className="text-xs text-center text-gray-600 mt-1">
                                        Waiting for all players to submit...
                                    </p>
                                </div>
                            ) : bet.type === "MATCH" ? (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-600">Enter what you believe is the correct score:</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{bet.matchDetails?.homeTeam}</p>
                                            <input
                                                type="number"
                                                value={disputeHome}
                                                onChange={(e) => setDisputeHome(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                placeholder="0"
                                            />
                                        </div>
                                        <span className="font-black">-</span>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{bet.matchDetails?.awayTeam}</p>
                                            <input
                                                type="number"
                                                value={disputeAway}
                                                onChange={(e) => setDisputeAway(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={async () => {
                                            if (!user || disputeHome === "" || disputeAway === "") return;
                                            setDisputeSubmitting(true);
                                            try {
                                                const { consensus, consensusResult } = await submitDisputeResult(
                                                    bet.leagueId,
                                                    bet.id,
                                                    user.uid,
                                                    { home: disputeHome as number, away: disputeAway as number },
                                                    user.displayName || "Player"
                                                );
                                                if (consensus) {
                                                    alert("All players agree! The result has been updated. Owner can now finalize payouts.");
                                                } else {
                                                    alert("Your result has been submitted. Waiting for other players...");
                                                }
                                            } catch (err: any) {
                                                alert(err.message || "Failed to submit");
                                            } finally {
                                                setDisputeSubmitting(false);
                                            }
                                        }}
                                        disabled={disputeSubmitting || disputeHome === "" || disputeAway === ""}
                                        className="w-full bg-orange-500 text-white border-2 border-black hover:bg-orange-600 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        {disputeSubmitting ? "Submitting..." : "📤 Submit My Result"}
                                    </Button>
                                </div>
                            ) : (
                                /* Fallback to voting for non-MATCH bets */
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleVote("approve")}
                                        disabled={votingLoading}
                                        className="bg-green-500 text-white border-2 border-black hover:bg-green-600 font-black"
                                    >
                                        ✅ Approve
                                    </Button>
                                    <Button
                                        onClick={() => handleVote("reject")}
                                        disabled={votingLoading}
                                        className="bg-red-500 text-white border-2 border-black hover:bg-red-600 font-black"
                                    >
                                        ❌ Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* NON-OWNER MESSAGE FOR LOCKED/PROOFING BETS */}
            {!isOwner && !userWager && (bet.status === "LOCKED" || bet.status === "PROOFING") && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 border-dashed rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Timer className="h-5 w-5 text-yellow-600" />
                        <p className="font-black text-yellow-800 uppercase">Waiting for Result</p>
                    </div>
                    <p className="text-sm font-bold text-gray-600">
                        The league owner is reviewing and will confirm the result soon.
                    </p>
                </div>
            )}

            {/* OWNER CONTROLS (Publish, Resolve, etc) */}
            {isOwner && (
                <div className="mt-6 pt-6 border-t-2 border-black border-dashed">
                    <div className="flex flex-wrap gap-2">
                        {bet.status === "DRAFT" && (
                            <Button onClick={handlePublish} disabled={loading} className="bg-green-500 text-white border-2 border-black hover:bg-green-600 font-black">
                                {loading ? "Publishing..." : "🚀 Publish Bet"}
                            </Button>
                        )}
                        {/* Only show Resolve button for PROOFING or expired OPEN bets, not LOCKED */}
                        {(bet.status === "PROOFING" || (bet.status === "OPEN" && isExpired)) && !isResolving && (
                            <Button onClick={() => setIsResolving(true)} className="bg-yellow-400 text-black border-2 border-black hover:bg-yellow-500 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                🏆 Resolve Result
                            </Button>
                        )}
                        {/* Auto-Processing indicator - for PROOFING bets after deadline */}
                        {bet.status === "PROOFING" && bet.disputeDeadline && (() => {
                            const deadline = bet.disputeDeadline.toDate ? bet.disputeDeadline.toDate() : new Date(bet.disputeDeadline);
                            const isPastDeadline = new Date() >= deadline;
                            return isPastDeadline;
                        })() && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-500 rounded-lg">
                                    <Loader2 className="animate-spin h-4 w-4 text-green-600" />
                                    <span className="font-bold text-green-700 text-sm">Processing payouts...</span>
                                </div>
                            )}
                        {/* AI Verify button only for LOCKED (not when already resolving) */}
                        {bet.status === "LOCKED" && !isResolving && (
                            <Button onClick={handleAiverify} disabled={verifying} variant="secondary" className="border-2 border-black font-bold">
                                {verifying ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                AI Verify
                            </Button>
                        )}
                    </div>

                    {/* AI Suggestion */}
                    {aiSuggestion && (
                        <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-500 border-dashed rounded-xl">
                            <h4 className="font-black text-purple-700 mb-1 flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4" /> AI Suggestion
                            </h4>
                            <p className="text-sm font-medium mb-3">{aiSuggestion}</p>
                            <Button onClick={handleStartProofing} size="sm" className="bg-purple-600 text-white font-bold">
                                Use & Start Proofing
                            </Button>
                        </div>
                    )}

                    {/* RESOLUTION UI - Auto-show for LOCKED bets */}
                    {(isResolving || bet.status === "LOCKED") && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-black uppercase">Set Final Result</h4>
                                <Button size="sm" variant="ghost" onClick={handleAIResolve} disabled={aiResolving} className="text-purple-600 font-bold hover:bg-purple-50">
                                    {aiResolving ? <Loader2 className="animate-spin w-4 h-4" /> : <><BrainCircuit className="w-4 h-4 mr-1" /> Auto-Fill</>}
                                </Button>
                            </div>

                            <div className="space-y-4 mb-4">
                                {bet.type === "CHOICE" && bet.options && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {bet.options.map((opt, i) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setWinningOption(String(i))}
                                                className={`p - 2 border - 2 rounded - lg font - bold text - sm text - left ${winningOption === String(i) ? "bg-black text-white border-black" : "bg-white text-black border-black hover:bg-gray-50"} `}
                                            >
                                                {opt.text}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {bet.type === "RANGE" && (
                                    <input
                                        type="number"
                                        value={winningRange}
                                        onChange={(e) => setWinningRange(Number(e.target.value))}
                                        className="w-full h-10 px-3 border-2 border-black rounded-lg font-bold"
                                        placeholder="Enter Winning Number"
                                    />
                                )}

                                {bet.type === "MATCH" && (
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{bet.matchDetails?.homeTeam}</p>
                                            <input
                                                type="number"
                                                value={resHome}
                                                onChange={(e) => setResHome(e.target.value === "" ? "" : Number(e.target.value))}
                                                className={`flex h - 10 w - full rounded - lg border - 2 border - black bg - white px - 3 py - 2 text - sm font - bold text - center shadow - [2px_2px_0px_0px_rgba(0, 0, 0, 1)] ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""} `}
                                                placeholder="0"
                                            />
                                        </div>
                                        <span className="font-black">-</span>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{bet.matchDetails?.awayTeam}</p>
                                            <input
                                                type="number"
                                                value={resAway}
                                                onChange={(e) => setResAway(e.target.value === "" ? "" : Number(e.target.value))}
                                                className={`flex h - 10 w - full rounded - lg border - 2 border - black bg - white px - 3 py - 2 text - sm font - bold text - center shadow - [2px_2px_0px_0px_rgba(0, 0, 0, 1)] ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""} `}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleResolve} disabled={loading} className="flex-1 bg-yellow-400 text-black border-2 border-black hover:bg-yellow-500 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    {loading ? "Processing..." : "✅ Confirm & Payout"}
                                </Button>
                                {bet.status !== "LOCKED" && (
                                    <Button onClick={() => setIsResolving(false)} variant="ghost" className="underline">Cancel</Button>
                                )}
                            </div>
                        </motion.div>
                    )}
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
                    </div>
                </div>
            )}

            {showCoinFlow && <CoinFlow onComplete={() => setShowCoinFlow(false)} />}
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
