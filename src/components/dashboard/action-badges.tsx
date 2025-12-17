"use client";

import { motion } from "framer-motion";
import { Vote, Gavel, Ticket, ChevronRight, Timer } from "lucide-react";

interface ActionBadgesProps {
    votesNeeded: number;
    pendingProofing: number;
    toResolve: number;
    newBets: number;
    onVotesClick: () => void;
    onPendingClick: () => void;
    onResolveClick: () => void;
    onNewBetsClick: () => void;
}

export function ActionBadges({
    votesNeeded,
    pendingProofing,
    toResolve,
    newBets,
    onVotesClick,
    onPendingClick,
    onResolveClick,
    onNewBetsClick
}: ActionBadgesProps) {
    const hasAnyActions = votesNeeded > 0 || pendingProofing > 0 || toResolve > 0 || newBets > 0;

    if (!hasAnyActions) return null;

    const badges = [
        {
            count: votesNeeded,
            label: "Votes Needed",
            description: "Review and vote on results",
            icon: Vote,
            bgColor: "bg-red-500",
            borderColor: "border-red-700",
            textColor: "text-red-900",
            bgLight: "bg-red-50",
            onClick: onVotesClick,
            show: votesNeeded > 0
        },
        {
            count: pendingProofing,
            label: "Pending",
            description: "Pending and waiting proofing period",
            icon: Timer,
            bgColor: "bg-blue-500",
            borderColor: "border-blue-700",
            textColor: "text-blue-900",
            bgLight: "bg-blue-50",
            onClick: onPendingClick,
            show: pendingProofing > 0
        },
        {
            count: toResolve,
            label: "To Resolve",
            description: "Bets waiting for your decision",
            icon: Gavel,
            bgColor: "bg-yellow-500",
            borderColor: "border-yellow-600",
            textColor: "text-yellow-900",
            bgLight: "bg-yellow-50",
            onClick: onResolveClick,
            show: toResolve > 0
        },
        {
            count: newBets,
            label: "New Bets",
            description: "Open bets to wager on",
            icon: Ticket,
            bgColor: "bg-green-500",
            borderColor: "border-green-700",
            textColor: "text-green-900",
            bgLight: "bg-green-50",
            onClick: onNewBetsClick,
            show: newBets > 0
        }
    ].filter(b => b.show);

    return (
        <div className="flex flex-wrap gap-3 mb-6">
            {badges.map((badge, idx) => (
                <motion.button
                    key={badge.label}
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={badge.onClick}
                    className={`group flex items-center gap-3 px-4 py-3 ${badge.bgLight} border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all cursor-pointer`}
                >
                    <div className={`p-2 ${badge.bgColor} rounded-lg border-2 border-black`}>
                        <badge.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${badge.textColor}`}>
                                {badge.count}
                            </span>
                            <span className="text-sm font-black uppercase tracking-wide">
                                {badge.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            {badge.description}
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </motion.button>
            ))}
        </div>
    );
}
