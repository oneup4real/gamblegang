"use client";

/**
 * BET CARD V2 - COMPACT VERSION
 * 
 * A new compact bet card that collapses to a single line and expands on tap.
 * Uses real TeamLogo component and production data.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Check, X, AlertTriangle, Lock, Play, Eye,
    ChevronDown, ChevronUp, Timer, Trophy, Flame, Shield,
    ThumbsUp, ThumbsDown, Sparkles, Zap, Target,
    CheckCircle2, XCircle, AlertCircle, Hourglass,
    Pencil, Calendar, Users, TrendingUp, TrendingDown,
    Loader2, BrainCircuit, Gavel, ExternalLink
} from "lucide-react";
import { Bet, Wager, placeWager, editWager, startProofing } from "@/lib/services/bet-service";
import { aiAutoResolveBet } from "@/app/actions/ai-bet-actions";
import { League, PowerUpType, PowerUpInventory } from "@/lib/services/league-service";
import { TeamLogo } from "@/components/team-logo";
import { CompactPowerBooster } from "@/components/compact-power-booster";
import { useAuth } from "@/components/auth-provider";

// ============================================
// STATUS CONFIGURATION
// ============================================
const STATUS_CONFIG = {
    OPEN: {
        label: "Open",
        color: "bg-green-500",
        lightBg: "bg-green-50",
        border: "border-green-200",
        textColor: "text-green-700",
        icon: <Play className="w-3 h-3" />,
        pulseColor: "bg-green-400"
    },
    LOCKED: {
        label: "Locked",
        color: "bg-amber-500",
        lightBg: "bg-amber-50",
        border: "border-amber-200",
        textColor: "text-amber-700",
        icon: <Lock className="w-3 h-3" />,
        pulseColor: "bg-amber-400"
    },
    PROOFING: {
        label: "Proofing",
        color: "bg-blue-500",
        lightBg: "bg-blue-50",
        border: "border-blue-200",
        textColor: "text-blue-700",
        icon: <Eye className="w-3 h-3" />,
        pulseColor: "bg-blue-400"
    },
    DISPUTED: {
        label: "Disputed",
        color: "bg-red-500",
        lightBg: "bg-red-50",
        border: "border-red-200",
        textColor: "text-red-700",
        icon: <AlertTriangle className="w-3 h-3" />,
        pulseColor: "bg-red-400"
    },
    RESOLVED: {
        label: "Resolved",
        color: "bg-emerald-500",
        lightBg: "bg-emerald-50",
        border: "border-emerald-200",
        textColor: "text-emerald-700",
        icon: <Check className="w-3 h-3" />,
        pulseColor: "bg-emerald-400"
    },
    RESOLVED_LOSS: {
        label: "Resolved",
        color: "bg-gray-400",
        lightBg: "bg-gray-50",
        border: "border-gray-200",
        textColor: "text-gray-500",
        icon: <X className="w-3 h-3" />,
        pulseColor: "bg-gray-300"
    },
    INVALID: {
        label: "Invalid",
        color: "bg-gray-400",
        lightBg: "bg-gray-50",
        border: "border-gray-200",
        textColor: "text-gray-600",
        icon: <X className="w-3 h-3" />,
        pulseColor: "bg-gray-400"
    },
    DRAFT: {
        label: "Draft",
        color: "bg-gray-300",
        lightBg: "bg-gray-50",
        border: "border-gray-200",
        textColor: "text-gray-500",
        icon: <Pencil className="w-3 h-3" />,
        pulseColor: "bg-gray-300"
    },
    CANCELLED: {
        label: "Cancelled",
        color: "bg-gray-400",
        lightBg: "bg-gray-50",
        border: "border-gray-200",
        textColor: "text-gray-500",
        icon: <X className="w-3 h-3" />,
        pulseColor: "bg-gray-400"
    }
};

// ============================================
// PROPS INTERFACE
// ============================================
interface BetCardV2Props {
    bet: Bet;
    userPoints: number;
    userWager?: Wager;
    allWagers?: Wager[];  // All wagers for this bet from all players
    mode: "ZERO_SUM" | "STANDARD";
    powerUps?: PowerUpInventory;
    onEdit?: (bet: Bet) => void;
    onWagerSuccess?: () => void;
    isOwnerOverride?: boolean;
    initialExpanded?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================
export function BetCardV2({
    bet,
    userPoints,
    userWager,
    allWagers = [],
    mode,
    powerUps,
    onEdit,
    onWagerSuccess,
    isOwnerOverride,
    initialExpanded = false
}: BetCardV2Props) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [showWagersSection, setShowWagersSection] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [matchHome, setMatchHome] = useState<number | "">("");
    const [matchAway, setMatchAway] = useState<number | "">("");
    const [wagerAmount, setWagerAmount] = useState<number | "">(mode === "STANDARD" ? 0 : 100);
    const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | undefined>();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Owner resolution state
    const [showOwnerControls, setShowOwnerControls] = useState(false);
    const [aiResolving, setAiResolving] = useState(false);
    const [resHome, setResHome] = useState<number | "">("");
    const [resAway, setResAway] = useState<number | "">("");
    const [winningOption, setWinningOption] = useState<string>("");
    const [winningRange, setWinningRange] = useState<number | "">();

    const config = STATUS_CONFIG[bet.status] || STATUS_CONFIG.OPEN;

    // Check if bet is expired
    const isExpired = bet.closesAt && bet.closesAt.toDate() < new Date();
    const effectiveStatus = (bet.status === "OPEN" && isExpired) ? "LOCKED" : bet.status;
    const effectiveConfig = STATUS_CONFIG[effectiveStatus] || config;

    // Determine wager result
    let wagerResult: "WON" | "LOST" | "PUSH" | null = null;
    if (userWager && bet.status === "RESOLVED") {
        wagerResult = (userWager.status?.toUpperCase() as "WON" | "LOST" | "PUSH") || null;
    }

    // Get team names from bet
    const homeTeam = bet.matchDetails?.homeTeam || (bet.options?.[0]?.text);
    const awayTeam = bet.matchDetails?.awayTeam || (bet.options?.[bet.options.length > 2 ? 2 : 1]?.text);

    // Time remaining calculations
    const getTimeRemaining = () => {
        if (!bet.closesAt) return null;
        const now = new Date();
        const closeDate = bet.closesAt.toDate();
        const diff = closeDate.getTime() - now.getTime();
        if (diff < 0) return "Closed";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) return `${Math.floor(hours / 24)}d`;
        return `${hours}h ${minutes}m`;
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

    // Get user's selection display
    const getUserSelectionDisplay = () => {
        if (!userWager) return null;
        if (bet.type === "CHOICE" && bet.options) {
            const idx = Number(userWager.selection);
            return bet.options[idx]?.text || "Option";
        } else if (bet.type === "MATCH" && typeof userWager.selection === "object") {
            const s = userWager.selection as { home: number; away: number };
            return `${s.home} - ${s.away}`;
        } else if (bet.type === "RANGE") {
            return `${userWager.selection} ${bet.rangeUnit || ""}`;
        }
        return String(userWager.selection);
    };

    // Calculate potential win
    const getPotentialWin = () => {
        if (!userWager) return null;
        if (mode === "ZERO_SUM" && bet.type === "CHOICE" && bet.options) {
            const idx = Number(userWager.selection);
            const opt = bet.options[idx];
            if (opt && opt.totalWagered > 0 && bet.totalPool > 0) {
                const odds = bet.totalPool / opt.totalWagered;
                return Math.floor(userWager.amount * odds);
            }
            return userWager.amount * 2;
        } else {
            // Arcade mode
            const settings = bet.arcadePointSettings || { exact: 3, diff: 2, winner: 1, choice: 1, range: 1 };
            let basePoints = (bet.type === "MATCH" ? settings.exact : bet.type === "CHOICE" ? settings.choice : settings.range) || 1;
            let mult = 1;
            if (userWager.powerUp === 'x2') mult = 2;
            if (userWager.powerUp === 'x3') mult = 3;
            if (userWager.powerUp === 'x4') mult = 4;
            return basePoints * mult;
        }
    };

    // Get card styling based on status - V1 style: green for wins, grey for losses
    const getCardStyle = () => {
        if (bet.status === "RESOLVED" && wagerResult === "WON") {
            return "border-emerald-400 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white shadow-emerald-100";
        }
        if (bet.status === "RESOLVED" && wagerResult === "LOST") {
            return "border-gray-300 bg-gradient-to-br from-gray-100 via-gray-50 to-white opacity-75";
        }
        if (bet.status === "RESOLVED" && !userWager) {
            return "border-gray-200 bg-gray-50 opacity-60";
        }
        if (bet.status === "PROOFING" || bet.status === "DISPUTED") {
            return "border-blue-300 bg-gradient-to-r from-blue-50/50 to-white";
        }
        if (effectiveStatus === "LOCKED") {
            return "border-amber-200 bg-gradient-to-r from-amber-50/30 to-white";
        }
        return "border-black bg-white";
    };

    // Get data source display info
    const getDataSourceLabel = () => {
        if (!bet.dataSource) return null;
        if (bet.dataSource === "API") {
            return { label: "📡 SportsDB", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" };
        }
        return { label: "🤖 AI Verified", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" };
    };

    // Format any wager's selection for display
    const formatWagerSelection = (wager: Wager): string => {
        if (bet.type === "CHOICE" && bet.options) {
            const idx = Number(wager.selection);
            return bet.options[idx]?.text || String(wager.selection);
        } else if (bet.type === "MATCH" && typeof wager.selection === "object") {
            const s = wager.selection as { home: number; away: number };
            return `${s.home} - ${s.away}`;
        } else if (bet.type === "RANGE") {
            return `${wager.selection} ${bet.rangeUnit || ""}`;
        }
        return String(wager.selection);
    };

    // Handle placing/editing wager
    const handlePlaceWager = async () => {
        if (!user) return;

        let prediction: any;
        if (bet.type === "CHOICE") {
            if (selectedOption === "") return alert("Please select an option");
            prediction = Number(selectedOption);
        } else if (bet.type === "MATCH") {
            if (matchHome === "" || matchAway === "") return alert("Please enter a score");
            prediction = { home: Number(matchHome), away: Number(matchAway) };
        } else {
            return;
        }

        const amount = mode === "STANDARD" ? 0 : Number(wagerAmount);
        if (mode === "ZERO_SUM" && amount <= 0) return alert("Please enter a wager amount");

        setLoading(true);
        try {
            if (isEditing && userWager) {
                await editWager(bet.leagueId, bet.id, user, amount, prediction, selectedPowerUp);
            } else {
                await placeWager(bet.leagueId, bet.id, user, amount, prediction, selectedPowerUp);
            }
            setIsEditing(false);
            if (onWagerSuccess) onWagerSuccess();
        } catch (error: any) {
            alert(error.message || "Failed to place wager");
        } finally {
            setLoading(false);
        }
    };

    // Check if user is winning in proofing
    const isUserWinning = () => {
        if (!userWager || !bet.winningOutcome) return false;
        if (bet.type === "CHOICE") {
            return String(userWager.selection) === String(bet.winningOutcome);
        }
        if (bet.type === "MATCH") {
            const userSel = userWager.selection as { home: number; away: number };
            const outcome = bet.winningOutcome as { home: number; away: number };
            return userSel.home === outcome.home && userSel.away === outcome.away;
        }
        return false;
    };

    // Calculate live points based on current live score (for LOCKED bets with live data)
    const getLivePointsCalculation = (): { tier: "exact" | "diff" | "winner" | "none"; points: number; mult: number } | null => {
        if (!userWager || !bet.liveScore || bet.liveScore.matchStatus === "NOT_STARTED") return null;
        if (bet.type !== "MATCH" || typeof userWager.selection !== "object") return null;

        const pred = userWager.selection as { home: number; away: number };
        const liveHome = bet.liveScore.homeScore;
        const liveAway = bet.liveScore.awayScore;

        // Get settings
        const settings = bet.arcadePointSettings || { exact: 3, diff: 2, winner: 1 };

        // Get power-up multiplier
        let mult = 1;
        if (userWager.powerUp === "x2") mult = 2;
        if (userWager.powerUp === "x3") mult = 3;
        if (userWager.powerUp === "x4") mult = 4;

        // Check exact match
        if (liveHome === pred.home && liveAway === pred.away) {
            return { tier: "exact", points: (settings.exact || 3) * mult, mult };
        }

        // Check correct difference
        if ((liveHome - liveAway) === (pred.home - pred.away)) {
            // Check draw exclusion
            const isDraw = liveHome === liveAway;
            if (isDraw && settings.excludeDrawDiff) {
                return { tier: "winner", points: (settings.winner || 1) * mult, mult };
            }
            return { tier: "diff", points: (settings.diff || 2) * mult, mult };
        }

        // Check correct tendency/winner
        const liveTendency = liveHome > liveAway ? "H" : (liveHome < liveAway ? "A" : "D");
        const predTendency = pred.home > pred.away ? "H" : (pred.home < pred.away ? "A" : "D");

        if (liveTendency === predTendency) {
            return { tier: "winner", points: (settings.winner || 1) * mult, mult };
        }

        return { tier: "none", points: 0, mult };
    };

    const liveCalc = getLivePointsCalculation();

    // Handle AI auto-resolution
    const handleAIResolve = async () => {
        if (!user || !isOwnerOverride) return;
        setAiResolving(true);
        try {
            const sanitizedBet = {
                ...bet,
                eventDate: bet.eventDate?.toDate?.()
                    ? bet.eventDate.toDate().toISOString()
                    : bet.eventDate,
                matchDetails: bet.matchDetails ? {
                    ...bet.matchDetails,
                    date: bet.matchDetails.date && typeof bet.matchDetails.date === 'object' && 'toDate' in bet.matchDetails.date
                        ? (bet.matchDetails.date as any).toDate().toISOString()
                        : bet.matchDetails.date
                } : undefined
            };

            const result = await aiAutoResolveBet(sanitizedBet);
            if (result) {
                let outcome: any;
                if (result.type === "MATCH") {
                    outcome = { home: result.home, away: result.away };
                    setResHome(result.home || 0);
                    setResAway(result.away || 0);
                } else if (result.type === "CHOICE") {
                    outcome = String(result.optionIndex);
                    setWinningOption(String(result.optionIndex));
                } else if (result.type === "RANGE") {
                    outcome = result.value;
                    setWinningRange(result.value);
                }

                // Immediately start proofing with AI result
                if (outcome !== undefined) {
                    await startProofing(bet.leagueId, bet.id, user, outcome, result.verification);
                    alert("Result submitted! Players now have time to dispute.");
                    if (onWagerSuccess) onWagerSuccess();
                }
            } else {
                alert("AI could not determine the result. Please enter manually.");
            }
        } catch (error: any) {
            console.error("AI resolution failed:", error);
            alert(error.message || "AI resolution failed");
        } finally {
            setAiResolving(false);
        }
    };

    // Handle manual resolution
    const handleManualResolve = async () => {
        if (!user || !isOwnerOverride) return;

        let outcome: string | number | { home: number; away: number };

        if (bet.type === "MATCH") {
            if (resHome === "" || resAway === "") return alert("Please enter both scores");
            outcome = { home: Number(resHome), away: Number(resAway) };
        } else if (bet.type === "CHOICE") {
            if (winningOption === "") return alert("Please select a winning option");
            outcome = winningOption;
        } else if (bet.type === "RANGE") {
            if (winningRange === undefined || winningRange === "") return alert("Please enter a value");
            outcome = Number(winningRange);
        } else {
            return alert("Invalid bet type");
        }

        if (!confirm("Submit this result? Players will have time to dispute before payouts.")) return;

        setLoading(true);
        try {
            const verification = {
                verified: true,
                source: "Manual Entry",
                verifiedAt: new Date().toISOString(),
                method: "MANUAL" as const
            };

            await startProofing(bet.leagueId, bet.id, user, outcome, verification);
            alert("Result submitted! Players now have time to dispute.");
            setShowOwnerControls(false);
            if (onWagerSuccess) onWagerSuccess();
        } catch (error: any) {
            console.error("Manual resolution failed:", error);
            alert(error.message || "Failed to submit result");
        } finally {
            setLoading(false);
        }
    };

    // Check if game is ready for resolution
    const isReadyForResolution = (): boolean => {
        if (bet.dataSource === "API") {
            return bet.liveScore?.matchStatus === "FINISHED";
        } else {
            // For AI bets: check if 2.5h (150 min) after event start OR eventEndDate passed
            const eventEnd = bet.eventEndDate?.seconds
                ? bet.eventEndDate.seconds * 1000
                : bet.eventEndDate?.toDate?.()?.getTime();

            if (eventEnd && Date.now() >= eventEnd) return true;

            const eventStart = bet.eventDate?.seconds
                ? bet.eventDate.seconds * 1000
                : bet.eventDate?.toDate?.()?.getTime();

            if (eventStart) {
                const resolveTime = eventStart + (150 * 60 * 1000); // 2.5 hours
                return Date.now() >= resolveTime;
            }
        }
        return false;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border-2 ${getCardStyle()} shadow-[2px_2px_0_rgba(0,0,0,1)] overflow-hidden transition-all`}
        >
            {/* ==================== COLLAPSED VIEW ==================== */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center gap-3 hover:bg-black/5 transition-colors text-left"
            >
                {/* Status Indicator */}
                <div className="relative shrink-0">
                    <div className={`w-3 h-3 rounded-full ${effectiveConfig.color} border border-black`} />
                    {(effectiveStatus === "OPEN" || bet.status === "PROOFING" || bet.status === "DISPUTED") && (
                        <div className={`absolute inset-0 w-3 h-3 rounded-full ${effectiveConfig.pulseColor} animate-ping opacity-75`} />
                    )}
                </div>

                {/* Question & Prediction */}
                <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${bet.status === "RESOLVED" && wagerResult === "LOST" ? "line-through text-gray-400" : ""}`}>
                        {bet.question}
                    </p>
                    {userWager && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            Your pick:
                            <span className={`font-bold ${wagerResult === "WON" ? "text-emerald-600" : wagerResult === "LOST" ? "text-red-500" : "text-black"}`}>
                                {getUserSelectionDisplay()}
                            </span>
                            {userWager.powerUp && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black text-white ${userWager.powerUp === "x2" ? "bg-lime-500" : userWager.powerUp === "x3" ? "bg-orange-500" : "bg-red-500"
                                    }`}>
                                    {userWager.powerUp}
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* Status-Specific Pills */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* OPEN: Time left + Potential or Bet Now */}
                    {effectiveStatus === "OPEN" && (
                        <>
                            {getTimeRemaining() && (
                                <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                                    <Clock className="w-3 h-3" />
                                    {getTimeRemaining()}
                                </span>
                            )}
                            {!userWager && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                    Bet Now!
                                </span>
                            )}
                            {userWager && getPotentialWin() && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                    +{getPotentialWin()}
                                </span>
                            )}
                        </>
                    )}

                    {/* LOCKED: Live score indicator */}
                    {effectiveStatus === "LOCKED" && (
                        <>
                            {/* Show live score if available */}
                            {bet.liveScore && bet.liveScore.matchStatus !== "NOT_STARTED" && (
                                <span className="flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 rounded-full border border-red-600 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                    {bet.liveScore.homeScore} - {bet.liveScore.awayScore}
                                    <span className="text-[9px] font-bold opacity-80">
                                        {bet.liveScore.matchStatus === "LIVE" ? bet.liveScore.matchTime :
                                            bet.liveScore.matchStatus === "HALFTIME" ? "HT" :
                                                bet.liveScore.matchStatus === "FINISHED" ? "FT" : ""}
                                    </span>
                                </span>
                            )}
                            {/* Fallback LIVE badge if no score yet */}
                            {(!bet.liveScore || bet.liveScore.matchStatus === "NOT_STARTED") && (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    LIVE
                                </span>
                            )}
                        </>
                    )}

                    {/* PROOFING: Countdown or Disputed */}
                    {bet.status === "PROOFING" && (
                        <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Hourglass className="w-3 h-3" />
                            {getDisputeTimeRemaining() || "Verifying..."}
                        </span>
                    )}

                    {bet.status === "DISPUTED" && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            Disputed!
                        </span>
                    )}

                    {/* RESOLVED: Result badge + Data Source */}
                    {bet.status === "RESOLVED" && (
                        <>
                            {/* Data Source Badge */}
                            {bet.dataSource && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${bet.dataSource === "API" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-orange-50 text-orange-600 border-orange-200"}`}>
                                    {bet.dataSource === "API" ? "📡" : "🤖"}
                                </span>
                            )}
                            {/* Result Badge */}
                            <span className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border-2 ${wagerResult === "WON" ? "text-white bg-gradient-to-r from-emerald-500 to-green-500 border-emerald-600 shadow-sm" :
                                wagerResult === "LOST" ? "text-gray-500 bg-gray-100 border-gray-300" :
                                    wagerResult === "PUSH" ? "text-yellow-700 bg-yellow-50 border-yellow-300" :
                                        "text-gray-500 bg-gray-50 border-gray-200"
                                }`}>
                                {wagerResult === "WON" && <><Trophy className="w-3.5 h-3.5" /> +{userWager?.payout || 0}</>}
                                {wagerResult === "LOST" && <><XCircle className="w-3 h-3" /> -{userWager?.amount || 0}</>}
                                {wagerResult === "PUSH" && <><AlertCircle className="w-3 h-3" /> Push</>}
                                {!wagerResult && <><Check className="w-3 h-3" /> Done</>}
                            </span>
                        </>
                    )}

                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
            </button>

            {/* ==================== EXPANDED VIEW ==================== */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t-2 border-dashed border-gray-200 overflow-hidden"
                    >
                        <div className="p-4 space-y-4">
                            {/* Status Banner */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${effectiveConfig.lightBg} border ${effectiveConfig.border}`}>
                                <div className={`p-1 rounded ${effectiveConfig.color} text-white`}>
                                    {effectiveConfig.icon}
                                </div>
                                <div className="flex-1">
                                    <span className={`font-bold text-sm ${effectiveConfig.textColor}`}>{effectiveConfig.label}</span>
                                    {bet.eventDate && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {bet.eventDate.toDate().toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                {bet.dataSource && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bet.dataSource === "API" ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600"
                                        }`}>
                                        {bet.dataSource === "API" ? "📡 API" : "🤖 AI"}
                                    </span>
                                )}
                                {/* Hide edit button for resolved/proofing bets */}
                                {(isOwnerOverride || onEdit) && onEdit && bet.status !== "RESOLVED" && bet.status !== "PROOFING" && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(bet);
                                        }}
                                        className="p-1.5 hover:bg-black/10 rounded-full transition-colors ml-auto"
                                        title="Edit Bet"
                                    >
                                        <Pencil className="w-4 h-4 text-gray-500" />
                                    </button>
                                )}
                            </div>

                            {/* Team Matchup Visual - Hide for MATCH bets when input fields are shown */}
                            {(homeTeam || awayTeam) && bet.choiceStyle !== "VARIOUS" &&
                                !(bet.type === "MATCH" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing)) && (
                                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
                                        {/* Home Team */}
                                        <div className="text-center flex-1">
                                            <button
                                                onClick={() => {
                                                    if (bet.status === "OPEN" && !isExpired && (!userWager || isEditing)) {
                                                        const idx = bet.options?.findIndex(o => o.text.toLowerCase().includes(homeTeam?.toLowerCase() || ""));
                                                        if (idx !== undefined && idx >= 0) setSelectedOption(String(idx));
                                                    }
                                                }}
                                                disabled={bet.status !== "OPEN" || isExpired || (!!userWager && !isEditing)}
                                                className={`p-1 rounded-full border-4 transition-all mx-auto ${selectedOption !== "" && bet.options?.[Number(selectedOption)]?.text.toLowerCase().includes(homeTeam?.toLowerCase() || "")
                                                    ? "border-blue-500 bg-blue-50 scale-110"
                                                    : "border-transparent hover:bg-slate-50"
                                                    }`}
                                            >
                                                <TeamLogo teamName={homeTeam || ""} size={48} className="drop-shadow-sm" />
                                            </button>
                                            <span className="text-xs font-bold mt-1 block truncate max-w-[80px] mx-auto">{homeTeam}</span>
                                            {mode === "ZERO_SUM" && bet.type === "CHOICE" && bet.options && (() => {
                                                const idx = bet.options.findIndex(o => o.text.toLowerCase().includes(homeTeam?.toLowerCase() || ""));
                                                if (idx === -1) return null;
                                                const opt = bet.options[idx];
                                                const odds = opt.totalWagered > 0 && bet.totalPool > 0 ? (bet.totalPool / opt.totalWagered).toFixed(2) : "2.00";
                                                return <span className="text-[10px] font-bold text-emerald-600">@{odds}x</span>;
                                            })()}
                                        </div>

                                        {/* VS + Draw */}
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-xl font-black text-gray-300">VS</span>
                                            {bet.type === "CHOICE" && bet.options && (() => {
                                                const drawIdx = bet.options.findIndex(o => {
                                                    const t = o.text.toLowerCase();
                                                    return t === "draw" || t === "tie" || t === "x" || t === "unentschieden";
                                                });
                                                if (drawIdx === -1) return null;
                                                const canBet = bet.status === "OPEN" && !isExpired && (!userWager || isEditing);
                                                const isSelected = selectedOption === String(drawIdx);
                                                return (
                                                    <button
                                                        onClick={() => canBet && setSelectedOption(String(drawIdx))}
                                                        disabled={!canBet}
                                                        className={`mt-1 px-3 py-0.5 text-[10px] font-black uppercase rounded border-2 transition-all ${isSelected ? "bg-slate-600 text-white border-slate-800" : "bg-white text-slate-400 border-slate-200"
                                                            }`}
                                                    >
                                                        Draw
                                                    </button>
                                                );
                                            })()}
                                        </div>

                                        {/* Away Team */}
                                        <div className="text-center flex-1">
                                            <button
                                                onClick={() => {
                                                    if (bet.status === "OPEN" && !isExpired && (!userWager || isEditing)) {
                                                        const idx = bet.options?.findIndex(o => o.text.toLowerCase().includes(awayTeam?.toLowerCase() || ""));
                                                        if (idx !== undefined && idx >= 0) setSelectedOption(String(idx));
                                                    }
                                                }}
                                                disabled={bet.status !== "OPEN" || isExpired || (!!userWager && !isEditing)}
                                                className={`p-1 rounded-full border-4 transition-all mx-auto ${selectedOption !== "" && bet.options?.[Number(selectedOption)]?.text.toLowerCase().includes(awayTeam?.toLowerCase() || "")
                                                    ? "border-blue-500 bg-blue-50 scale-110"
                                                    : "border-transparent hover:bg-slate-50"
                                                    }`}
                                            >
                                                <TeamLogo teamName={awayTeam || ""} size={48} className="drop-shadow-sm" />
                                            </button>
                                            <span className="text-xs font-bold mt-1 block truncate max-w-[80px] mx-auto">{awayTeam}</span>
                                            {mode === "ZERO_SUM" && bet.type === "CHOICE" && bet.options && (() => {
                                                const idx = bet.options.findIndex(o => o.text.toLowerCase().includes(awayTeam?.toLowerCase() || ""));
                                                if (idx === -1) return null;
                                                const opt = bet.options[idx];
                                                const odds = opt.totalWagered > 0 && bet.totalPool > 0 ? (bet.totalPool / opt.totalWagered).toFixed(2) : "2.00";
                                                return <span className="text-[10px] font-bold text-emerald-600">@{odds}x</span>;
                                            })()}
                                        </div>
                                    </div>
                                )}

                            {/* MATCH type score inputs - V1 Style Layout */}
                            {bet.type === "MATCH" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                    {/* Team Name Headers */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider truncate max-w-[45%]">
                                            {homeTeam || "Home"}
                                        </span>
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider truncate max-w-[45%] text-right">
                                            {awayTeam || "Away"}
                                        </span>
                                    </div>

                                    {/* Logo + Input Row */}
                                    <div className="flex items-center justify-center gap-3">
                                        {/* Home: Logo LEFT, Input RIGHT */}
                                        <div className="flex items-center gap-2">
                                            <TeamLogo teamName={homeTeam || ""} size={48} className="shrink-0" />
                                            <input
                                                type="number"
                                                value={matchHome}
                                                onChange={e => setMatchHome(e.target.value === "" ? "" : Number(e.target.value))}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-14 h-14 text-center text-2xl font-black bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none shadow-sm"
                                                placeholder="-"
                                            />
                                        </div>

                                        {/* VS */}
                                        <span className="text-lg font-bold text-gray-400 px-1">vs</span>

                                        {/* Away: Input LEFT, Logo RIGHT */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={matchAway}
                                                onChange={e => setMatchAway(e.target.value === "" ? "" : Number(e.target.value))}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-14 h-14 text-center text-2xl font-black bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none shadow-sm"
                                                placeholder="-"
                                            />
                                            <TeamLogo teamName={awayTeam || ""} size={48} className="shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* VARIOUS choice options */}
                            {bet.type === "CHOICE" && bet.choiceStyle === "VARIOUS" && bet.options && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <div className="space-y-2">
                                    {bet.options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedOption(String(idx))}
                                            className={`w-full p-3 rounded-lg border-2 text-left font-bold text-sm transition-all ${selectedOption === String(idx)
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-400"
                                                }`}
                                        >
                                            {opt.text}
                                            {mode === "ZERO_SUM" && opt.totalWagered > 0 && bet.totalPool > 0 && (
                                                <span className="float-right text-emerald-600">
                                                    @{(bet.totalPool / opt.totalWagered).toFixed(2)}x
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Wager amount (Zero-Sum) */}
                            {mode === "ZERO_SUM" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-500">Wager:</span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {[50, 100, 250, 500].map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => setWagerAmount(amt)}
                                                disabled={amt > userPoints}
                                                className={`px-3 py-1.5 rounded-lg font-bold text-sm border-2 transition-all ${wagerAmount === amt
                                                    ? "bg-blue-500 text-white border-blue-600"
                                                    : amt > userPoints
                                                        ? "bg-gray-100 text-gray-400 border-gray-200"
                                                        : "bg-white border-black hover:bg-gray-50"
                                                    }`}
                                            >
                                                {amt}
                                            </button>
                                        ))}
                                        {/* Custom Amount Input */}
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={wagerAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? "" : Math.min(Number(e.target.value), userPoints);
                                                    setWagerAmount(val);
                                                }}
                                                min={1}
                                                max={userPoints}
                                                placeholder="Custom"
                                                className="w-20 px-2 py-1.5 rounded-lg font-bold text-sm border-2 border-gray-300 focus:border-blue-500 outline-none text-center"
                                            />
                                            <span className="text-xs text-gray-400">pts</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        Max: {userPoints.toLocaleString()} pts
                                    </p>
                                </div>
                            )}

                            {/* Power-ups + Place Bet (Same Row) */}
                            {bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <div className="flex items-center gap-2">
                                    {/* Power-ups (Arcade mode) */}
                                    {mode === "STANDARD" && powerUps && (
                                        <CompactPowerBooster
                                            powerUps={powerUps}
                                            selectedPowerUp={selectedPowerUp}
                                            onSelect={setSelectedPowerUp}
                                        />
                                    )}

                                    {/* Place Bet Button */}
                                    <button
                                        onClick={handlePlaceWager}
                                        disabled={loading}
                                        className="flex-1 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-black text-base border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Processing..." : isEditing ? "Update Bet" : "Place Bet"}
                                    </button>
                                </div>
                            )}

                            {/* Already bet - show edit option */}
                            {bet.status === "OPEN" && !isExpired && userWager && !isEditing && (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                                    <div>
                                        <p className="text-xs text-green-600 font-bold">Bet Placed ✓</p>
                                        <p className="text-sm font-black text-green-700">
                                            {getUserSelectionDisplay()} {userWager.powerUp && `(${userWager.powerUp})`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            if (bet.type === "CHOICE") setSelectedOption(String(userWager.selection));
                                            if (bet.type === "MATCH") {
                                                const sel = userWager.selection as { home: number; away: number };
                                                setMatchHome(sel.home);
                                                setMatchAway(sel.away);
                                            }
                                            if (userWager.powerUp) setSelectedPowerUp(userWager.powerUp as PowerUpType);
                                        }}
                                        className="px-3 py-1.5 bg-white text-green-700 rounded-lg text-xs font-bold border border-green-300 hover:bg-green-100"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}

                            {/* LOCKED state message with live score */}
                            {effectiveStatus === "LOCKED" && (
                                <div className="text-center py-4">
                                    {/* Live Score Display */}
                                    {bet.liveScore && bet.liveScore.matchStatus !== "NOT_STARTED" && (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl border-2 border-black">
                                            <div className="flex items-center justify-center gap-1 mb-2">
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                                    {bet.liveScore.matchStatus === "LIVE" ? "LIVE" :
                                                        bet.liveScore.matchStatus === "HALFTIME" ? "HALFTIME" :
                                                            bet.liveScore.matchStatus === "FINISHED" ? "FULL TIME" : "IN PROGRESS"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-3xl font-black text-white">{bet.liveScore.homeScore}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate max-w-[80px]">{homeTeam}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-gray-500">:</p>
                                                    {bet.liveScore.matchTime && bet.liveScore.matchStatus === "LIVE" && (
                                                        <p className="text-[10px] text-emerald-400 font-black">{bet.liveScore.matchTime}</p>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-3xl font-black text-white">{bet.liveScore.awayScore}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate max-w-[80px]">{awayTeam}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fallback if no live score available */}
                                    {(!bet.liveScore || bet.liveScore.matchStatus === "NOT_STARTED") && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200">
                                            <Timer className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-500">No live results for this bet</span>
                                        </div>
                                    )}

                                    {/* User Prediction + Live Points Calculator */}
                                    {userWager && (
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-600 mb-2">
                                                You predicted: <span className="font-black text-black">{getUserSelectionDisplay()}</span>
                                                {userWager.powerUp && (
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-black text-white ${userWager.powerUp === "x2" ? "bg-lime-500" :
                                                        userWager.powerUp === "x3" ? "bg-orange-500" : "bg-red-500"
                                                        }`}>
                                                        {userWager.powerUp}
                                                    </span>
                                                )}
                                            </p>

                                            {/* Live Points Calculator - only for match bets with live scores */}
                                            {liveCalc && bet.liveScore && bet.liveScore.matchStatus !== "NOT_STARTED" && mode === "STANDARD" && (
                                                <div className={`mt-3 p-3 rounded-xl border-2 ${liveCalc.tier === "exact" ? "bg-emerald-50 border-emerald-300" :
                                                    liveCalc.tier === "diff" ? "bg-blue-50 border-blue-300" :
                                                        liveCalc.tier === "winner" ? "bg-yellow-50 border-yellow-300" :
                                                            "bg-red-50 border-red-300"
                                                    }`}>
                                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">
                                                        Live Point Calculator
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {/* Exact */}
                                                        <div className={`flex items-center justify-between text-xs ${liveCalc.tier === "exact" ? "text-emerald-700 font-bold" : "text-gray-400"
                                                            }`}>
                                                            <span className="flex items-center gap-1">
                                                                {liveCalc.tier === "exact" ? "🎯" : "○"} Exact Match
                                                            </span>
                                                            <span>
                                                                {liveCalc.tier === "exact" ? (
                                                                    <span className="text-emerald-600 font-black">
                                                                        +{liveCalc.points} pts
                                                                    </span>
                                                                ) : (
                                                                    <span className="line-through">
                                                                        +{(bet.arcadePointSettings?.exact || 3) * liveCalc.mult}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {/* Diff */}
                                                        <div className={`flex items-center justify-between text-xs ${liveCalc.tier === "diff" ? "text-blue-700 font-bold" : "text-gray-400"
                                                            }`}>
                                                            <span className="flex items-center gap-1">
                                                                {liveCalc.tier === "diff" ? "📊" : "○"} Correct Difference
                                                            </span>
                                                            <span>
                                                                {liveCalc.tier === "diff" ? (
                                                                    <span className="text-blue-600 font-black">
                                                                        +{liveCalc.points} pts
                                                                    </span>
                                                                ) : (
                                                                    <span className={liveCalc.tier === "exact" ? "line-through" : ""}>
                                                                        +{(bet.arcadePointSettings?.diff || 2) * liveCalc.mult}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {/* Winner */}
                                                        <div className={`flex items-center justify-between text-xs ${liveCalc.tier === "winner" ? "text-yellow-700 font-bold" : "text-gray-400"
                                                            }`}>
                                                            <span className="flex items-center gap-1">
                                                                {liveCalc.tier === "winner" ? "✓" : "○"} Correct Winner
                                                            </span>
                                                            <span>
                                                                {liveCalc.tier === "winner" ? (
                                                                    <span className="text-yellow-600 font-black">
                                                                        +{liveCalc.points} pts
                                                                    </span>
                                                                ) : (
                                                                    <span className={["exact", "diff"].includes(liveCalc.tier) ? "line-through" : ""}>
                                                                        +{(bet.arcadePointSettings?.winner || 1) * liveCalc.mult}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Total */}
                                                    <div className={`mt-2 pt-2 border-t flex items-center justify-between ${liveCalc.points > 0 ? "border-emerald-200" : "border-red-200"
                                                        }`}>
                                                        <span className="text-xs font-bold text-gray-600">
                                                            {liveCalc.points > 0 ? "Projected:" : "Currently not scoring"}
                                                        </span>
                                                        {liveCalc.points > 0 ? (
                                                            <span className="text-lg font-black text-emerald-600">
                                                                +{liveCalc.points} pts
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-red-500 font-bold">
                                                                Score needs to change
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* OWNER CONTROLS - For Locked bets ready for resolution */}
                            {(effectiveStatus === "LOCKED" || (bet.status === "OPEN" && isExpired)) &&
                                isOwnerOverride && isReadyForResolution() && (
                                    <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
                                        {/* Toggle Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowOwnerControls(!showOwnerControls);
                                            }}
                                            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-slate-600" />
                                                <span className="text-xs font-bold text-slate-700 uppercase">Owner Controls</span>
                                            </div>
                                            {showOwnerControls ? (
                                                <ChevronUp className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                            )}
                                        </button>

                                        {/* Owner Controls Panel */}
                                        <AnimatePresence>
                                            {showOwnerControls && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-2 space-y-2">
                                                        {/* AI Resolve Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAIResolve();
                                                            }}
                                                            disabled={aiResolving}
                                                            className="w-full flex items-center justify-between p-2.5 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-sm transition-all"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center">
                                                                    <BrainCircuit className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="font-bold text-slate-700 text-sm">AI Auto-Resolve</span>
                                                            </div>
                                                            {aiResolving ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                                            ) : (
                                                                <span className="text-[10px] text-purple-500 font-bold uppercase">Fastest</span>
                                                            )}
                                                        </button>

                                                        {/* Manual Entry Section */}
                                                        <div className="p-2.5 bg-white border-2 border-gray-200 rounded-lg space-y-2">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center">
                                                                    <Gavel className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="font-bold text-slate-700 text-sm">Manual Entry</span>
                                                            </div>

                                                            {/* CHOICE bet - Dropdown */}
                                                            {bet.type === "CHOICE" && bet.options && (
                                                                <select
                                                                    value={winningOption}
                                                                    onChange={(e) => setWinningOption(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full p-2 text-sm font-bold border-2 border-gray-200 rounded-lg focus:border-blue-400 outline-none"
                                                                >
                                                                    <option value="">Select Winner...</option>
                                                                    {bet.options.map((o: any, i: number) => (
                                                                        <option key={i} value={String(i)}>{o.text}</option>
                                                                    ))}
                                                                </select>
                                                            )}

                                                            {/* MATCH bet - Score inputs */}
                                                            {bet.type === "MATCH" && (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={resHome}
                                                                        onChange={(e) => setResHome(e.target.value === "" ? "" : Number(e.target.value))}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        placeholder="Home"
                                                                        className="w-16 p-2 text-center font-bold border-2 border-gray-200 rounded-lg focus:border-blue-400 outline-none"
                                                                    />
                                                                    <span className="font-bold text-gray-400">-</span>
                                                                    <input
                                                                        type="number"
                                                                        value={resAway}
                                                                        onChange={(e) => setResAway(e.target.value === "" ? "" : Number(e.target.value))}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        placeholder="Away"
                                                                        className="w-16 p-2 text-center font-bold border-2 border-gray-200 rounded-lg focus:border-blue-400 outline-none"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* RANGE bet - Value input */}
                                                            {bet.type === "RANGE" && (
                                                                <input
                                                                    type="number"
                                                                    value={winningRange}
                                                                    onChange={(e) => setWinningRange(e.target.value === "" ? "" : Number(e.target.value))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    placeholder={`Enter value ${bet.rangeUnit ? `(${bet.rangeUnit})` : ""}`}
                                                                    className="w-full p-2 text-center font-bold border-2 border-gray-200 rounded-lg focus:border-blue-400 outline-none"
                                                                />
                                                            )}

                                                            {/* Confirm Button */}
                                                            {(winningOption !== "" || (resHome !== "" && resAway !== "") || (winningRange !== undefined && winningRange !== "")) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleManualResolve();
                                                                    }}
                                                                    disabled={loading}
                                                                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                                >
                                                                    {loading ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <Check className="w-4 h-4" />
                                                                            Confirm Result
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                            {/* PROOFING state */}
                            {bet.status === "PROOFING" && bet.winningOutcome && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <p className="text-xs text-blue-600 font-bold mb-1">Proposed Result</p>
                                        <p className="text-lg font-black text-blue-800">
                                            {typeof bet.winningOutcome === "object"
                                                ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                                                : bet.options?.[Number(bet.winningOutcome)]?.text || String(bet.winningOutcome)
                                            }
                                        </p>
                                    </div>

                                    {userWager && (
                                        <div className={`p-3 rounded-xl border ${isUserWinning() ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                                            }`}>
                                            {isUserWinning() ? (
                                                <p className="text-sm font-bold text-green-700 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    You're winning! Potential: +{getPotentialWin()}
                                                </p>
                                            ) : (
                                                <p className="text-sm font-bold text-red-600 flex items-center gap-2">
                                                    <XCircle className="w-4 h-4" />
                                                    This result means you lose
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-center text-gray-500">
                                        Auto-confirm in <span className="font-bold text-blue-600">{getDisputeTimeRemaining()}</span>
                                    </p>
                                </div>
                            )}

                            {/* RESOLVED state - V1 Ticket Style */}
                            {bet.status === "RESOLVED" && (
                                <div className={`p-4 rounded-xl ${wagerResult === "WON"
                                    ? "bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-50 border-2 border-emerald-300"
                                    : wagerResult === "LOST"
                                        ? "bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200"
                                        : "bg-gray-50 border border-gray-200"
                                    }`}>
                                    {/* Result Header */}
                                    {/* WIN/LOSS Badge + Final Result - Same Row */}
                                    <div className="flex items-center justify-between mb-2">
                                        {/* Win/Loss Badge */}
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${wagerResult === "WON"
                                            ? "bg-emerald-500 text-white"
                                            : wagerResult === "LOST"
                                                ? "bg-gray-400 text-white"
                                                : "bg-gray-300 text-gray-700"
                                            }`}>
                                            {wagerResult === "WON" ? <Trophy className="w-3.5 h-3.5" /> :
                                                wagerResult === "LOST" ? <X className="w-3.5 h-3.5" /> :
                                                    <Check className="w-3.5 h-3.5" />}
                                            <span className="font-black text-xs">
                                                {wagerResult === "WON" ? "WIN" : wagerResult === "LOST" ? "LOSS" : wagerResult === "PUSH" ? "PUSH" : "DONE"}
                                            </span>
                                        </div>

                                        {/* Final Result */}
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Final Result</p>
                                            <p className="text-xl font-black text-gray-800">
                                                {typeof bet.winningOutcome === "object"
                                                    ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                                                    : bet.options?.[Number(bet.winningOutcome)]?.text || String(bet.winningOutcome)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Verification Source - Clickable Link */}
                                    {bet.verification && (
                                        <div className="flex items-center justify-between gap-2 mb-2 p-2 bg-white/80 rounded-lg border border-gray-200">
                                            {/* Left: AI/API Badge + Date */}
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${bet.dataSource === "API" || bet.verification.source?.toLowerCase().includes("sportsdb") || bet.verification.source?.toLowerCase().includes("api")
                                                    ? "bg-purple-100 text-purple-700"
                                                    : bet.dataSource === "AI" || bet.verification.source?.toLowerCase().includes("ai")
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                    {bet.dataSource === "API" ? "📡 API" :
                                                        bet.dataSource === "AI" ? "🤖 AI" :
                                                            bet.verification.method === "MANUAL" ? "✋ Manual" : "✓"}
                                                </div>
                                                {/* Resolved Date */}
                                                {bet.verification.verifiedAt && (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {new Date(bet.verification.verifiedAt).toLocaleDateString(undefined, {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Right: Source Link */}
                                            {bet.verification.url ? (
                                                <a
                                                    href={bet.verification.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                >
                                                    <span className="font-medium truncate max-w-[120px]">
                                                        {bet.verification.source || "View Source"}
                                                    </span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ) : bet.verification.source && (
                                                <span className="text-[10px] text-gray-500 font-medium truncate max-w-[120px]">
                                                    {bet.verification.source}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Cashout/Payout Display */}
                                    {userWager && (
                                        <div className={`p-3 rounded-lg text-center ${wagerResult === "WON"
                                            ? "bg-white/80 border border-emerald-200"
                                            : "bg-white/50 border border-gray-200"
                                            }`}>
                                            <p className="text-xs text-gray-500 mb-1">Your Bet: <span className="font-bold">{getUserSelectionDisplay()}</span></p>
                                            {wagerResult === "WON" ? (
                                                <>
                                                    <p className="text-3xl font-black text-emerald-600">+{userWager.payout || 0}</p>
                                                    <p className="text-xs text-emerald-600 font-bold">Points Won</p>
                                                </>
                                            ) : wagerResult === "LOST" ? (
                                                <>
                                                    <p className="text-2xl font-black text-gray-400">-{userWager.amount || 0}</p>
                                                    <p className="text-xs text-gray-400">Points Lost</p>
                                                </>
                                            ) : wagerResult === "PUSH" ? (
                                                <>
                                                    <p className="text-xl font-black text-yellow-600">±0</p>
                                                    <p className="text-xs text-yellow-600">Refunded</p>
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500">No wager placed</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==================== ALL WAGERS SECTION ==================== */}
                            {allWagers.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                                    {/* Toggle Header */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowWagersSection(!showWagersSection);
                                        }}
                                        className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-500" />
                                            <span className="text-xs font-bold text-gray-600 uppercase">
                                                All Wagers ({allWagers.length})
                                            </span>
                                            {/* Quick summary */}
                                            {bet.status === "RESOLVED" && (
                                                <div className="flex items-center gap-2 text-[10px]">
                                                    <span className="text-green-600 font-bold">
                                                        {allWagers.filter(w => w.status === "WON").length} won
                                                    </span>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="text-gray-400 font-bold">
                                                        {allWagers.filter(w => w.status === "LOST").length} lost
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {showWagersSection ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>

                                    {/* Wagers List - Expandable */}
                                    <AnimatePresence>
                                        {showWagersSection && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                    {allWagers
                                                        .sort((a, b) => (b.payout || 0) - (a.payout || 0))
                                                        .map((wager, idx) => (
                                                            <motion.div
                                                                key={wager.id || idx}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: idx * 0.03 }}
                                                                className={`flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all ${wager.status === "WON"
                                                                    ? "bg-green-50 border-green-200"
                                                                    : wager.status === "LOST"
                                                                        ? "bg-gray-50 border-gray-200"
                                                                        : "bg-white border-gray-200"
                                                                    }`}
                                                            >
                                                                {/* Avatar */}
                                                                <div className="relative shrink-0">
                                                                    {wager.userAvatar ? (
                                                                        <img
                                                                            src={wager.userAvatar}
                                                                            alt={wager.userName}
                                                                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm">
                                                                            {wager.userName?.substring(0, 2).toUpperCase() || "??"}
                                                                        </div>
                                                                    )}
                                                                    {/* Status Badge */}
                                                                    {wager.status === "WON" && (
                                                                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5 border border-white">
                                                                            <Trophy className="h-2 w-2 text-white" />
                                                                        </div>
                                                                    )}
                                                                    {wager.status === "LOST" && (
                                                                        <div className="absolute -bottom-0.5 -right-0.5 bg-gray-400 rounded-full p-0.5 border border-white">
                                                                            <X className="h-2 w-2 text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Player Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-xs truncate">{wager.userName || "Player"}</div>
                                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-medium">Pick: {formatWagerSelection(wager)}</span>
                                                                        {wager.powerUp && (
                                                                            <span className="bg-orange-100 text-orange-600 px-1 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5">
                                                                                <Zap className="h-2 w-2" />
                                                                                {wager.powerUp}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Result */}
                                                                <div className="text-right shrink-0">
                                                                    {wager.status === "PENDING" ? (
                                                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Pending</div>
                                                                    ) : (
                                                                        <>
                                                                            <div className={`text-sm font-black ${wager.status === "WON" ? "text-green-600" : "text-gray-400"}`}>
                                                                                {wager.status === "WON" ? "+" : ""}{wager.payout || 0}
                                                                            </div>
                                                                            <div className="text-[9px] font-medium text-gray-400">
                                                                                {wager.status === "WON" ? (
                                                                                    <span className="flex items-center justify-end gap-0.5 text-green-500">
                                                                                        <TrendingUp className="h-2.5 w-2.5" />
                                                                                        Won
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="flex items-center justify-end gap-0.5 text-gray-400">
                                                                                        <TrendingDown className="h-2.5 w-2.5" />
                                                                                        Lost
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
