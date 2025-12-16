"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Lock,
    Eye,
    AlertOctagon,
    Gavel,
    Trophy,
    XCircle,
    ChevronRight,
    ChevronDown,
    Clock,
    ArrowRight,
    Vote,
    Users,
    Activity
} from "lucide-react";
import { format } from "date-fns";

// --- MOCK DATA ---
type BetStatus = "OPEN" | "LOCKED" | "PROOFING" | "DISPUTED" | "RESOLVED" | "INVALID";

interface MockBet {
    id: string;
    question: string;
    status: BetStatus;
    wagerAmount: number;
    potentialPayout: number;
    totalPool: number;
    yourPrediction: string;
    description: string;
    timestamp: Date;
    votes?: { approve: number; reject: number };
    winner?: string;
}

const MOCK_BETS: MockBet[] = [
    {
        id: "1",
        question: "Will Real Madrid beat Barcelona?",
        status: "LOCKED",
        wagerAmount: 100,
        potentialPayout: 250,
        totalPool: 5000,
        yourPrediction: "Real Madrid",
        description: "Match is currently ongoing. Waiting for final whistle.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
        id: "2",
        question: "Who wins the F1 Monaco GP?",
        status: "PROOFING",
        wagerAmount: 50,
        potentialPayout: 300,
        totalPool: 12000,
        yourPrediction: "Verstappen",
        description: "Race finished. Owner set result to 'Verstappen'. Auto-resolves in 10h.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        winner: "Verstappen"
    },
    {
        id: "3",
        question: "Will Bitcoin hit $100k by Friday?",
        status: "DISPUTED",
        wagerAmount: 500,
        potentialPayout: 1000,
        totalPool: 50000,
        yourPrediction: "Yes",
        description: "Result disputed by 3 members. Voting in progress.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        votes: { approve: 2, reject: 3 }
    },
    {
        id: "4",
        question: "Champion's League Winner 2024",
        status: "RESOLVED",
        wagerAmount: 200,
        potentialPayout: 400,
        totalPool: 8500,
        yourPrediction: "Man City",
        description: "Bet resolved. Winnings distributed.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        winner: "Man City"
    }
];

// --- COMPONENTS ---

// 1. TIMELINE TREE VIEW
function TimelineView({ bets }: { bets: MockBet[] }) {
    return (
        <div className="space-y-8 pl-4">
            {bets.map((bet, idx) => (
                <div key={bet.id} className="relative pl-8 border-l-4 border-gray-200 last:border-0 hover:border-black transition-colors group">
                    {/* Node Icon */}
                    <div className={`absolute -left-[14px] top-0 h-6 w-6 rounded-full border-2 border-black flex items-center justify-center bg-white z-10 
                        ${bet.status === 'LOCKED' ? 'bg-amber-100' :
                            bet.status === 'PROOFING' ? 'bg-yellow-100' :
                                bet.status === 'DISPUTED' ? 'bg-orange-100' : 'bg-green-100'}`}>
                        {bet.status === 'LOCKED' && <Lock className="w-3 h-3" />}
                        {bet.status === 'PROOFING' && <Eye className="w-3 h-3" />}
                        {bet.status === 'DISPUTED' && <Gavel className="w-3 h-3" />}
                        {bet.status === 'RESOLVED' && <Trophy className="w-3 h-3" />}
                    </div>

                    {/* Content Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-black text-lg font-comic">{bet.question}</h3>
                            <span className="text-xs font-black bg-black text-white px-2 py-1 rounded uppercase">{bet.status}</span>
                        </div>

                        <div className="flex gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(bet.timestamp, "MMM d, HH:mm")}</span>
                            <span className="font-bold text-black border-b-2 border-transparent hover:border-black">Your Pick: {bet.yourPrediction}</span>
                        </div>

                        {/* Status Specific Details */}
                        <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-200">
                            {bet.status === 'LOCKED' && (
                                <div className="flex items-center gap-2 text-amber-700 font-bold">
                                    <Clock className="w-4 h-4 animate-pulse" />
                                    <span>Event in progress...</span>
                                </div>
                            )}

                            {bet.status === 'PROOFING' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-yellow-700 font-bold">
                                        <Eye className="w-4 h-4" />
                                        <span>Result proposed: "{bet.winner}"</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 w-2/3 animate-pulse" />
                                    </div>
                                    <p className="text-xs text-gray-500">Auto-approves in 10h</p>
                                </div>
                            )}

                            {bet.status === 'DISPUTED' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-orange-700 font-bold">
                                        <Vote className="w-4 h-4" />
                                        <span>Community Vote</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-black">
                                        <div className="flex-1 bg-green-100 p-1 rounded text-green-700 text-center border border-green-300">
                                            Keep Result ({bet.votes?.approve})
                                        </div>
                                        <div className="text-gray-400">VS</div>
                                        <div className="flex-1 bg-red-100 p-1 rounded text-red-700 text-center border border-red-300">
                                            Reject ({bet.votes?.reject})
                                        </div>
                                    </div>
                                </div>
                            )}

                            {bet.status === 'RESOLVED' && (
                                <div className="flex items-center justify-between text-green-700 font-bold">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        <span>Won +{bet.potentialPayout - bet.wagerAmount} pts</span>
                                    </div>
                                    <span className="text-2xl">🎉</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            ))}
        </div>
    );
}

