"use client";

import { Bet, BetType, placeWager, resolveBet, calculateOdds, getReturnPotential, Wager, startProofing, confirmVerification, publishBet, disputeBetResult, voteOnDisputedBet, voteOnProofingResult, markBetInvalidAndRefund, checkDisputeVoting, finalizeBet, submitDisputeResult } from "@/lib/services/bet-service";
import { aiAutoResolveBet, verifyBetResult } from "@/app/actions/ai-bet-actions";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";
import { Coins, Loader2, Gavel, Wallet, Trophy, BrainCircuit, CheckCircle, AlertTriangle, Timer, ThumbsUp, ThumbsDown, AlertCircle, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CoinFlow } from "@/components/animations/coin-flow";
import { SidePanelTicket } from "@/components/side-panel-ticket";
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
    isOwnerOverride?: boolean; // Allow external context to specify ownership (for dashboard)
}

export function BetCard({ bet, userPoints, userWager, mode, onEdit, onWagerSuccess, isOwnerOverride }: BetCardProps) {
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
    const isOwner = isOwnerOverride !== undefined ? isOwnerOverride : (user?.uid === bet.creatorId);

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
    // Auto-finalize PROOFING bets when deadline has passed
    useEffect(() => {
        const checkAutomation = async () => {
            if (!user) return;

            // 1. Check Auto-Finalize (Proofing -> Resolved)
            if (bet.status === "PROOFING" && bet.disputeDeadline) {
                const deadline = bet.disputeDeadline.toDate ? bet.disputeDeadline.toDate() : new Date(bet.disputeDeadline);
                const isPastDeadline = new Date() >= deadline;
                if (isPastDeadline && (isOwner || bet.autoFinalize)) {
                    try {
                        console.log("Auto-finalizing bet:", bet.id);
                        await finalizeBet(bet.leagueId, bet.id, user);
                        console.log("Bet auto-finalized successfully");
                    } catch (err) {
                        console.error("Auto-finalization failed:", err);
                    }
                }
            }

            // 2. Check Auto-Confirm (Locked/Open -> Proofing)
            if ((bet.status === "LOCKED" || bet.status === "OPEN") && bet.autoConfirm) {
                const eventDate = bet.eventDate?.toDate ? bet.eventDate.toDate() : (bet.eventDate ? new Date(bet.eventDate) : null);
                if (!eventDate) return;

                const confirmTime = new Date(eventDate.getTime() + (bet.autoConfirmDelay || 0) * 60000);
                if (new Date() >= confirmTime) {
                    try {
                        console.log("Auto-confirming bet via AI:", bet.id);
                        // Trigger AI Resolution
                        const result = await aiAutoResolveBet(bet);
                        if (result) {
                            // Extract outcome
                            let outcome: any;
                            if (result.type === "MATCH") {
                                outcome = { home: result.home, away: result.away };
                            } else if (result.type === "CHOICE") {
                                outcome = String(result.optionIndex);
                            } else if (result.type === "RANGE") {
                                outcome = result.value;
                            }

                            if (outcome !== undefined) {
                                await startProofing(bet.leagueId, bet.id, user, outcome, result.verification);
                                console.log("Bet auto-confirmed successfully");
                            }
                        }
                    } catch (err) {
                        console.error("Auto-confirmation failed:", err);
                    }
                }
            }
        };

        checkAutomation();
    }, [bet.id, bet.status, bet.disputeDeadline, bet.autoFinalize, bet.autoConfirm, bet.autoConfirmDelay, bet.eventDate, user, isOwner]);


    // --- HANDLERS ---

    // --- HANDLERS ---


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

    const getTimeRemaining = () => {
        const now = new Date();
        const closeDate = new Date(bet.closesAt.seconds * 1000);
        const diff = closeDate.getTime() - now.getTime();

        if (diff < 0) return "Closed";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes} m`;
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

    // --- PREPARE TICKET DATA ---
    let ticketStatus: "OPEN" | "LOCKED" | "PROOFING" | "RESOLVED" = "OPEN";
    if (bet.status === "LOCKED") ticketStatus = "LOCKED";
    else if (bet.status === "PROOFING" || bet.status === "DISPUTED") ticketStatus = "PROOFING";
    else if (bet.status === "RESOLVED" || bet.status === "INVALID") ticketStatus = "RESOLVED";

    let ticketWagerStatus: "WON" | "LOST" | "PUSH" | "PENDING" = "PENDING";
    let ticketSelectionDisplay = "";
    let ticketWagerAmount = 0;
    let ticketPotential = 0;
    let ticketOdds = "";
    let ticketPayout = 0;
    let ticketIsWinning = false;

    if (userWager) {
        ticketWagerAmount = userWager.amount;

        // Selection Display
        if (bet.type === "CHOICE" && bet.options) {
            const idx = Number(userWager.selection);
            ticketSelectionDisplay = bet.options[idx]?.text || "Option";
        } else if (bet.type === "MATCH" && typeof userWager.selection === "object") {
            const s = userWager.selection as any;
            ticketSelectionDisplay = `${s.home} - ${s.away}`;
        } else if (bet.type === "RANGE") {
            ticketSelectionDisplay = `${userWager.selection} ${bet.rangeUnit || ""}`;
        } else {
            ticketSelectionDisplay = String(userWager.selection);
        }

        // Status & Potentials
        if (bet.status === "RESOLVED") {
            ticketWagerStatus = userWager.status?.toUpperCase() as "WON" | "LOST" | "PUSH" || "PENDING";
            if (userWager.status === "WON") ticketPayout = userWager.payout || 0;
            else if (userWager.status === "PUSH") ticketPayout = userWager.amount;
        } else {
            // ESTIMATED POTENTIAL
            if (bet.type === "CHOICE" && bet.options) {
                const idx = Number(userWager.selection);
                if (mode === "ZERO_SUM" && bet.options[idx].totalWagered > 0) {
                    const odds = bet.totalPool / bet.options[idx].totalWagered;
                    ticketPotential = userWager.amount * odds;
                    ticketOdds = odds.toFixed(2) + "x";
                } else {
                    ticketPotential = userWager.amount * 2; // Default/Arcade
                    ticketOdds = "2.00x";
                }
            } else {
                ticketPotential = userWager.amount * 2;
                ticketOdds = "2.00x";
            }

            // Preliminary Winning Check
            if ((bet.status === "PROOFING" || bet.status === "LOCKED") && bet.winningOutcome !== undefined) {
                const userSel = userWager.selection;
                const proposedResult = bet.winningOutcome;
                if (bet.type === "CHOICE") {
                    ticketIsWinning = String(userSel) === String(proposedResult);
                } else if (bet.type === "MATCH") {
                    const uSel = typeof userSel === "object" ? userSel : { home: -1, away: -1 };
                    const pRes = typeof proposedResult === "object" ? proposedResult : { home: -2, away: -2 };
                    ticketIsWinning = (uSel.home === pRes.home && uSel.away === pRes.away);
                } else if (bet.type === "RANGE") {
                    ticketIsWinning = Number(userSel) === Number(proposedResult);
                }
            }
        }
    }

    const containerBorderClass =
        bet.status === "RESOLVED" ? (ticketWagerStatus === "WON" ? "border-emerald-500" : "border-slate-200") :
            bet.status === "PROOFING" ? "border-blue-200" :
                bet.status === "LOCKED" ? "border-black grayscale-[0.1]" :
                    bet.status === "OPEN" ? "border-black" : "border-slate-200";

    const containerBgClass =
        bet.status === "RESOLVED" ? (ticketWagerStatus === "WON" ? "bg-emerald-50" : "bg-white") :
            bet.status === "PROOFING" ? "bg-blue-50/30" :
                "bg-white";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border-2 ${containerBorderClass} ${containerBgClass} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row overflow-hidden mb-6 relative`}
        >
            {/* LEFT COLUMN: MAIN CONTENT */}
            <div className={`flex-1 p-5 flex flex-col justify-between border-b-2 md:border-b-0 md:border-r-2 border-dashed ${bet.status === "PROOFING" ? "border-blue-200" : "border-slate-200"}`}>
                <div>
                    {/* HEADER METADATA */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {bet.status === "OPEN" && !isExpired && <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide border border-green-200">Open</span>}
                            {(bet.status === "LOCKED" || (bet.status === "OPEN" && isExpired)) && <span className="bg-yellow-100 text-yellow-800 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide border border-yellow-200">Locked</span>}
                            {bet.status === "PROOFING" && <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide border border-blue-200">Proofing</span>}
                            {bet.status === "RESOLVED" && (
                                <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide border ${ticketWagerStatus === "WON" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                                    {ticketWagerStatus === "WON" ? "Won" : "Resolved"}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{bet.closesAt ? new Date(bet.closesAt.seconds * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                            </div>
                            {bet.status === "OPEN" && !isExpired && (
                                <div className="flex items-center gap-1 text-red-500">
                                    <Timer className="w-3 h-3" />
                                    <span>{getTimeRemaining()} left to bet</span>
                                </div>
                            )}
                            {(bet.status === "LOCKED" || (bet.status === "OPEN" && isExpired)) && (
                                <div className="flex items-center gap-1 text-amber-500">
                                    <Timer className="w-3 h-3" />
                                    <span>Game in Progress</span>
                                </div>
                            )}
                            {bet.status === "PROOFING" && (
                                <div className="flex items-center gap-1 text-blue-500">
                                    <Timer className="w-3 h-3" />
                                    <span>Verifying Result...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QUESTION TITLE */}
                    <h3 className={`text-lg font-black leading-tight mb-4 ${bet.status === "RESOLVED" && ticketWagerStatus === "LOST" ? "text-slate-900 line-through decoration-red-400/30" : "text-slate-900"}`}>
                        {bet.question}
                    </h3>

                    {/* --- STATE SPECIFIC CONTENT --- */}

                    {/* 1. OPEN STATE: BET OPTIONS */}
                    {bet.status === "OPEN" && !isExpired && !userWager && (
                        <div className="space-y-3">
                            {/* CHOICE BETS */}
                            {bet.type === "CHOICE" && bet.options && (
                                <div className="space-y-2">
                                    {bet.options.map((opt, idx) => (
                                        <label
                                            key={idx}
                                            onClick={() => setSelectedOption(String(idx))}
                                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all shadow-sm ${selectedOption === String(idx) ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOption === String(idx) ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"}`}>
                                                    {selectedOption === String(idx) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                                <span className={`font-bold ${selectedOption === String(idx) ? "text-blue-900" : "text-slate-600"}`}>{opt.text}</span>
                                            </div>
                                            {/* Odds calculation */}
                                            {mode === "ZERO_SUM" && opt.totalWagered > 0 && bet.totalPool > 0 && (
                                                <span className={`text-xs font-bold ${selectedOption === String(idx) ? "text-blue-600 bg-white border-blue-200" : "text-slate-400"} px-2 py-1 rounded border`}>
                                                    {(bet.totalPool / opt.totalWagered).toFixed(2)}x
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* MATCH / RANGE INPUTS (Reused existing UI simplified) */}
                            {bet.type === "MATCH" && (
                                <div className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-lg bg-slate-50">
                                    <input type="number" placeholder="Home" value={matchHome} onChange={e => setMatchHome(Number(e.target.value))} className="w-16 p-2 text-center font-black border-2 border-slate-300 rounded" />
                                    <span className="font-bold">-</span>
                                    <input type="number" placeholder="Away" value={matchAway} onChange={e => setMatchAway(Number(e.target.value))} className="w-16 p-2 text-center font-black border-2 border-slate-300 rounded" />
                                </div>
                            )}

                            {/* RANGE INPUT */}
                            {bet.type === "RANGE" && (
                                <div className="p-4 border-2 border-slate-200 rounded-lg bg-slate-50">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">My Prediction ({bet.rangeMin} - {bet.rangeMax})</div>
                                    <input
                                        type="number"
                                        placeholder={`Enter ${bet.rangeUnit || "value"}`}
                                        value={rangeValue}
                                        onChange={e => setRangeValue(Number(e.target.value))}
                                        className="w-full p-2 font-bold border-2 border-slate-300 rounded"
                                    />
                                </div>
                            )}

                            {/* WAGER INPUT & BUTTON */}
                            <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 flex gap-3">
                                {mode === "ZERO_SUM" && (
                                    <div className="relative w-32">
                                        <input
                                            type="number"
                                            value={wagerAmount}
                                            onChange={e => setWagerAmount(Number(e.target.value))}
                                            className="w-full h-10 pl-3 pr-8 rounded-lg border-2 border-slate-300 font-bold text-sm focus:border-black focus:outline-none"
                                            placeholder="Amt"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">PTS</span>
                                    </div>
                                )}
                                <Button
                                    onClick={handlePlaceWager}
                                    disabled={loading}
                                    className="flex-1 bg-black text-white font-bold h-10 rounded-lg hover:bg-slate-800"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place Bet"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 2. LOCKED STATE (ADMIN CONTROLS) */}
                    {(bet.status === "LOCKED" || (bet.status === "OPEN" && isExpired)) && isOwner && (
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-3 space-y-2 mt-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Owner Controls</div>
                            <button
                                onClick={handleAIResolve}
                                disabled={aiResolving}
                                className="w-full flex items-center justify-between p-2 bg-white border border-slate-200 rounded shadow-sm hover:border-purple-400 hover:shadow-md transition text-left group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center"><BrainCircuit className="w-3 h-3" /></div>
                                    <span className="font-bold text-slate-700 text-sm group-hover:text-purple-600">Auto-Resolve with AI</span>
                                </div>
                                {aiResolving ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <span className="text-xs text-purple-500 font-bold">Fastest</span>}
                            </button>
                            <button
                                onClick={() => {/* Toggle manual entry mode if we had a dedicated state, for now we can just show the resolution fields below or open a modal. Let's assume manual inputs are always visible for owner in locked state just like before but styled better */ }}
                                className="w-full flex items-center justify-between p-2 bg-white border border-slate-200 rounded shadow-sm hover:border-blue-400 hover:shadow-md transition text-left group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center"><Gavel className="w-3 h-3" /></div>
                                    <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600">Manual Entry</span>
                                </div>
                            </button>

                            {/* Manual Entry Inputs (Visible for Owner) */}
                            <div className="pt-2 border-t border-slate-200 mt-2">
                                {/* Simple selector for Choice */}
                                {bet.type === "CHOICE" && bet.options && (
                                    <select
                                        value={winningOption}
                                        onChange={e => setWinningOption(e.target.value)}
                                        className="w-full p-2 text-sm font-bold border-2 border-slate-200 rounded mb-2"
                                    >
                                        <option value="">Select Winner...</option>
                                        {bet.options.map((o, i) => <option key={i} value={i}>{o.text}</option>)}
                                    </select>
                                )}
                                {/* Match/Range inputs would go here similarly */}
                                {(winningOption !== "" || winningRange !== "" || (resHome !== "" && resAway !== "")) && (
                                    <Button onClick={handleResolve} disabled={loading} className="w-full bg-slate-900 text-white font-bold h-8 text-xs">Confirm Result</Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. PROOFING / RESOLVED: VERIFICATION SOURCE */}
                    {(bet.status === "PROOFING" || bet.status === "RESOLVED") && (
                        <div className={`mt-2 rounded-lg p-3 flex items-start gap-3 border ${bet.status === "PROOFING" ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}>
                            {/* Source Icon/Avatar */}
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs shrink-0 ${bet.status === "PROOFING" ? "bg-green-500" : "bg-slate-500"}`}>
                                {verificationData?.source ? verificationData.source.substring(0, 3).toUpperCase() : "AI"}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold uppercase tracking-wide mb-0.5 opacity-70">Verified Result</div>
                                <div className="font-black text-slate-800 mb-1 text-base">
                                    {(() => {
                                        if (typeof bet.winningOutcome === 'object') return `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`;
                                        if (bet.type === "CHOICE" && bet.options) return bet.options[Number(bet.winningOutcome)]?.text || String(bet.winningOutcome);
                                        return String(bet.winningOutcome);
                                    })()}
                                </div>
                                <div className="text-[10px] font-medium flex items-center gap-1 opacity-60">
                                    <CheckCircle className="w-3 h-3" />
                                    Source: {verificationData?.source || "Manual Entry"}
                                </div>
                            </div>

                            {/* Dispute Button for PROOFING */}
                            {bet.status === "PROOFING" && !isOwner && !bet.disputeActive && (
                                <button
                                    onClick={handleDispute}
                                    className="text-xs text-red-500 font-bold hover:underline self-center"
                                    disabled={disputeLoading}
                                >
                                    Dispute?
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: TICKET STUB */}
            {ticketStatus && (
                <SidePanelTicket
                    status={ticketStatus}
                    wagerStatus={ticketWagerStatus}
                    userSelection={ticketSelectionDisplay}
                    wagerAmount={ticketWagerAmount}
                    potentialPayout={ticketPotential}
                    payout={ticketPayout}
                    isWinning={ticketIsWinning}
                    odds={ticketOdds}
                    currency={mode === "ZERO_SUM" ? "pts" : "cr"}
                />
            )}

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
            {showCoinFlow && <CoinFlow onComplete={() => setShowCoinFlow(false)} />}
        </motion.div>
    );
}
