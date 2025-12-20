"use client";

import { Bet, BetType, placeWager, editWager, resolveBet, calculateOdds, getReturnPotential, Wager, startProofing, confirmVerification, publishBet, disputeBetResult, voteOnDisputedBet, voteOnProofingResult, markBetInvalidAndRefund, checkDisputeVoting, finalizeBet, submitDisputeResult } from "@/lib/services/bet-service";
import { aiAutoResolveBet, verifyBetResult } from "@/app/actions/ai-bet-actions";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect, useRef } from "react";
import { Coins, Loader2, Gavel, Wallet, Trophy, BrainCircuit, CheckCircle, AlertTriangle, Timer, ThumbsUp, ThumbsDown, AlertCircle, Calendar, Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CoinFlow } from "@/components/animations/coin-flow";
import { SidePanelTicket } from "@/components/side-panel-ticket";
import { AllInModal } from "@/components/all-in-modal";
import confetti from "canvas-confetti";
import { BetStatusStepper } from "@/components/bet-status-stepper";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

import { League, LeagueMember, PowerUpType, PowerUpInventory } from "@/lib/services/league-service"; // Ensure correct imports

import { CompactPowerBooster } from "@/components/compact-power-booster";
import { TeamLogo } from "@/components/team-logo";

// ... existing imports

interface BetCardProps {
    bet: Bet;
    userPoints: number;
    userWager?: Wager;
    mode: "ZERO_SUM" | "STANDARD";
    powerUps?: PowerUpInventory; // New prop
    onEdit?: (bet: Bet) => void;
    onWagerSuccess?: () => void;
    isOwnerOverride?: boolean;
}