// 2. PROGRESS STEPPER CARD View
function StepperCardView({ bets }: { bets: MockBet[] }) {
    const steps = ["OPEN", "LOCKED", "PROOFING", "RESOLVED"];

    return (
        <div className="space-y-6">
            {bets.map((bet, idx) => {
                const currentStepIndex = steps.indexOf(bet.status === "DISPUTED" ? "PROOFING" : bet.status);

                return (
                    <motion.div
                        key={bet.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
                    >
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            {bet.status === 'LOCKED' && <Lock size={100} />}
                            {bet.status === 'PROOFING' && <Eye size={100} />}
                            {bet.status === 'DISPUTED' && <Gavel size={100} />}
                            {bet.status === 'RESOLVED' && <Trophy size={100} />}
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-2xl font-black font-comic mb-4">{bet.question}</h3>

                            {/* Stepper */}
                            <div className="flex items-center justify-between mb-8 relative">
                                {/* Connector Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2" />
                                <div
                                    className="absolute top-1/2 left-0 h-1 bg-black -z-10 -translate-y-1/2 transition-all duration-500"
                                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                />

                                {steps.map((step, sIdx) => {
                                    const isCompleted = sIdx <= currentStepIndex;
                                    const isCurrent = sIdx === currentStepIndex;

                                    return (
                                        <div key={step} className="flex flex-col items-center gap-2 bg-white px-2">
                                            <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-black transition-all
                                                ${isCompleted ? 'bg-black text-white' : 'bg-white text-gray-300'}`}>
                                                {sIdx + 1}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase ${isCurrent ? 'text-black' : 'text-gray-400'}`}>
                                                {step}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Contextual Action Area */}
                            <div className="bg-gray-100 rounded-xl border-2 border-black p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Current Status</p>
                                    <div className="flex items-center gap-2">
                                        {bet.status === 'DISPUTED' ? <AlertOctagon className="w-5 h-5 text-red-600" /> : <Activity className="w-5 h-5" />}
                                        <span className="font-black text-lg">{bet.status === 'DISPUTED' ? 'UNDER DISPUTE' : bet.status}</span>
                                    </div>
                                    <p className="text-sm mt-1">{bet.description}</p>
                                </div>

                                {bet.status === 'PROOFING' && (
                                    <button className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:scale-105 transition-transform">
                                        Scan Result
                                    </button>
                                )}
                                {bet.status === 'DISPUTED' && (
                                    <button className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                                        Vote Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    )
}

// 3. PIPELINE / KANBAN VIEW
function PipelineView({ bets }: { bets: MockBet[] }) {
    const columns = [
        { id: "LOCKED", title: "Wait", icon: Lock, color: "bg-amber-100 border-amber-300" },
        { id: "PROOFING", title: "Proof", icon: Eye, color: "bg-yellow-100 border-yellow-300" },
        { id: "DISPUTED", title: "Vote", icon: Gavel, color: "bg-orange-100 border-orange-300" },
        { id: "RESOLVED", title: "Done", icon: Trophy, color: "bg-green-100 border-green-300" }
    ];

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map(col => {
                const colBets = bets.filter(b => b.status === col.id);
                const Icon = col.icon;

                return (
                    <div key={col.id} className="min-w-[280px] flex-1 flex flex-col gap-3">
                        {/* Header */}
                        <div className={`p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 ${col.color}`}>
                            <Icon className="w-5 h-5" />
                            <h3 className="font-black font-comic uppercase text-lg">{col.title}</h3>
                            <span className="ml-auto bg-black text-white text-xs px-2 py-0.5 rounded-full">{colBets.length}</span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-3">
                            {colBets.map(bet => (
                                <motion.div
                                    layoutId={bet.id}
                                    key={bet.id}
                                    className="bg-white p-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:rotate-1 transition-transform cursor-pointer"
                                >
                                    <p className="font-bold text-sm leading-tight mb-3">{bet.question}</p>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs text-gray-500 font-bold">
                                            {bet.wagerAmount} pts
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {colBets.length === 0 && (
                                <div className="h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 font-bold text-sm">
                                    Empty
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}


export default function TestPage() {
    const [view, setView] = useState<"timeline" | "stepper" | "pipeline">("stepper");

    return (
        <div className="min-h-screen bg-[#FFE5CC] p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-4xl font-black font-comic mb-4">🧪 Design Lab: Bet Progress</h1>
                    <p className="font-bold text-gray-600 mb-6">Testing different ways to visualize bets active "Lifecycle".</p>

                    {/* View Switcher */}
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg border-2 border-black inline-flex">
                        {(["timeline", "stepper", "pipeline"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-4 py-2 rounded font-black uppercase text-sm transition-all ${view === v
                                    ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(100,100,100,1)]"
                                    : "text-gray-500 hover:text-black"
                                    }`}
                            >
                                {v} View
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[600px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            {view === "timeline" && <TimelineView bets={MOCK_BETS} />}
                            {view === "stepper" && <StepperCardView bets={MOCK_BETS} />}
                            {view === "pipeline" && <PipelineView bets={MOCK_BETS} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
