"use client";

/**
 * BET STATUS VISUALIZATION PROTOTYPE
 * 
 * Shows how bets in different phases (OPEN, LOCKED, PROOFING, RESOLVED)
 * are displayed in both collapsed and expanded states.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Check, X, AlertTriangle, Lock, Play, Eye,
    ChevronDown, Timer, Trophy, Flame, Shield,
    ThumbsUp, ThumbsDown, Sparkles, Zap, Target,
    ArrowLeft, CheckCircle2, XCircle, AlertCircle, Hourglass
} from "lucide-react";
import Link from "next/link";

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
        description: "Betting is open - place your wager!",
        pulseColor: "bg-green-400"
    },
    LOCKED: {
        label: "Locked",
        color: "bg-amber-500",
        lightBg: "bg-amber-50",
        border: "border-amber-200",
        textColor: "text-amber-700",
        icon: <Lock className="w-3 h-3" />,
        description: "Event in progress - waiting for result",
        pulseColor: "bg-amber-400"
    },
    PROOFING: {
        label: "Proofing",
        color: "bg-blue-500",
        lightBg: "bg-blue-50",
        border: "border-blue-200",
        textColor: "text-blue-700",
        icon: <Eye className="w-3 h-3" />,
        description: "Result submitted - dispute window open",
        pulseColor: "bg-blue-400"
    },
    RESOLVED: {
        label: "Resolved",
        color: "bg-slate-500",
        lightBg: "bg-slate-50",
        border: "border-slate-200",
        textColor: "text-slate-700",
        icon: <Check className="w-3 h-3" />,
        description: "Bet finalized - payouts distributed",
        pulseColor: "bg-slate-400"
    }
};

const RESULT_CONFIG = {
    WON: {
        color: "bg-emerald-500",
        lightBg: "bg-emerald-50",
        border: "border-emerald-300",
        textColor: "text-emerald-700",
        icon: <Trophy className="w-4 h-4" />,
        label: "Won!"
    },
    LOST: {
        color: "bg-red-500",
        lightBg: "bg-red-50",
        border: "border-red-300",
        textColor: "text-red-600",
        icon: <XCircle className="w-4 h-4" />,
        label: "Lost"
    },
    PUSH: {
        color: "bg-yellow-500",
        lightBg: "bg-yellow-50",
        border: "border-yellow-300",
        textColor: "text-yellow-700",
        icon: <AlertCircle className="w-4 h-4" />,
        label: "Push"
    }
};

// ============================================
// BET CARD COMPONENT - ALL STATES
// ============================================
interface BetCardDemoProps {
    status: "OPEN" | "LOCKED" | "PROOFING" | "RESOLVED";
    question: string;
    teamA?: string;
    teamB?: string;
    userPrediction?: string;
    potentialWin?: number;
    timeLeft?: string;
    result?: "WON" | "LOST" | "PUSH";
    payout?: number;
    disputeTimeLeft?: string;
    proposedResult?: string;
    hasDispute?: boolean;
    initialExpanded?: boolean;
    powerUp?: "x2" | "x3" | "x4";
    odds?: string;
}

function BetCardDemo({
    status,
    question,
    teamA,
    teamB,
    userPrediction,
    potentialWin,
    timeLeft,
    result,
    payout,
    disputeTimeLeft,
    proposedResult,
    hasDispute,
    initialExpanded = false,
    powerUp,
    odds
}: BetCardDemoProps) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const config = STATUS_CONFIG[status];
    const resultConfig = result ? RESULT_CONFIG[result] : null;

    // Determine card styling based on status and result
    const getCardStyle = () => {
        if (status === "RESOLVED" && result === "WON") {
            return "border-emerald-400 bg-gradient-to-r from-emerald-50 to-white";
        }
        if (status === "RESOLVED" && result === "LOST") {
            return "border-red-200 bg-gradient-to-r from-red-50/50 to-white opacity-75";
        }
        if (status === "PROOFING") {
            return "border-blue-300 bg-gradient-to-r from-blue-50/50 to-white";
        }
        if (status === "LOCKED") {
            return "border-amber-200 bg-gradient-to-r from-amber-50/30 to-white";
        }
        return "border-black bg-white";
    };

    return (
        <motion.div
            layout
            className={`rounded-xl border-2 ${getCardStyle()} shadow-[2px_2px_0_rgba(0,0,0,1)] overflow-hidden transition-all`}
        >
            {/* ==================== COLLAPSED VIEW ==================== */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center gap-3 hover:bg-black/5 transition-colors"
            >
                {/* Status Indicator */}
                <div className="relative shrink-0">
                    <div className={`w-3 h-3 rounded-full ${config.color} border border-black`} />
                    {/* Pulse for OPEN and PROOFING */}
                    {(status === "OPEN" || status === "PROOFING") && (
                        <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.pulseColor} animate-ping opacity-75`} />
                    )}
                </div>

                {/* Question & Prediction */}
                <div className="flex-1 min-w-0 text-left">
                    <p className={`font-bold text-sm truncate ${status === "RESOLVED" && result === "LOST" ? "line-through text-gray-400" : ""}`}>
                        {question}
                    </p>
                    {userPrediction && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            Your pick:
                            <span className={`font-bold ${result === "WON" ? "text-emerald-600" : result === "LOST" ? "text-red-500" : "text-black"}`}>
                                {userPrediction}
                            </span>
                            {powerUp && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black text-white ${powerUp === "x2" ? "bg-lime-500" : powerUp === "x3" ? "bg-orange-500" : "bg-red-500"
                                    }`}>
                                    {powerUp}
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* Status-Specific Pills/Info */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* OPEN: Time left + Potential */}
                    {status === "OPEN" && (
                        <>
                            {timeLeft && (
                                <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                                    <Clock className="w-3 h-3" />
                                    {timeLeft}
                                </span>
                            )}
                            {!userPrediction && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                    Bet Now!
                                </span>
                            )}
                            {userPrediction && potentialWin && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                    +{potentialWin}
                                </span>
                            )}
                        </>
                    )}

                    {/* LOCKED: Live indicator */}
                    {status === "LOCKED" && (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            LIVE
                        </span>
                    )}

                    {/* PROOFING: Countdown or Dispute */}
                    {status === "PROOFING" && (
                        hasDispute ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <AlertTriangle className="w-3 h-3" />
                                Disputed!
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                <Hourglass className="w-3 h-3" />
                                {disputeTimeLeft || "Verifying..."}
                            </span>
                        )
                    )}

                    {/* RESOLVED: Result badge */}
                    {status === "RESOLVED" && resultConfig && (
                        <span className={`flex items-center gap-1 text-xs font-bold ${resultConfig.textColor} ${resultConfig.lightBg} px-2 py-0.5 rounded-full border ${resultConfig.border}`}>
                            {resultConfig.icon}
                            {result === "WON" && payout ? `+${payout}` : resultConfig.label}
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
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.lightBg} border ${config.border}`}>
                                <div className={`p-1 rounded ${config.color} text-white`}>
                                    {config.icon}
                                </div>
                                <div>
                                    <span className={`font-bold text-sm ${config.textColor}`}>{config.label}</span>
                                    <p className="text-xs text-gray-500">{config.description}</p>
                                </div>
                            </div>

                            {/* Team Matchup (if applicable) */}
                            {teamA && teamB && (
                                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="text-center flex-1">
                                        <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 ${userPrediction === teamA ? "border-green-500 ring-2 ring-green-300" : "border-black"} flex items-center justify-center`}>
                                            <span className="text-white font-bold text-xs">{teamA.slice(0, 3)}</span>
                                        </div>
                                        <span className="text-xs font-bold mt-1 block">{teamA}</span>
                                        {odds && <span className="text-[10px] text-gray-500">@{odds}</span>}
                                    </div>
                                    <span className="text-xl font-black text-gray-300 px-4">VS</span>
                                    <div className="text-center flex-1">
                                        <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 ${userPrediction === teamB ? "border-green-500 ring-2 ring-green-300" : "border-black"} flex items-center justify-center`}>
                                            <span className="text-white font-bold text-xs">{teamB.slice(0, 3)}</span>
                                        </div>
                                        <span className="text-xs font-bold mt-1 block">{teamB}</span>
                                    </div>
                                </div>
                            )}

                            {/* STATUS-SPECIFIC CONTENT */}

                            {/* OPEN: Betting Options */}
                            {status === "OPEN" && !userPrediction && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Make Your Prediction</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button className="py-3 bg-blue-500 text-white rounded-xl font-bold text-sm border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                                            {teamA || "Option 1"}
                                        </button>
                                        <button className="py-3 bg-gray-200 text-black rounded-xl font-bold text-sm border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                                            Draw
                                        </button>
                                        <button className="py-3 bg-red-500 text-white rounded-xl font-bold text-sm border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                                            {teamB || "Option 2"}
                                        </button>
                                    </div>

                                    {/* Power-ups */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className="text-xs font-bold text-gray-500">Boost:</span>
                                        {[
                                            { name: "x2", icon: "💪", color: "from-lime-400 to-green-500" },
                                            { name: "x3", icon: "🔥", color: "from-orange-400 to-red-500" },
                                            { name: "x4", icon: "💥", color: "from-red-500 to-pink-600" },
                                        ].map(pu => (
                                            <button key={pu.name} className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pu.color} border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] flex flex-col items-center justify-center text-xs font-black text-white`}>
                                                <span>{pu.icon}</span>
                                                <span className="text-[8px]">{pu.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* OPEN: Already bet - Edit option */}
                            {status === "OPEN" && userPrediction && (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                                    <div>
                                        <p className="text-xs text-green-600 font-bold">Your Bet Placed ✓</p>
                                        <p className="text-sm font-black text-green-700">{userPrediction} {powerUp && `(${powerUp})`}</p>
                                    </div>
                                    <button className="px-3 py-1.5 bg-white text-green-700 rounded-lg text-xs font-bold border border-green-300 hover:bg-green-100">
                                        Edit Bet
                                    </button>
                                </div>
                            )}

                            {/* LOCKED: Waiting for result */}
                            {status === "LOCKED" && (
                                <div className="text-center py-4">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full border border-amber-300">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-bold text-amber-800">Event in Progress</span>
                                    </div>
                                    {userPrediction && (
                                        <p className="mt-3 text-sm text-gray-600">
                                            You predicted: <span className="font-black text-black">{userPrediction}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* PROOFING: Result submitted + Dispute option */}
                            {status === "PROOFING" && (
                                <div className="space-y-3">
                                    {/* Proposed Result */}
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <p className="text-xs text-blue-600 font-bold mb-1">Proposed Result</p>
                                        <p className="text-lg font-black text-blue-800">{proposedResult || "Lakers Win"}</p>
                                    </div>

                                    {/* User Status */}
                                    {userPrediction && (
                                        <div className={`p-3 rounded-xl border ${userPrediction === proposedResult
                                                ? "bg-green-50 border-green-200"
                                                : "bg-red-50 border-red-200"
                                            }`}>
                                            {userPrediction === proposedResult ? (
                                                <p className="text-sm font-bold text-green-700 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    You're winning! Potential: +{potentialWin}
                                                </p>
                                            ) : (
                                                <p className="text-sm font-bold text-red-600 flex items-center gap-2">
                                                    <XCircle className="w-4 h-4" />
                                                    This result means you lose
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Dispute Actions */}
                                    {!hasDispute && (
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm border border-gray-300 flex items-center justify-center gap-2">
                                                <Check className="w-4 h-4" />
                                                Accept
                                            </button>
                                            <button className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm border border-red-300 flex items-center justify-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Dispute
                                            </button>
                                        </div>
                                    )}

                                    {/* Dispute Active */}
                                    {hasDispute && (
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                                            <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Dispute Active - Vote Required
                                            </p>
                                            <div className="flex gap-2">
                                                <button className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold text-sm border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-center gap-1">
                                                    <ThumbsUp className="w-4 h-4" />
                                                    Approve
                                                </button>
                                                <button className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold text-sm border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-center gap-1">
                                                    <ThumbsDown className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Countdown */}
                                    <p className="text-xs text-center text-gray-500">
                                        Auto-confirm in <span className="font-bold text-blue-600">{disputeTimeLeft || "11h 45m"}</span>
                                    </p>
                                </div>
                            )}

                            {/* RESOLVED: Final outcome */}
                            {status === "RESOLVED" && resultConfig && (
                                <div className={`p-4 rounded-xl ${resultConfig.lightBg} border ${resultConfig.border} text-center`}>
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${resultConfig.color} text-white mb-2`}>
                                        {result === "WON" ? <Trophy className="w-6 h-6" /> : result === "LOST" ? <X className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                    </div>
                                    <p className={`text-xl font-black ${resultConfig.textColor}`}>
                                        {result === "WON" ? `You Won +${payout}!` : result === "LOST" ? "You Lost" : "Bet Pushed - Refunded"}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Final Result: <span className="font-bold text-black">{proposedResult || "Lakers 112 - 108"}</span>
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

// ============================================
// STATUS LEGEND COMPONENT
// ============================================
function StatusLegend() {
    return (
        <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <div key={key} className={`flex items-center gap-2 p-2 rounded-lg ${config.lightBg} border ${config.border}`}>
                    <div className={`w-4 h-4 rounded-full ${config.color} border border-black`} />
                    <span className={`text-xs font-bold ${config.textColor}`}>{config.label}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// MAIN PAGE
// ============================================
export default function BetStatesPage() {
    const [showAll, setShowAll] = useState(false);

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b-2 border-black">
                <div className="flex items-center gap-3 p-4">
                    <Link href="/en/ui-prototype" className="p-1">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-black text-lg">Bet Status Visualization</h1>
                </div>
            </header>

            <main className="p-4 space-y-8">
                {/* Intro */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,1)] text-white">
                    <h2 className="text-2xl font-black mb-2">📊 Status Visual Guide</h2>
                    <p className="text-sm text-white/90">
                        See how bets appear in each phase. Tap any card to see the expanded view with action options.
                    </p>
                </div>

                {/* Legend */}
                <div>
                    <h3 className="font-black text-lg mb-3">Status Legend</h3>
                    <StatusLegend />
                </div>

                {/* ===== SECTION 1: OPEN BETS ===== */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-black">
                            <Play className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="font-black text-lg">OPEN - Betting Available</h3>
                    </div>
                    <div className="space-y-2">
                        {/* Not yet bet */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">No bet placed yet</p>
                            <BetCardDemo
                                status="OPEN"
                                question="Lakers vs Celtics - Who wins tonight?"
                                teamA="Lakers"
                                teamB="Celtics"
                                timeLeft="2h 30m"
                                odds="1.85"
                            />
                        </div>

                        {/* Already bet */}
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Bet already placed</p>
                            <BetCardDemo
                                status="OPEN"
                                question="Arsenal vs Chelsea - Match result?"
                                teamA="Arsenal"
                                teamB="Chelsea"
                                userPrediction="Arsenal"
                                potentialWin={150}
                                timeLeft="5h"
                                powerUp="x2"
                            />
                        </div>
                    </div>
                </section>

                {/* ===== SECTION 2: LOCKED BETS ===== */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center border-2 border-black">
                            <Lock className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="font-black text-lg">LOCKED - Event In Progress</h3>
                    </div>
                    <div className="space-y-2">
                        <BetCardDemo
                            status="LOCKED"
                            question="Bayern vs Dortmund - Bundesliga Top Match"
                            teamA="Bayern"
                            teamB="Dortmund"
                            userPrediction="Bayern"
                            potentialWin={200}
                        />
                    </div>
                </section>

                {/* ===== SECTION 3: PROOFING BETS ===== */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-black">
                            <Eye className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="font-black text-lg">PROOFING - Dispute Window</h3>
                    </div>
                    <div className="space-y-2">
                        {/* Winning result */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">You're winning</p>
                            <BetCardDemo
                                status="PROOFING"
                                question="Real Madrid vs Barcelona - El Clasico"
                                teamA="Real Madrid"
                                teamB="Barcelona"
                                userPrediction="Real Madrid"
                                potentialWin={300}
                                proposedResult="Real Madrid"
                                disputeTimeLeft="11h 45m"
                            />
                        </div>

                        {/* Losing result */}
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">You're losing</p>
                            <BetCardDemo
                                status="PROOFING"
                                question="Man City vs Liverpool - Premier League"
                                teamA="Man City"
                                teamB="Liverpool"
                                userPrediction="Man City"
                                proposedResult="Liverpool"
                                disputeTimeLeft="6h 20m"
                            />
                        </div>

                        {/* With active dispute */}
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Dispute active - vote needed</p>
                            <BetCardDemo
                                status="PROOFING"
                                question="PSG vs Marseille - Ligue 1 Derby"
                                teamA="PSG"
                                teamB="Marseille"
                                userPrediction="PSG"
                                proposedResult="PSG"
                                hasDispute={true}
                            />
                        </div>
                    </div>
                </section>

                {/* ===== SECTION 4: RESOLVED BETS ===== */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center border-2 border-black">
                            <Check className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="font-black text-lg">RESOLVED - Final Results</h3>
                    </div>
                    <div className="space-y-2">
                        {/* Won */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Won bet</p>
                            <BetCardDemo
                                status="RESOLVED"
                                question="Super Bowl LVIII Winner"
                                userPrediction="Chiefs"
                                result="WON"
                                payout={450}
                                proposedResult="Chiefs 25 - 22 49ers"
                                powerUp="x3"
                            />
                        </div>

                        {/* Lost */}
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Lost bet</p>
                            <BetCardDemo
                                status="RESOLVED"
                                question="Champions League Final - Who lifts the trophy?"
                                userPrediction="PSG"
                                result="LOST"
                                proposedResult="Real Madrid"
                            />
                        </div>

                        {/* Push */}
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Push (refunded)</p>
                            <BetCardDemo
                                status="RESOLVED"
                                question="Will the match have over 2.5 goals?"
                                userPrediction="Yes"
                                result="PUSH"
                                proposedResult="Match Cancelled"
                            />
                        </div>
                    </div>
                </section>

                {/* Summary Table */}
                <section className="bg-gray-50 rounded-xl border-2 border-black p-4">
                    <h3 className="font-black text-lg mb-3">Quick Reference</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b-2 border-black">
                                    <th className="text-left py-2 font-black">Status</th>
                                    <th className="text-left py-2 font-black">Collapsed Shows</th>
                                    <th className="text-left py-2 font-black">Expanded Shows</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2"><span className="font-bold text-green-600">OPEN</span></td>
                                    <td className="py-2">⏰ Time left, +Potential</td>
                                    <td className="py-2">Bet buttons, Power-ups</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2"><span className="font-bold text-amber-600">LOCKED</span></td>
                                    <td className="py-2">🔴 LIVE indicator</td>
                                    <td className="py-2">Your prediction, Waiting msg</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2"><span className="font-bold text-blue-600">PROOFING</span></td>
                                    <td className="py-2">⏳ Countdown / ⚠️ Disputed</td>
                                    <td className="py-2">Result, Win/Lose status, Dispute buttons</td>
                                </tr>
                                <tr>
                                    <td className="py-2"><span className="font-bold text-slate-600">RESOLVED</span></td>
                                    <td className="py-2">✅ Won / ❌ Lost / ↩️ Push</td>
                                    <td className="py-2">Final result, Payout amount</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