export function BetCard({ bet, userPoints, userWager, mode, powerUps: powerUpsProp, onEdit, onWagerSuccess, isOwnerOverride }: BetCardProps) {
    // GUARANTEED fallback for powerUps in STANDARD (Arcade) mode
    // This ensures power boosters are ALWAYS available even if the prop isn't passed correctly
    // Default values match the old backfill: 3x x2, 3x x3, 2x x4
    const powerUps = powerUpsProp ?? (mode === "STANDARD" ? { x2: 3, x3: 3, x4: 2 } : undefined);

    // DEBUG: Log powerUps prop
    console.log("[BetCard] powerUps prop:", powerUpsProp, "effective:", powerUps, "mode:", mode);
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

    // Power Up State
    const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | undefined>(undefined);

    // UI States
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        const newAmount = Number(wagerAmount) || 0;

        if (mode === "ZERO_SUM") {
            // When editing, add back the original wager amount to available points
            const originalWagerAmount = isEditing && userWager ? userWager.amount : 0;
            const effectiveAvailablePoints = userPoints + originalWagerAmount;

            if (newAmount <= 0) return alert("Invalid amount");
            if (effectiveAvailablePoints < newAmount) return alert("Insufficient points");
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

        const amount = mode === "STANDARD" ? 0 : newAmount;

        if (mode === "ZERO_SUM" && amount >= userPoints && amount > 0 && !isEditing) {
            setPendingWagerData({ amount, prediction });
            setShowAllInModal(true);
            return;
        }

        await executePlaceWager(amount, prediction, selectedPowerUp);
    };

    const handleEditClick = () => {
        if (!userWager) return;
        setWagerAmount(userWager.amount);
        if (mode === "STANDARD") {
            setSelectedPowerUp((userWager.powerUp as PowerUpType) || undefined);
        }

        if (bet.type === "CHOICE") {
            setSelectedOption(String(userWager.selection));
        } else if (bet.type === "MATCH") {
            const sel = userWager.selection as { home: number, away: number };
            setMatchHome(sel.home);
            setMatchAway(sel.away);
        } else if (bet.type === "RANGE") {
            setRangeValue(Number(userWager.selection));
        }

        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // inputs will be reset on next edit or place attempt
        setWagerAmount(mode === "STANDARD" ? 100 : "");
        setSelectedOption("");
        setRangeValue("");
        setMatchHome("");
        setMatchAway("");
        if (mode === "STANDARD") setSelectedPowerUp(undefined);
    };

    const executePlaceWager = async (amount: number, prediction: any, powerUp?: PowerUpType) => {
        setLoading(true);
        try {
            if (isEditing) {
                await editWager(bet.leagueId, bet.id, user!, amount, prediction, powerUp);
            } else {
                await placeWager(bet.leagueId, bet.id, user!, amount, prediction, powerUp);
            }

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
            setIsEditing(false);
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

    const handleFinalizeNow = async () => {
        if (!user) return;
        if (!confirm("Skip proofing and finalize this bet immediately? Payouts will be distributed.")) return;
        setLoading(true);
        try {
            await finalizeBet(bet.leagueId, bet.id, user, true);
            alert("Bet confirmed! Payouts distributed.");
            if (onWagerSuccess) onWagerSuccess();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to finalize bet");
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
            console.log("🛠️ Raw bet before sanitize:", {
                id: bet.id,
                question: bet.question,
                matchDetails: bet.matchDetails,
                eventDate: bet.eventDate,
                type: bet.type
            });

            // Sanitize bet data for Server Action to avoid serialization issues with Timestamps
            const sanitizedBet = {
                ...bet,
                eventDate: (() => {
                    const d = bet.eventDate;
                    if (!d) return new Date().toISOString(); // Fallback to now if missing
                    try {
                        if (typeof d.toDate === 'function') return d.toDate().toISOString();
                        if (typeof d.seconds === 'number') return new Date(d.seconds * 1000).toISOString();
                        if (d instanceof Date) return d.toISOString();
                        if (typeof d === 'string') return d;
                        return new Date().toISOString(); // Last resort fallback
                    } catch (e) {
                        return new Date().toISOString();
                    }
                })(),
                // Ensure matchDetails dates are also strings if present
                matchDetails: bet.matchDetails ? {
                    ...bet.matchDetails,
                    date: bet.matchDetails.date && typeof bet.matchDetails.date === 'object' && 'toDate' in bet.matchDetails.date
                        ? (bet.matchDetails.date as any).toDate().toISOString()
                        : bet.matchDetails.date
                } : undefined
            };

            console.log("🤖 Sending to AI for resolution (Sanitized):", sanitizedBet);
            const result = await aiAutoResolveBet(sanitizedBet);
            console.log("🤖 Client received AI result:", result);

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
            // setTimeout(() => setAiHighlighted(false), 3000); // Keep highlighted until user confirms or changes
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
    let ticketPowerUp: string | undefined = undefined;

    if (userWager) {
        ticketWagerAmount = userWager.amount;
        ticketPowerUp = (userWager.powerUp as string) || undefined;

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
            // Power Up Multiplier
            let multiplier = 2; // Base standard multiplier
            if (userWager.powerUp) {
                if (userWager.powerUp === 'x2') multiplier = 2; // Should this be 2*2? No, x2 replaces base? Or base is 1? 
                // Standard mode usually gives points based on settings. 
                // Wait, logic says: `ticketPotential = userWager.amount * 2`. 
                // Implicitly assumption: Amount=0 in standard? params say `amount=0` for standard.
                // Actually `executePlaceWager` sets amount=0 for standard. 
                // So `userWager.amount` is 0. 
                // If amount is 0, potential is 0 * 2 = 0.
                // This means Standard mode "points" are not stored in "amount". Amount is currency.
                // Standard mode: "Points" are awarded, not "Payout".
                // But `SidePanelTicket` shows "Potential Payout".
                // In Standard Mode, `userWager` has amount=0.
                // We need to show "Potential Points".

                // Let's assume for Standard Mode: Base is calculated from Match Settings (e.g., 3 pts for Exact).
                // But we don't know the result yet.
                // "Est Win" usually assumes BEST CASE (Exact Match).
                // Let's assume Base = 3 (default exact).
                // If PowerUps are Multipliers, then it matches.

                // Let's refine potential for Standard Mode:
                // If amount=0, we shouldn't use amount * multipier.
                // We should use "Max Points" * multiplier.
            }

            // ESTIMATED POTENTIAL
            if (mode === "ZERO_SUM") {
                if (bet.type === "CHOICE" && bet.options) {
                    const idx = Number(userWager.selection);
                    if (bet.options[idx].totalWagered > 0) {
                        const odds = bet.totalPool / bet.options[idx].totalWagered;
                        ticketPotential = userWager.amount * odds;
                        ticketOdds = odds.toFixed(2) + "x";
                    } else {
                        ticketPotential = userWager.amount * 2;
                        ticketOdds = "2.00x";
                    }
                } else {
                    ticketPotential = userWager.amount * 2; // Fallback
                    ticketOdds = "2.00x";
                }
            } else {
                // STANDARD/ARCADE MODE
                // Assuming Base Win = 1 Point
                let mult = 1;
                if (userWager.powerUp === 'x2') mult = 2;
                if (userWager.powerUp === 'x3') mult = 3;
                if (userWager.powerUp === 'x4') mult = 4;

                ticketOdds = `${mult}x Boost`;
                ticketPotential = 1 * mult;
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
    } else {
        // PENDING / PREVIEW STATE
        if (selectedOption !== "" || rangeValue !== "" || (matchHome !== "" && matchAway !== "")) {
            // Populate Ticket with Preview
            if (bet.type === "CHOICE" && bet.options && selectedOption !== "") {
                const idx = Number(selectedOption);
                ticketSelectionDisplay = bet.options[idx]?.text || "Option";
            } else if (bet.type === "MATCH" && matchHome !== "") {
                ticketSelectionDisplay = `${matchHome} - ${matchAway}`;
            } else if (bet.type === "RANGE") {
                ticketSelectionDisplay = `${rangeValue} ${bet.rangeUnit || ""}`;
            }

            if (mode === "ZERO_SUM") {
                ticketWagerAmount = Number(wagerAmount);
                // Calc potential...
            } else {
                // Standard Mode Preview
                ticketWagerAmount = 0;
                let mult = 1;
                if (selectedPowerUp === 'x2') mult = 2;
                if (selectedPowerUp === 'x3') mult = 3;
                if (selectedPowerUp === 'x4') mult = 4;
                ticketOdds = `${mult}x Boost`;
                ticketPowerUp = selectedPowerUp;
                // Since we can't calc points, maybe just show the boost
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
            className={`rounded-xl border-2 ${containerBorderClass} ${containerBgClass} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row mb-6 relative`}
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
                                    <span>
                                        {bet.disputeDeadline
                                            ? `Auto-confirm in ${getDisputeTimeRemaining()}`
                                            : "Verifying Result..."
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QUESTION TITLE */}
                    <h3 className={`text-sm md:text-lg font-black leading-tight mb-4 ${bet.status === "RESOLVED" && ticketWagerStatus === "LOST" ? "text-slate-900 line-through decoration-red-400/30" : "text-slate-900"}`}>
                        {bet.question}
                    </h3>

                    {/* --- STATE SPECIFIC CONTENT --- */}

                    {/* MATCHUP LOGO HEADER - Only for MATCH_WINNER or MATCH_1X2 style choice bets */}
                    {(() => {
                        // If choiceStyle is explicitly VARIOUS, skip the visual header
                        if (bet.choiceStyle === "VARIOUS") return null;

                        // 1. Use explicit match details if available
                        let home = bet.matchDetails?.homeTeam;
                        let away = bet.matchDetails?.awayTeam;

                        // 2. Fallback: Try to parse from Question string OR Options (for legacy bets)
                        if (!home && !away) {
                            // A) Try Question string (e.g. "Lakers vs Celtics")
                            if (bet.question.toLowerCase().includes(" vs ")) {
                                const parts = bet.question.split(/ vs /i);
                                if (parts.length === 2) {
                                    home = parts[0].trim();
                                    away = parts[1].trim();
                                }
                            }
                            // B) Try Options (e.g. Choice bet with "Team A", "Draw", "Team B")
                            // Only do this if choiceStyle is MATCH_WINNER or MATCH_1X2, or is not set (legacy with visual intent)
                            else if (bet.options && bet.options.length >= 2 && (bet.choiceStyle === "MATCH_WINNER" || bet.choiceStyle === "MATCH_1X2" || !bet.choiceStyle)) {
                                // Filter out common "Draw" options
                                const potentialTeams = bet.options.filter(o => {
                                    const t = o.text.toLowerCase();
                                    return t !== "draw" && t !== "tie" && t !== "x" && t !== "unentschieden";
                                });
                                if (potentialTeams.length >= 2) {
                                    home = potentialTeams[0].text;
                                    away = potentialTeams[1].text;
                                }
                            }
                        }

                        if (!home || !away) return null;

                        return (
                            <div className="flex items-center justify-center gap-2 md:gap-4 mb-5 pb-4 border-b-2 border-dashed border-slate-100">
                                {/* HOME TEAM */}
                                <div className="flex flex-col items-center w-5/12 max-w-[160px]">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-tight h-4 mb-2 line-clamp-1 w-full text-center overflow-hidden text-ellipsis whitespace-nowrap">{home}</span>

                                    <div className="flex flex-col items-center gap-1 w-full">
                                        <div className="flex items-center justify-center gap-2 w-full">
                                            {/* Home Logo - Interactive for CHOICE */}
                                            {(() => {
                                                // Find matching option for Home
                                                const homeOptIdx = bet.type === "CHOICE" ? bet.options?.findIndex(o => o.text.toLowerCase().includes(home!.toLowerCase())) : -1;
                                                const isClickable = bet.type === "CHOICE" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && homeOptIdx !== -1;
                                                const isSelected = selectedOption === String(homeOptIdx);

                                                const LogoComp = (
                                                    <TeamLogo teamName={home} size={52} className={`drop-shadow-sm transition-all ${isSelected ? "scale-110 drop-shadow-md" : ""}`} />
                                                );

                                                if (isClickable) {
                                                    return (
                                                        <button
                                                            onClick={() => setSelectedOption(String(homeOptIdx))}
                                                            className={`p-1 rounded-full border-4 transition-all ${isSelected ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-slate-50 hover:scale-105"}`}
                                                        >
                                                            {LogoComp}
                                                        </button>
                                                    );
                                                }
                                                return <div className="shrink-0">{LogoComp}</div>;
                                            })()}

                                            {/* INPUT FIELD (Match betting) */}
                                            {bet.type === "MATCH" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) ? (
                                                <input
                                                    type="number"
                                                    value={matchHome}
                                                    onChange={e => setMatchHome(Number(e.target.value))}
                                                    className="w-12 h-11 text-center text-xl font-black bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-black focus:ring-0 outline-none transition-all shadow-sm shrink-0 p-0"
                                                    placeholder="-"
                                                />
                                            ) : (
                                                /* Spacer */
                                                (bet.type === "MATCH" && !userWager && bet.status === "OPEN") && <div className="w-12 h-11 shrink-0" />
                                            )}
                                        </div>
                                        {/* HOME ODDS - Zero Sum Only */}
                                        {mode === "ZERO_SUM" && bet.type === "CHOICE" && bet.options && (() => {
                                            const homeOptIdx = bet.options.findIndex(o => o.text.toLowerCase().includes(home!.toLowerCase()));
                                            if (homeOptIdx === -1) return null;
                                            const opt = bet.options[homeOptIdx];
                                            const odds = opt.totalWagered > 0 && bet.totalPool > 0
                                                ? (bet.totalPool / opt.totalWagered).toFixed(2)
                                                : "2.00";
                                            return (
                                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    @{odds}x
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="text-xl font-black text-slate-200 italic">VS</div>
                                    {/* DRAW BUTTON (For Choice Bets) */}
                                    {(() => {
                                        if (bet.type !== "CHOICE" || !bet.options) return null;
                                        const drawIdx = bet.options.findIndex(o => {
                                            const t = o.text.toLowerCase();
                                            return t === "draw" || t === "tie" || t === "x" || t === "unentschieden";
                                        });
                                        if (drawIdx !== -1 && bet.status === "OPEN" && !isExpired && (!userWager || isEditing)) {
                                            const isSelected = selectedOption === String(drawIdx);
                                            const drawOpt = bet.options[drawIdx];
                                            const drawOdds = drawOpt.totalWagered > 0 && bet.totalPool > 0
                                                ? (bet.totalPool / drawOpt.totalWagered).toFixed(2)
                                                : "3.00";
                                            return (
                                                <div className="flex flex-col items-center gap-1 mt-1">
                                                    <button
                                                        onClick={() => setSelectedOption(String(drawIdx))}
                                                        className={`px-3 py-0.5 text-[10px] font-black uppercase rounded border-2 transition-all ${isSelected ? "bg-slate-600 text-white border-slate-800" : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"}`}
                                                    >
                                                        Draw
                                                    </button>
                                                    {/* DRAW ODDS - Zero Sum Only */}
                                                    {mode === "ZERO_SUM" && (
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            @{drawOdds}x
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>


                                {/* AWAY TEAM */}
                                <div className="flex flex-col items-center w-5/12 max-w-[160px]">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-tight h-4 mb-2 line-clamp-1 w-full text-center overflow-hidden text-ellipsis whitespace-nowrap">{away}</span>

                                    <div className="flex flex-col items-center gap-1 w-full">
                                        <div className="flex items-center justify-center gap-2 w-full">
                                            {/* INPUT FIELD (Match betting) */}
                                            {bet.type === "MATCH" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) ? (
                                                <input
                                                    type="number"
                                                    value={matchAway}
                                                    onChange={e => setMatchAway(Number(e.target.value))}
                                                    className="w-12 h-11 text-center text-xl font-black bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-black focus:ring-0 outline-none transition-all shadow-sm shrink-0 p-0"
                                                    placeholder="-"
                                                />
                                            ) : (
                                                /* Spacer */
                                                (bet.type === "MATCH" && !userWager && bet.status === "OPEN") && <div className="w-12 h-11 shrink-0" />
                                            )}

                                            {/* Away Logo - Interactive for CHOICE */}
                                            {(() => {
                                                const awayOptIdx = bet.type === "CHOICE" ? bet.options?.findIndex(o => o.text.toLowerCase().includes(away!.toLowerCase())) : -1;
                                                const isClickable = bet.type === "CHOICE" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && awayOptIdx !== -1;
                                                const isSelected = selectedOption === String(awayOptIdx);

                                                const LogoComp = (
                                                    <TeamLogo teamName={away} size={52} className={`drop-shadow-sm transition-all ${isSelected ? "scale-110 drop-shadow-md" : ""}`} />
                                                );

                                                if (isClickable) {
                                                    return (
                                                        <button
                                                            onClick={() => setSelectedOption(String(awayOptIdx))}
                                                            className={`p-1 rounded-full border-4 transition-all ${isSelected ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-slate-50 hover:scale-105"}`}
                                                        >
                                                            {LogoComp}
                                                        </button>
                                                    );
                                                }
                                                return <div className="shrink-0">{LogoComp}</div>;
                                            })()}
                                        </div>
                                        {/* AWAY ODDS - Zero Sum Only */}
                                        {mode === "ZERO_SUM" && bet.type === "CHOICE" && bet.options && (() => {
                                            const awayOptIdx = bet.options.findIndex(o => o.text.toLowerCase().includes(away!.toLowerCase()));
                                            if (awayOptIdx === -1) return null;
                                            const opt = bet.options[awayOptIdx];
                                            const odds = opt.totalWagered > 0 && bet.totalPool > 0
                                                ? (bet.totalPool / opt.totalWagered).toFixed(2)
                                                : "2.00";
                                            return (
                                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    @{odds}x
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* 1. OPEN STATE: BET OPTIONS */}
                    {bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                        <div className="space-y-3">
                            {/* CHOICE BETS */}
                            {bet.type === "CHOICE" && bet.options && (
                                <div className="space-y-2">
                                    {/* Only render list if this is NOT a visual match choice */}
                                    {(() => {
                                        // If choiceStyle is MATCH_WINNER or MATCH_1X2, hide the list (use visual header)
                                        if (bet.choiceStyle === "MATCH_WINNER" || bet.choiceStyle === "MATCH_1X2") {
                                            return null;
                                        }

                                        // If choiceStyle is VARIOUS, always show the list
                                        if (bet.choiceStyle === "VARIOUS") {
                                            // Show list below
                                        } else {
                                            // Legacy bets without choiceStyle - use detection logic
                                            let home = bet.matchDetails?.homeTeam;
                                            let away = bet.matchDetails?.awayTeam;

                                            if (!home && !away) {
                                                if (bet.question.toLowerCase().includes(" vs ")) {
                                                    const parts = bet.question.split(/ vs /i);
                                                    if (parts.length === 2) { home = parts[0].trim(); away = parts[1].trim(); }
                                                } else if (bet.options && bet.options.length >= 2) {
                                                    const potentialTeams = bet.options.filter(o => {
                                                        const t = o.text.toLowerCase();
                                                        return t !== "draw" && t !== "tie" && t !== "x" && t !== "unentschieden";
                                                    });
                                                    if (potentialTeams.length >= 2) {
                                                        home = potentialTeams[0].text;
                                                        away = potentialTeams[1].text;
                                                    }
                                                }
                                            }

                                            // If we detected visual mapping for legacy bets, hide list
                                            const hasVisualMapping = home && away && bet.options && (
                                                bet.options.some(o => o.text.toLowerCase().includes(home!.toLowerCase())) ||
                                                bet.options.some(o => o.text.toLowerCase().includes(away!.toLowerCase()))
                                            );

                                            if (hasVisualMapping) return null;
                                        }

                                        // Show the list

                                        // Fallback to list
                                        return bet.options!.map((opt, idx) => (
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
                                                {/* Odds calculation - Zero Sum Only */}
                                                {mode === "ZERO_SUM" && (
                                                    <span className={`text-xs font-black ${selectedOption === String(idx) ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200"} px-2 py-1 rounded-full border`}>
                                                        @{opt.totalWagered > 0 && bet.totalPool > 0
                                                            ? (bet.totalPool / opt.totalWagered).toFixed(2)
                                                            : "2.00"}x
                                                    </span>
                                                )}
                                            </label>
                                        ));
                                    })()}
                                </div>
                            )}

                            {/* MATCH INPUTS Removed from here (now in header) */}

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

                            {/* WAGER ACTION BAR */}
                            <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 flex gap-3 items-center">
                                {/* Power Up Booster (Compact Radial Menu) */}
                                {mode === "STANDARD" && powerUps && (
                                    <div className="mr-1">
                                        <CompactPowerBooster
                                            powerUps={powerUps}
                                            selectedPowerUp={selectedPowerUp}
                                            onSelect={setSelectedPowerUp}
                                        />
                                    </div>
                                )}

                                {mode === "ZERO_SUM" && (
                                    <div className="relative w-28 shrink-0">
                                        <input
                                            type="number"
                                            value={wagerAmount}
                                            onChange={e => {
                                                const val = e.target.value;
                                                // Allow empty string for better UX when clearing
                                                setWagerAmount(val === "" ? "" : Number(val));
                                            }}
                                            className="w-full h-12 pl-3 pr-8 rounded-xl border-2 border-slate-300 font-bold text-sm focus:border-black focus:outline-none"
                                            placeholder="Amt"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">PTS</span>
                                    </div>
                                )}

                                <Button
                                    onClick={handlePlaceWager}
                                    disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-black h-12 rounded-xl hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? "✓ Update" : "Place Bet")}
                                </Button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        disabled={loading}
                                        className="bg-gray-200 text-black font-black h-12 w-12 rounded-xl hover:bg-gray-300 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl"
                                    >
                                        ✕
                                    </button>
                                )}
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
                                {(bet.type === "CHOICE" && bet.options) && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-slate-400">Winning Option ({winningOption}):</div>
                                        <select
                                            value={winningOption}
                                            onChange={e => setWinningOption(e.target.value)}
                                            className="w-full p-2 text-sm font-bold border-2 border-slate-200 rounded mb-2"
                                        >
                                            <option value="">Select Winner...</option>
                                            {bet.options.map((o, i) => <option key={i} value={String(i)}>{o.text}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Match Inputs for Owner */}
                                {bet.type === "MATCH" && (
                                    <div className="flex items-center gap-2 mb-2 justify-center">
                                        <input
                                            placeholder="Home"
                                            type="number"
                                            value={resHome}
                                            onChange={(e) => setResHome(Number(e.target.value))}
                                            className="w-16 p-1 text-center border-2 rounded font-bold"
                                        />
                                        <span>-</span>
                                        <input
                                            placeholder="Away"
                                            type="number"
                                            value={resAway}
                                            onChange={(e) => setResAway(Number(e.target.value))}
                                            className="w-16 p-1 text-center border-2 rounded font-bold"
                                        />
                                    </div>
                                )}

                                {/* Range Inputs for Owner */}
                                {bet.type === "RANGE" && (
                                    <div className="mb-2">
                                        <input
                                            placeholder="Correct Value"
                                            type="number"
                                            value={winningRange}
                                            onChange={(e) => setWinningRange(Number(e.target.value))}
                                            className="w-full p-2 text-center border-2 rounded font-bold"
                                        />
                                    </div>
                                )}

                                {/* Confirm Button - Enabled if any result data is present */}
                                {(winningOption !== "" || winningRange !== "" || (resHome !== "" && resAway !== "")) && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                        {aiHighlighted && <div className="text-xs text-center text-purple-600 font-bold mb-1">AI Recommendation Filled Below</div>}
                                        <Button onClick={handleResolve} disabled={loading} className={`w-full font-bold h-9 text-xs shadow-md ${aiHighlighted ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-900 hover:bg-slate-800'} text-white transition-all`}>
                                            {aiHighlighted ? "Confirm AI Result" : "Confirm Result"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. PROOFING / RESOLVED: VERIFICATION SOURCE */}
                    {/* 3. PROOFING / RESOLVED: VERIFICATION SOURCE */}
                    {(bet.status === "PROOFING" || bet.status === "RESOLVED") && (
                        <div className={`mt-2 rounded-lg p-3 flex items-start gap-3 border ${bet.status === "PROOFING" ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}>
                            {/* Source Icon/Avatar */}
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs shrink-0 ${bet.status === "PROOFING" ? "bg-green-500" : "bg-slate-500"}`}>
                                {(bet.verification?.source || verificationData?.source) ? (bet.verification?.source || verificationData?.source).substring(0, 3).toUpperCase() : "AI"}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold uppercase tracking-wide mb-0.5 opacity-70">Verified Result</div>
                                <div className="font-black text-slate-800 mb-1 text-base">
                                    {(() => {
                                        // First show the winning outcome (which option won)
                                        if (typeof bet.winningOutcome === 'object') return `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`;
                                        if (bet.type === "CHOICE" && bet.options) return bet.options[Number(bet.winningOutcome)]?.text || String(bet.winningOutcome);
                                        return String(bet.winningOutcome);
                                    })()}
                                </div>

                                {/* Show the actual numerical value if different from outcome (e.g., "5 yellow cards") */}
                                {((bet.verification as any)?.actualValue !== undefined || verificationData?.actualValue !== undefined) && (
                                    <div className="text-sm font-bold text-emerald-600 mb-1">
                                        📊 Actual: {(bet.verification as any)?.actualValue ?? verificationData?.actualValue}
                                    </div>
                                )}

                                <div className="text-[10px] font-medium flex items-center gap-1 opacity-60">
                                    <CheckCircle className="w-3 h-3" />
                                    Source:
                                    {(bet.verification?.url || verificationData?.url) ? (
                                        <a href={bet.verification?.url || verificationData?.url} target="_blank" rel="noopener noreferrer" className="ml-1 hover:underline text-blue-600">
                                            {bet.verification?.source || verificationData?.source || "Link"}
                                        </a>
                                    ) : (
                                        <span className="ml-1">{bet.verification?.source || verificationData?.source || "Manual Entry"}</span>
                                    )}
                                    {(bet.verification?.verifiedAt || verificationData?.verifiedAt) && ` • ${new Date(bet.verification?.verifiedAt || verificationData?.verifiedAt).toLocaleDateString()}`}
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

                            {/* Owner: Finalize Now Button */}
                            {isOwner && bet.status === "PROOFING" && (
                                <button
                                    onClick={handleFinalizeNow}
                                    disabled={loading}
                                    className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-200 uppercase font-black tracking-wide flex items-center gap-1 transition-colors"
                                    title="Skip Proofing & Distribute Payouts"
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    Confirm Now
                                </button>
                            )}

                            {/* TEMP DEBUG RESET BUTTON */}
                            {isOwner && (bet.status === "PROOFING" || bet.status === "RESOLVED") && (
                                <button
                                    onClick={async () => {
                                        if (!confirm("Start Debug Reset? This will revert status to LOCKED.")) return;
                                        try {
                                            const { doc, updateDoc, deleteField, getFirestore } = await import("firebase/firestore");
                                            const db = getFirestore();
                                            await updateDoc(doc(db, "leagues", bet.leagueId, "bets", bet.id), {
                                                status: "LOCKED",
                                                winningOutcome: deleteField(),
                                                verification: deleteField(),
                                                disputeDeadline: deleteField(),
                                                disputeActive: false,
                                                resolvedAt: deleteField(),
                                                resolvedBy: deleteField()
                                            });
                                            alert("Reset successful! Refresh page if updates don't appear.");
                                        } catch (e) {
                                            alert("Reset failed: " + e);
                                        }
                                    }}
                                    className="scale-75 origin-right ml-auto text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 hover:bg-red-200 uppercase font-black tracking-widest opacity-50 hover:opacity-100 transition-all"
                                    title="Debug: Reset to LOCKED"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: TICKET STUB */}
            {
                ticketStatus && !isEditing && (
                    <div
                        className={`relative cursor-pointer transition-transform hover:scale-[1.02] ${userWager && bet.status === "OPEN" && !isExpired ? 'hover:ring-2 hover:ring-blue-400 rounded-lg' : ''}`}
                        onClick={() => {
                            if (isScrolling) return;
                            if (userWager && bet.status === "OPEN" && !isExpired) {
                                handleEditClick();
                            }
                        }}
                        onTouchStart={() => {
                            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                        }}
                        onTouchMove={() => {
                            setIsScrolling(true);
                        }}
                        onTouchEnd={() => {
                            scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 100);
                        }}
                    >
                        <SidePanelTicket
                            status={ticketStatus}
                            wagerStatus={ticketWagerStatus}
                            userSelection={ticketSelectionDisplay}
                            wagerAmount={ticketWagerAmount}
                            potentialPayout={ticketPotential}
                            payout={ticketPayout}
                            isWinning={ticketIsWinning}
                            odds={ticketOdds}
                            currency={mode === "ZERO_SUM" ? "chips" : "pts"}
                            powerUp={ticketPowerUp}
                        />
                    </div>
                )
            }

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
        </motion.div >
    );
}
