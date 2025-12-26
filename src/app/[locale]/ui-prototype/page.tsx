"use client";

/**
 * UI PROTOTYPE PAGE
 * 
 * Real interactive mockups demonstrating the modernized GambleGang UI.
 * This page shows all the proposed improvements in a working prototype.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy, ChevronDown, ChevronUp, ChevronRight,
    Flame, Zap, Target, Clock, Check, X,
    Users, TrendingUp, Star, Shield, Crown,
    ArrowLeft, MoreVertical, Bell, Settings,
    MessageCircle, Activity, Wallet, Gamepad2,
    Sparkles, Gift, Eye, EyeOff
} from "lucide-react";

// ============================================
// SECTION 1: FLOATING ACTION MENU (FAB)
// ============================================
function FloatingActionButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-16 right-0 flex flex-col gap-3"
                    >
                        {[
                            { icon: <Gamepad2 className="w-5 h-5" />, label: "New Bet", color: "bg-green-500" },
                            { icon: <Users className="w-5 h-5" />, label: "Invite", color: "bg-blue-500" },
                            { icon: <MessageCircle className="w-5 h-5" />, label: "Trash Talk", color: "bg-purple-500" },
                        ].map((action, i) => (
                            <motion.button
                                key={action.label}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`${action.color} text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg hover:scale-105 transition-transform text-sm font-bold border-2 border-black`}
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                animate={{ rotate: isOpen ? 45 : 0 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[4px_4px_0_rgba(0,0,0,1)] border-2 border-black flex items-center justify-center hover:scale-105 transition-all"
            >
                <span className="text-3xl font-bold">+</span>
            </motion.button>
        </div>
    );
}

// ============================================
// SECTION 2: COMPACT BET CARD (COLLAPSED)
// ============================================
interface CompactBetCardProps {
    question: string;
    status: "OPEN" | "LOCKED" | "PROOFING" | "RESOLVED";
    timeLeft?: string;
    userPrediction?: string;
    potentialWin?: number;
    result?: "WON" | "LOST" | "PENDING";
    teamA?: string;
    teamB?: string;
    onExpand?: () => void;
}

function CompactBetCard({
    question, status, timeLeft, userPrediction,
    potentialWin, result, teamA, teamB, onExpand
}: CompactBetCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const statusColors = {
        OPEN: "bg-green-400",
        LOCKED: "bg-amber-400",
        PROOFING: "bg-blue-400",
        RESOLVED: result === "WON" ? "bg-emerald-400" : result === "LOST" ? "bg-red-400" : "bg-gray-400"
    };

    return (
        <motion.div
            layout
            className={`bg-white rounded-xl border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] overflow-hidden ${isExpanded ? "shadow-[4px_4px_0_rgba(0,0,0,1)]" : ""}`}
        >
            {/* COLLAPSED VIEW - Super Compact */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
                {/* Status Dot */}
                <div className={`w-3 h-3 rounded-full ${statusColors[status]} border border-black shrink-0`} />

                {/* Main Content */}
                <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-sm truncate">{question}</p>
                    {userPrediction && (
                        <p className="text-xs text-gray-500">
                            Your pick: <span className="font-bold text-black">{userPrediction}</span>
                        </p>
                    )}
                </div>

                {/* Quick Stats Pill */}
                <div className="flex items-center gap-2 shrink-0">
                    {status === "OPEN" && timeLeft && (
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeLeft}
                        </span>
                    )}
                    {potentialWin && status !== "RESOLVED" && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            +{potentialWin}
                        </span>
                    )}
                    {result === "WON" && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Won
                        </span>
                    )}
                    {result === "LOST" && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <X className="w-3 h-3" /> Lost
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
            </button>

            {/* EXPANDED VIEW */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t-2 border-dashed border-gray-200"
                    >
                        <div className="p-4">
                            {/* Team Matchup Visual */}
                            {teamA && teamB && (
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-black flex items-center justify-center mx-auto mb-1">
                                            <span className="text-white font-bold text-xs">{teamA.slice(0, 3)}</span>
                                        </div>
                                        <span className="text-xs font-bold">{teamA}</span>
                                    </div>
                                    <span className="text-2xl font-black text-gray-300">VS</span>
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-black flex items-center justify-center mx-auto mb-1">
                                            <span className="text-white font-bold text-xs">{teamB.slice(0, 3)}</span>
                                        </div>
                                        <span className="text-xs font-bold">{teamB}</span>
                                    </div>
                                </div>
                            )}

                            {/* Quick Action Buttons */}
                            {status === "OPEN" && (
                                <div className="grid grid-cols-3 gap-2">
                                    <button className="py-2 px-3 bg-blue-500 text-white rounded-lg font-bold text-xs border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                                        {teamA}
                                    </button>
                                    <button className="py-2 px-3 bg-gray-200 text-black rounded-lg font-bold text-xs border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                                        Draw
                                    </button>
                                    <button className="py-2 px-3 bg-red-500 text-white rounded-lg font-bold text-xs border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all">
                                        {teamB}
                                    </button>
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
// SECTION 3: SWIPEABLE LEADERBOARD PODIUM
// ============================================
function LeaderboardPodium({ members }: { members: { name: string; points: number; avatar?: string; change?: number }[] }) {
    const [showDetails, setShowDetails] = useState(false);
    const top3 = members.slice(0, 3);
    const rest = members.slice(3);

    return (
        <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,1)] p-4 overflow-hidden">
            {/* Podium Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-300" />
                    <h3 className="text-white font-black uppercase tracking-wider">Standings</h3>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-white/80 text-xs font-bold flex items-center gap-1 hover:text-white"
                >
                    {showDetails ? "Less" : "More"}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                </button>
            </div>

            {/* Compact Podium - Always Visible */}
            <div className="flex items-end justify-center gap-1 mb-2">
                {/* 2nd Place */}
                <motion.div
                    className="flex flex-col items-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="w-14 h-14 rounded-full bg-zinc-300 border-3 border-black flex items-center justify-center text-xl font-black">
                        {top3[1]?.avatar || "🥈"}
                    </div>
                    <div className="bg-zinc-300 rounded-t-lg mt-1 px-4 py-6 border-2 border-b-0 border-black text-center">
                        <span className="font-black text-xs block truncate max-w-[60px]">{top3[1]?.name}</span>
                        <span className="text-xs font-bold">{top3[1]?.points}</span>
                    </div>
                </motion.div>

                {/* 1st Place */}
                <motion.div
                    className="flex flex-col items-center relative"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400 fill-yellow-300" />
                    <div className="w-16 h-16 rounded-full bg-yellow-400 border-3 border-black flex items-center justify-center text-2xl font-black shadow-lg">
                        {top3[0]?.avatar || "🥇"}
                    </div>
                    <div className="bg-yellow-400 rounded-t-lg mt-1 px-5 py-8 border-2 border-b-0 border-black text-center">
                        <span className="font-black text-sm block truncate max-w-[70px]">{top3[0]?.name}</span>
                        <span className="text-sm font-bold">{top3[0]?.points}</span>
                    </div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                    className="flex flex-col items-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="w-14 h-14 rounded-full bg-orange-400 border-3 border-black flex items-center justify-center text-xl font-black">
                        {top3[2]?.avatar || "🥉"}
                    </div>
                    <div className="bg-orange-400 rounded-t-lg mt-1 px-4 py-4 border-2 border-b-0 border-black text-center">
                        <span className="font-black text-xs block truncate max-w-[60px]">{top3[2]?.name}</span>
                        <span className="text-xs font-bold">{top3[2]?.points}</span>
                    </div>
                </motion.div>
            </div>

            {/* Expanded List */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 bg-white/10 rounded-xl overflow-hidden"
                    >
                        {rest.map((member, i) => (
                            <div key={member.name} className="flex items-center gap-3 p-3 border-b border-white/10 last:border-b-0">
                                <span className="font-bold text-white/60 text-sm w-5">{i + 4}</span>
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                    {member.avatar || "👤"}
                                </div>
                                <span className="font-bold text-white flex-1">{member.name}</span>
                                <span className="font-bold text-white">{member.points}</span>
                                {member.change !== undefined && (
                                    <span className={`text-xs font-bold ${member.change > 0 ? "text-green-300" : member.change < 0 ? "text-red-300" : "text-white/50"}`}>
                                        {member.change > 0 ? `↑${member.change}` : member.change < 0 ? `↓${Math.abs(member.change)}` : "—"}
                                    </span>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// SECTION 4: PILL STATS BAR (HORIZONTAL SCROLL)
// ============================================
function PillStatsBar() {
    const stats = [
        { label: "Active", value: 5, icon: <Zap className="w-3 h-3" />, color: "bg-orange-400" },
        { label: "Win Rate", value: "72%", icon: <Target className="w-3 h-3" />, color: "bg-green-400" },
        { label: "W/L", value: "14/5", icon: <Activity className="w-3 h-3" />, color: "bg-blue-400" },
        { label: "Streak", value: 3, icon: <Flame className="w-3 h-3" />, color: "bg-red-400" },
        { label: "Points", value: 1250, icon: <Trophy className="w-3 h-3" />, color: "bg-purple-400" },
    ];

    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2">
                {stats.map(stat => (
                    <div
                        key={stat.label}
                        className={`${stat.color} shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]`}
                    >
                        {stat.icon}
                        <span className="font-black text-xs text-black">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// SECTION 5: RADIAL MENU (LONG PRESS)
// ============================================
function RadialMenuDemo() {
    const [showRadial, setShowRadial] = useState(false);
    const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);

    const handleTouchStart = () => {
        const timer = setTimeout(() => setShowRadial(true), 500);
        setHoldTimer(timer);
    };

    const handleTouchEnd = () => {
        if (holdTimer) clearTimeout(holdTimer);
        setShowRadial(false);
    };

    const actions = [
        { icon: <Eye className="w-4 h-4" />, label: "View", angle: -90 },
        { icon: <Star className="w-4 h-4" />, label: "Fave", angle: -45 },
        { icon: <MessageCircle className="w-4 h-4" />, label: "Chat", angle: 0 },
        { icon: <X className="w-4 h-4" />, label: "Hide", angle: 45 },
    ];

    return (
        <div className="relative flex items-center justify-center p-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div
                className="relative"
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Center Element */}
                <div className="w-20 h-20 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center cursor-pointer select-none">
                    <span className="text-xs font-bold text-center text-gray-500">Hold to<br />reveal menu</span>
                </div>

                {/* Radial Items */}
                <AnimatePresence>
                    {showRadial && (
                        <>
                            {actions.map((action, i) => {
                                const radians = (action.angle * Math.PI) / 180;
                                const x = Math.cos(radians) * 60;
                                const y = Math.sin(radians) * 60;

                                return (
                                    <motion.button
                                        key={action.label}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1, x, y }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-500 text-white border-2 border-black flex items-center justify-center shadow-lg"
                                    >
                                        {action.icon}
                                    </motion.button>
                                );
                            })}
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================
// SECTION 6: POWER-UP CAROUSEL
// ============================================
function PowerUpCarousel() {
    const powerUps = [
        { name: "Double", icon: "💪", count: 3, color: "from-lime-400 to-green-500", multiplier: "2x" },
        { name: "Triple", icon: "🔥", count: 2, color: "from-orange-400 to-red-500", multiplier: "3x" },
        { name: "Quad", icon: "💥", count: 1, color: "from-red-500 to-pink-600", multiplier: "4x" },
    ];

    return (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 py-2">
            {powerUps.map(pu => (
                <motion.button
                    key={pu.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative shrink-0 w-16 h-20 rounded-xl bg-gradient-to-br ${pu.color} border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] flex flex-col items-center justify-center gap-0.5 p-2`}
                >
                    <span className="text-2xl">{pu.icon}</span>
                    <span className="text-xs font-black text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">{pu.multiplier}</span>
                    {/* Count Badge */}
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-white text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black">
                        {pu.count}
                    </span>
                </motion.button>
            ))}
            {/* Add Info Card */}
            <div className="shrink-0 w-24 h-20 rounded-xl bg-white/50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <Gift className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-500 font-bold mt-1">Get More</span>
            </div>
        </div>
    );
}

// ============================================
// SECTION 7: SWIPE-TO-DISMISS BET LIST
// ============================================
function SwipeableBetItem({ question, onDismiss }: { question: string; onDismiss: () => void }) {
    const [offset, setOffset] = useState(0);
    const [isDismissed, setIsDismissed] = useState(false);

    return (
        <motion.div
            animate={{ x: offset, opacity: isDismissed ? 0 : 1, height: isDismissed ? 0 : "auto" }}
            drag="x"
            dragConstraints={{ left: -100, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
                if (info.offset.x < -80) {
                    setIsDismissed(true);
                    setTimeout(onDismiss, 200);
                } else {
                    setOffset(0);
                }
            }}
            className="relative"
        >
            {/* Reveal Layer (behind) */}
            <div className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-end px-4 border-2 border-black">
                <span className="text-white font-bold text-sm">Dismiss</span>
            </div>

            {/* Main Content */}
            <div className="relative bg-white rounded-xl p-3 border-2 border-black flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400 border border-black" />
                <span className="font-bold text-sm flex-1 truncate">{question}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
        </motion.div>
    );
}

// ============================================
// SECTION 8: BOTTOM SHEET DEMO
// ============================================
function BottomSheetDemo() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)]"
            >
                Open Bottom Sheet
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 z-50"
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[80vh] overflow-y-auto"
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-gray-300 rounded-full" />
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-black mb-4">Place Your Bet</h3>

                                {/* Quick Amounts */}
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {[50, 100, 250, 500].map(amount => (
                                        <button
                                            key={amount}
                                            className="py-2 bg-gray-100 rounded-lg font-bold text-sm border-2 border-black hover:bg-gray-200"
                                        >
                                            {amount}
                                        </button>
                                    ))}
                                </div>

                                {/* Power-ups */}
                                <PowerUpCarousel />

                                {/* Submit */}
                                <button className="w-full mt-4 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-black text-lg border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
                                    Confirm Bet
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// ============================================
// SECTION 9: MINI LEAGUE SELECTOR (PILL TABS)
// ============================================
function LeaguePillSelector() {
    const [selected, setSelected] = useState(0);

    const leagues = [
        { name: "NFL Crew", color: "from-blue-500 to-blue-600" },
        { name: "Soccer Mates", color: "from-green-500 to-green-600" },
        { name: "Work League", color: "from-purple-500 to-purple-600" },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 py-1">
            {leagues.map((league, i) => (
                <button
                    key={league.name}
                    onClick={() => setSelected(i)}
                    className={`shrink-0 px-4 py-2 rounded-full font-bold text-sm border-2 border-black transition-all ${selected === i
                            ? `bg-gradient-to-r ${league.color} text-white shadow-[2px_2px_0_rgba(0,0,0,1)]`
                            : "bg-white text-gray-600"
                        }`}
                >
                    {league.name}
                </button>
            ))}
        </div>
    );
}

// ============================================
// MAIN PROTOTYPE PAGE
// ============================================
export default function UIPrototypePage() {
    const [bets, setBets] = useState([
        { id: 1, question: "Lakers vs Celtics - Who wins?", status: "OPEN" as const, timeLeft: "2h", teamA: "Lakers", teamB: "Celtics", potentialWin: 150 },
        { id: 2, question: "Arsenal vs Chelsea - Match Result", status: "LOCKED" as const, userPrediction: "Arsenal", teamA: "Arsenal", teamB: "Chelsea", potentialWin: 200 },
        { id: 3, question: "Super Bowl Winner 2025", status: "PROOFING" as const, userPrediction: "Chiefs", potentialWin: 500 },
        { id: 4, question: "World Cup Final Score", status: "RESOLVED" as const, userPrediction: "3-2", result: "WON" as const, potentialWin: 450 },
    ]);

    const members = [
        { name: "Alex", points: 2450, avatar: "👨‍🚀", change: 2 },
        { name: "Maria", points: 2100, avatar: "👩‍🎤", change: -1 },
        { name: "Jake", points: 1890, avatar: "🧑‍🎨", change: 1 },
        { name: "Sam", points: 1650, avatar: "👨‍💻", change: 0 },
        { name: "Lisa", points: 1400, avatar: "👩‍🔬", change: -2 },
    ];

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b-2 border-black">
                <div className="flex items-center justify-between p-4">
                    <ArrowLeft className="w-6 h-6" />
                    <h1 className="font-black text-lg">UI Redesign Prototypes</h1>
                    <MoreVertical className="w-6 h-6" />
                </div>
            </header>

            <main className="p-4 space-y-8">
                {/* Intro Card */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,1)] text-white">
                    <h2 className="text-2xl font-black mb-2">🎮 Mobile-First UI</h2>
                    <p className="text-sm text-white/90">
                        Scroll down to explore new interaction patterns designed for 95% mobile users.
                        Each section demonstrates a different improvement.
                    </p>
                </div>

                {/* 1. League Selector Pills */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">1</span>
                        Quick League Switch
                    </h3>
                    <LeaguePillSelector />
                </section>

                {/* 2. Pill Stats Bar */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">2</span>
                        Scrollable Stats Pills
                    </h3>
                    <PillStatsBar />
                </section>

                {/* 3. Compact Leaderboard */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">3</span>
                        Collapsible Podium
                    </h3>
                    <LeaderboardPodium members={members} />
                </section>

                {/* 4. Power-Up Carousel */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">4</span>
                        Power-Up Selection
                    </h3>
                    <PowerUpCarousel />
                </section>

                {/* 5. Compact Bet Cards */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">5</span>
                        Expandable Bet Cards
                    </h3>
                    <div className="space-y-2">
                        {bets.map(bet => (
                            <CompactBetCard key={bet.id} {...bet} />
                        ))}
                    </div>
                </section>

                {/* 6. Radial Menu */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">6</span>
                        Long-Press Radial Menu
                    </h3>
                    <RadialMenuDemo />
                </section>

                {/* 7. Bottom Sheet */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">7</span>
                        Bottom Sheet for Actions
                    </h3>
                    <BottomSheetDemo />
                </section>

                {/* 8. Swipe to Dismiss */}
                <section>
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center font-black border-2 border-black">8</span>
                        Swipe to Dismiss
                    </h3>
                    <div className="space-y-2">
                        <SwipeableBetItem question="Swipe me left to dismiss!" onDismiss={() => { }} />
                        <SwipeableBetItem question="Try swiping this one too" onDismiss={() => { }} />
                    </div>
                </section>
            </main>

            {/* Floating Action Button */}
            <FloatingActionButton />
        </div>
    );
}
