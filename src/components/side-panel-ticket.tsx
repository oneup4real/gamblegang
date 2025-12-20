import React from 'react';
import { Check, Lock, Trophy, XCircle } from 'lucide-react';

interface SidePanelTicketProps {
    status: "OPEN" | "LOCKED" | "PROOFING" | "RESOLVED";
    wagerStatus?: "WON" | "LOST" | "PUSH" | "PENDING";
    userSelection?: string | null;
    wagerAmount?: number;
    potentialPayout?: number;
    payout?: number;
    currency?: string;
    isWinning?: boolean;
    odds?: string;
    powerUp?: string;
}

export function SidePanelTicket({
    status,
    wagerStatus,
    userSelection,
    wagerAmount = 0,
    potentialPayout = 0,
    payout = 0,
    currency = "pts",
    isWinning,
    odds,
    powerUp
}: SidePanelTicketProps) {


    const renderTicketContent = () => {
        // --- 1. OPEN STATE ---
        if (status === "OPEN") {
            return (
                <>
                    <div className="flex-1 flex flex-col justify-center min-w-0 mr-2 md:mr-0 md:mb-3">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                            <span>Your Pick</span>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-600 rounded-lg blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="relative bg-white border-2 border-dashed border-blue-200 rounded-lg p-2.5 flex items-center justify-center min-h-[48px]">
                                <span className="font-black text-blue-900 text-xs md:text-sm leading-tight text-center break-words w-full">
                                    {userSelection || <span className="text-slate-300">?</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 text-right md:text-center w-auto md:w-full">
                        <div className="flex justify-end md:justify-center items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase mb-0.5">
                            {wagerAmount > 0 && <span>Wager: {wagerAmount}</span>}
                            {odds && <span className="text-blue-600 bg-blue-50 px-1 rounded">@{odds}</span>}
                        </div>
                        <div className="text-xl font-black text-green-600 leading-none tracking-tight">
                            {potentialPayout > 0 ? `+${Math.floor(potentialPayout)}` : '-'}
                        </div>
                        {potentialPayout > 0 && (
                            <div className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block mt-1">Potential</div>
                        )}
                    </div>
                </>
            );
        }

        // --- 2. LOCKED STATE ---
        if (status === "LOCKED") {
            return (
                <>
                    <div className="flex-1 flex flex-col justify-center min-w-0 mr-2 md:mr-0 md:mb-3 opacity-75">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Your Pick</div>

                        <div className="relative bg-slate-100 border-2 border-slate-300 rounded-lg p-2.5 flex items-center justify-center min-h-[48px]">
                            <Lock className="w-3 h-3 text-slate-400 absolute top-1 right-1 opacity-50" />
                            <span className="font-black text-slate-600 text-xs md:text-sm leading-tight text-center break-words w-full grayscale">
                                {userSelection || "-"}
                            </span>
                        </div>
                    </div>

                    <div className="flex-shrink-0 text-right md:text-center w-auto md:w-full opacity-75">
                        <div className="flex justify-end md:justify-center items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase mb-0.5">
                            {wagerAmount > 0 && <span>Wager: {wagerAmount}</span>}
                        </div>
                        <div className="text-xl font-black text-slate-700 leading-none">
                            {potentialPayout > 0 ? `~${Math.floor(potentialPayout)}` : '-'}
                        </div>
                        <div className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1 border border-amber-200">Locked</div>
                    </div>
                </>
            );
        }

        // --- 3. PROOFING STATE ---
        if (status === "PROOFING") {
            const isWinningState = isWinning;

            return (
                <>
                    {/* Ping for Winning */}
                    {isWinningState && (
                        <span className="absolute top-2 right-2 md:right-3 md:top-3 flex h-2 w-2 z-10">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    )}

                    <div className="flex-1 flex flex-col justify-center min-w-0 mr-2 md:mr-0 md:mb-3">
                        <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isWinningState ? "text-green-600" : "text-blue-500"}`}>
                            {isWinningState ? "Winning Pick" : "Your Pick"}
                        </div>

                        <div className={`relative border-2 rounded-lg p-2.5 flex items-center justify-center min-h-[48px] ${isWinningState
                            ? "bg-white border-green-500 shadow-[0_2px_10px_-2px_rgba(34,197,94,0.3)]"
                            : "bg-white border-blue-300"
                            }`}>
                            <span className={`font-black text-xs md:text-sm leading-tight text-center break-words w-full ${isWinningState ? "text-green-800" : "text-blue-900"}`}>
                                {userSelection || "-"}
                            </span>
                        </div>
                    </div>

                    <div className="flex-shrink-0 text-right md:text-center w-auto md:w-full">
                        {isWinningState ? (
                            <>
                                <div className="flex justify-end md:justify-center items-center gap-1.5 text-[10px] text-green-600 font-bold uppercase mb-0.5">
                                    <span>Payout</span>
                                </div>
                                <div className="text-xl font-black text-green-600">
                                    +{(potentialPayout || 0).toFixed(0)}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-end md:justify-center items-center gap-1.5 text-[10px] text-blue-500 font-bold uppercase mb-0.5">
                                    {wagerAmount > 0 && <span>Wager: {wagerAmount}</span>}
                                </div>
                                <div className="text-[9px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-1">Proofing</div>
                            </>
                        )}
                    </div>
                </>
            );
        }

        // --- 4. RESOLVED (WON) ---
        if (status === "RESOLVED" && wagerStatus === "WON") {
            return (
                <>
                    <div className="flex-1 flex flex-col justify-center min-w-0 mr-2 md:mr-0 md:mb-3">
                        <div className="text-[10px] font-black uppercase text-emerald-600 tracking-wider mb-1 flex items-center gap-1 md:justify-center">
                            <Trophy className="w-3 h-3" /> Winner
                        </div>

                        <div className="relative bg-emerald-500 border-2 border-emerald-600 rounded-lg p-2.5 flex items-center justify-center min-h-[48px] shadow-sm text-white">
                            <span className="font-black text-xs md:text-sm leading-tight text-center break-words w-full">
                                {userSelection || "-"}
                            </span>
                            <div className="absolute -bottom-2 bg-white rounded-full p-0.5 border-2 border-emerald-500">
                                <Check className="w-3 h-3 text-emerald-600" strokeWidth={4} />
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 text-right md:text-center w-auto md:w-full mt-2 md:mt-0">
                        <div className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Payout</div>
                        <div className="text-2xl font-black text-emerald-700">+{payout}</div>
                        <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">{currency} added</div>
                    </div>
                </>
            );
        }

        // --- 5. RESOLVED (LOST) ---
        return (
            <>
                <div className="flex-1 flex flex-col justify-center min-w-0 mr-2 md:mr-0 md:mb-3 opacity-60">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">You Picked</div>

                    <div className="relative bg-slate-100 border-2 border-slate-200 rounded-lg p-2.5 flex items-center justify-center min-h-[48px]">
                        <span className="font-black text-slate-500 text-xs md:text-sm leading-tight text-center break-words w-full line-through decoration-red-400">
                            {userSelection || "-"}
                        </span>
                        <XCircle className="w-4 h-4 text-slate-400 absolute top-1 right-1 opacity-50" />
                    </div>
                </div>

                <div className="flex-shrink-0 text-right md:text-center w-auto md:w-full">
                    <div className="text-xl font-black text-red-500">
                        {wagerAmount > 0 ? `-${wagerAmount}` : "0"}
                    </div>
                    <div className="text-[9px] font-bold text-red-400 uppercase tracking-wide">
                        {wagerAmount > 0 ? `${currency} lost` : `${currency} earned`}
                    </div>
                </div>
            </>
        );
    };

    // --- MAIN WRAPPER STYLES ---
    let containerClass = "bg-slate-50"; // Default
    let perforationBorderClass = "border-slate-300";

    if (status === "OPEN") {
        containerClass = "bg-slate-50";
    }
    if (status === "LOCKED") {
        containerClass = "bg-yellow-50/50";
        perforationBorderClass = "border-amber-200";
    }
    if (status === "PROOFING") {
        if (isWinning) {
            containerClass = "bg-green-50";
            perforationBorderClass = "border-green-300";
        } else {
            containerClass = "bg-blue-50";
            perforationBorderClass = "border-blue-200";
        }
    }
    if (status === "RESOLVED") {
        if (wagerStatus === "WON") {
            containerClass = "bg-emerald-100";
            perforationBorderClass = "border-emerald-300";
        } else {
            containerClass = "bg-slate-100";
            perforationBorderClass = "border-slate-300";
        }
    }

    return (
        <div className={`w-full md:w-36 p-3 md:p-4 flex flex-row md:flex-col items-center md:items-stretch justify-between relative h-full rounded-r-xl ${containerClass} transition-colors duration-300`}>
            {/* Perforation Effect - Top Hole (uses page background color for punch-through effect) */}
            <div className="absolute hidden md:block -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full z-20 bg-slate-100" style={{ boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)' }}></div>
            {/* Perforation Effect - Bottom Hole */}
            <div className="absolute hidden md:block -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full z-20 bg-slate-100" style={{ boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.2), 0 -1px 2px rgba(0,0,0,0.1)' }}></div>

            {/* Dashed line separator for perforation illusion */}
            <div className={`absolute hidden md:block top-0 bottom-0 -left-[1px] w-[1px] border-l-2 border-dashed ${perforationBorderClass} opacity-50`}></div>

            {/* Inner shadow for depth */}
            <div className="absolute inset-0 pointer-events-none rounded-r-xl" style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.06)' }}></div>

            {renderTicketContent()}
        </div>
    );
}
