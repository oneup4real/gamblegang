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
    ChevronDown, Timer, Trophy, Flame, Shield,
    ThumbsUp, ThumbsDown, Sparkles, Zap, Target,
    CheckCircle2, XCircle, AlertCircle, Hourglass,
    Pencil, Calendar
} from "lucide-react";
import { Bet, Wager, placeWager, editWager } from "@/lib/services/bet-service";
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
        color: "bg-slate-500",
        lightBg: "bg-slate-50",
        border: "border-slate-200",
        textColor: "text-slate-700",
        icon: <Check className="w-3 h-3" />,
        pulseColor: "bg-slate-400"
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
    mode,
    powerUps,
    onEdit,
    onWagerSuccess,
    isOwnerOverride,
    initialExpanded = false
}: BetCardV2Props) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [matchHome, setMatchHome] = useState<number | "">("");
    const [matchAway, setMatchAway] = useState<number | "">("");
    const [wagerAmount, setWagerAmount] = useState<number | "">(mode === "STANDARD" ? 0 : 100);
    const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | undefined>();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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

    // Get card styling based on status
    const getCardStyle = () => {
        if (bet.status === "RESOLVED" && wagerResult === "WON") {
            return "border-emerald-400 bg-gradient-to-r from-emerald-50 to-white";
        }
        if (bet.status === "RESOLVED" && wagerResult === "LOST") {
            return "border-red-200 bg-gradient-to-r from-red-50/50 to-white opacity-80";
        }
        if (bet.status === "PROOFING" || bet.status === "DISPUTED") {
            return "border-blue-300 bg-gradient-to-r from-blue-50/50 to-white";
        }
        if (effectiveStatus === "LOCKED") {
            return "border-amber-200 bg-gradient-to-r from-amber-50/30 to-white";
        }
        return "border-black bg-white";
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

                    {/* RESOLVED: Result badge */}
                    {bet.status === "RESOLVED" && (
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${wagerResult === "WON" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                            wagerResult === "LOST" ? "text-red-600 bg-red-50 border-red-200" :
                                wagerResult === "PUSH" ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
                                    "text-gray-600 bg-gray-50 border-gray-200"
                            }`}>
                            {wagerResult === "WON" && <><Trophy className="w-3 h-3" /> +{userWager?.payout || 0}</>}
                            {wagerResult === "LOST" && <><XCircle className="w-3 h-3" /> Lost</>}
                            {wagerResult === "PUSH" && <><AlertCircle className="w-3 h-3" /> Push</>}
                            {!wagerResult && <><Check className="w-3 h-3" /> Done</>}
                        </span>
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
                            </div>

                            {/* Team Matchup Visual */}
                            {(homeTeam || awayTeam) && bet.choiceStyle !== "VARIOUS" && (
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

                            {/* MATCH type score inputs */}
                            {bet.type === "MATCH" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <div className="flex items-center justify-center gap-4">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-500 mb-1">{homeTeam || "Home"}</p>
                                        <input
                                            type="number"
                                            value={matchHome}
                                            onChange={e => setMatchHome(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-16 h-12 text-center text-xl font-black bg-white border-2 border-black rounded-lg focus:border-blue-500 outline-none"
                                            placeholder="-"
                                        />
                                    </div>
                                    <span className="text-2xl font-black text-gray-300">:</span>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-500 mb-1">{awayTeam || "Away"}</p>
                                        <input
                                            type="number"
                                            value={matchAway}
                                            onChange={e => setMatchAway(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-16 h-12 text-center text-xl font-black bg-white border-2 border-black rounded-lg focus:border-blue-500 outline-none"
                                            placeholder="-"
                                        />
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

                            {/* Power-ups (Arcade mode) */}
                            {mode === "STANDARD" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && powerUps && (
                                <CompactPowerBooster
                                    powerUps={powerUps}
                                    selectedPowerUp={selectedPowerUp}
                                    onSelect={setSelectedPowerUp}
                                />
                            )}

                            {/* Wager amount (Zero-Sum) */}
                            {mode === "ZERO_SUM" && bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-gray-500">Wager:</span>
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
                                </div>
                            )}

                            {/* Place Bet Button */}
                            {bet.status === "OPEN" && !isExpired && (!userWager || isEditing) && (
                                <button
                                    onClick={handlePlaceWager}
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-black text-base border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                                >
                                    {loading ? "Processing..." : isEditing ? "Update Bet" : "Place Bet"}
                                </button>
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

                                    {/* Generic LIVE badge if no score */}
                                    {(!bet.liveScore || bet.liveScore.matchStatus === "NOT_STARTED") && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full border border-amber-300">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-sm font-bold text-amber-800">Event in Progress</span>
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

                            {/* RESOLVED state */}
                            {bet.status === "RESOLVED" && (
                                <div className={`p-4 rounded-xl text-center ${wagerResult === "WON" ? "bg-emerald-50 border border-emerald-200" :
                                    wagerResult === "LOST" ? "bg-red-50 border border-red-200" :
                                        "bg-gray-50 border border-gray-200"
                                    }`}>
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${wagerResult === "WON" ? "bg-emerald-500" : wagerResult === "LOST" ? "bg-red-500" : "bg-gray-500"
                                        } text-white`}>
                                        {wagerResult === "WON" ? <Trophy className="w-6 h-6" /> :
                                            wagerResult === "LOST" ? <X className="w-6 h-6" /> :
                                                <Check className="w-6 h-6" />}
                                    </div>
                                    <p className={`text-xl font-black ${wagerResult === "WON" ? "text-emerald-700" : wagerResult === "LOST" ? "text-red-600" : "text-gray-700"
                                        }`}>
                                        {wagerResult === "WON" ? `You Won +${userWager?.payout}!` :
                                            wagerResult === "LOST" ? "You Lost" :
                                                wagerResult === "PUSH" ? "Bet Pushed - Refunded" : "Resolved"}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Final: {typeof bet.winningOutcome === "object"
                                            ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                                            : bet.options?.[Number(bet.winningOutcome)]?.text || String(bet.winningOutcome)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
