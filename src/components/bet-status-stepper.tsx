"use client";

import { motion } from "framer-motion";
import { Lock, Eye, Gavel, Trophy, AlertOctagon, Activity, CheckCircle2 } from "lucide-react";
import { Bet } from "@/lib/services/bet-service";
import { formatDistanceToNow } from "date-fns";

interface BetStatusStepperProps {
    bet: Bet;
    isOwner: boolean;
    onAction?: (action: string) => void; // Callback for buttons
    hideStatusCard?: boolean;
    hideTimeline?: boolean;
}

export function BetStatusStepper({ bet, isOwner, onAction, hideStatusCard, hideTimeline }: BetStatusStepperProps) {
    const steps = ["OPEN", "LOCKED", "PROOFING", "RESOLVED"];

    // Map status to step index
    // DISPUTED maps to PROOFING phase but highlighted
    let currentStepIndex = steps.indexOf(bet.status);
    if (bet.status === "DISPUTED") currentStepIndex = steps.indexOf("PROOFING");
    if (bet.status === "INVALID") currentStepIndex = steps.indexOf("LOCKED"); // Fallback

    // Check for Under Review (Open but Past Close)
    const now = new Date();
    const closeDate = bet.closesAt?.toDate ? bet.closesAt.toDate() : (bet.closesAt?.seconds ? new Date(bet.closesAt.seconds * 1000) : null);
    const isUnderReview = bet.status === "OPEN" && closeDate && closeDate < now;

    if (isUnderReview) {
        currentStepIndex = steps.indexOf("LOCKED");
    }

    // Fallback if status not found (e.g. INVALID)
    if (currentStepIndex === -1 && bet.status === "OPEN") currentStepIndex = 0;
    if (currentStepIndex === -1 && (bet.status === "LOCKED")) currentStepIndex = 1;

    // Determine status description text
    let statusDescription = "";
    if (isUnderReview) {
        statusDescription = "Time's up! Betting is closed. Waiting for Admin to lock or result.";
    } else if (bet.status === "LOCKED") {
        statusDescription = "Betting is closed. Waiting for the event result.";
        if (bet.eventDate && bet.eventDate.seconds * 1000 > Date.now()) {
            statusDescription = `Event starts in ${formatDistanceToNow(new Date(bet.eventDate.seconds * 1000))}.`;
        }
    } else if (bet.status === "PROOFING") {
        if (bet.disputeDeadline) {
            const dist = formatDistanceToNow(bet.disputeDeadline.toDate());
            statusDescription = `Result proposed. Auto-approves in ${dist} if no disputes properly filed.`;
        } else {
            statusDescription = "Result proposed. Waiting for verification period or approval.";
        }
    } else if (bet.status === "DISPUTED") {
        statusDescription = "Result has been disputed! Community vote in progress.";
    } else if (bet.status === "RESOLVED") {
        statusDescription = "Bet settled and winnings distributed.";
    }

    return (
        <div className="relative w-full">
            {/* Background Decor (Optional, maybe keep it clean for real app) */}

            <div className="relative z-10 py-2">
                {/* Stepper Visual */}
                {!hideTimeline && (
                    <div className="flex flex-col mb-2 relative px-2">
                        <div className="flex items-center justify-between relative w-full mb-2">
                            {/* Connector Track (Wrapper) */}
                            <div className="absolute top-[15px] left-8 right-8 h-1 -z-10">
                                {/* Gray Background Line */}
                                <div className="absolute inset-0 w-full h-full bg-gray-200" />

                                {/* Colorful Progress Bar */}
                                <motion.div
                                    className={`absolute top-0 left-0 h-full transition-colors duration-500
                                    ${currentStepIndex >= 3 ? "bg-blue-500" :
                                            currentStepIndex >= 2 ? "bg-purple-500" :
                                                currentStepIndex >= 1 ? "bg-amber-500" : "bg-green-500"}`}
                                    initial={{ width: "0%" }}
                                    animate={{
                                        width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
                                    }}
                                    transition={{
                                        width: { duration: 0.5, ease: "easeInOut" }
                                    }}
                                >
                                    {/* Glare Effect */}
                                    <motion.div
                                        className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
                                        animate={{ left: ["-100%", "100%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    />
                                </motion.div>
                            </div>

                            {steps.map((step, sIdx) => {
                                const isCompleted = sIdx <= currentStepIndex;
                                const isCurrent = sIdx === currentStepIndex;

                                let Icon = CheckCircle2;
                                let stepColorClass = "bg-gray-200 text-gray-400 border-gray-300"; // Default inactive

                                if (step === "OPEN") {
                                    if (isCompleted) stepColorClass = "bg-green-500 text-white border-green-600";
                                } else if (step === "LOCKED") {
                                    Icon = Lock;
                                    if (isCompleted) stepColorClass = "bg-amber-500 text-white border-amber-600";
                                } else if (step === "PROOFING") {
                                    Icon = Eye;
                                    if (isCompleted) stepColorClass = "bg-purple-500 text-white border-purple-600";
                                } else if (step === "RESOLVED") {
                                    Icon = Trophy;
                                    if (isCompleted) stepColorClass = "bg-blue-500 text-white border-blue-600";
                                }

                                return (
                                    <div key={step} className="flex flex-col items-center gap-2 w-16 text-center">
                                        <motion.div
                                            initial={false}
                                            animate={isCurrent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                                            transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-10 shadow-sm
                                            ${stepColorClass}`}
                                        >
                                            {isCompleted ? <Icon className="w-4 h-4" /> : <span className="text-xs font-black">{sIdx + 1}</span>}
                                        </motion.div>
                                        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-black' : 'text-gray-300'}`}>
                                            {step}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Compact Status Card (for Header View) */}
                        {hideStatusCard && (bet.status !== "OPEN" || isUnderReview) && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                className={`mt-2 rounded-lg border p-2 flex items-center gap-4 shadow-sm max-w-full overflow-hidden
                                ${bet.status === "DISPUTED" ? "bg-orange-50 border-orange-200" :
                                        bet.status === "PROOFING" ? "bg-purple-50 border-purple-200" :
                                            bet.status === "RESOLVED" ? "bg-blue-50 border-blue-200" :
                                                isUnderReview ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}
                            >
                                <div className="shrink-0">
                                    {bet.status === 'DISPUTED' ? <AlertOctagon className="w-5 h-5 text-orange-600 animate-pulse" /> :
                                        bet.status === 'PROOFING' ? <Eye className="w-5 h-5 text-purple-600" /> :
                                            bet.status === 'RESOLVED' ? <Trophy className="w-5 h-5 text-blue-600" /> :
                                                isUnderReview ? <Lock className="w-5 h-5 text-amber-600" /> :
                                                    <Activity className="w-5 h-5 text-gray-500" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 className="font-black text-sm uppercase leading-none truncate">
                                        {bet.status === "DISPUTED" ? <span className="text-orange-600">DISPUTE</span> :
                                            isUnderReview ? <span className="text-amber-700">LOCKED</span> :
                                                bet.status}
                                    </h4>
                                    <p className="text-xs text-gray-500 leading-tight font-bold truncate mt-1">
                                        {statusDescription}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
