import React from 'react';
import { Check } from 'lucide-react';

interface SidePanelTicketProps {
    status: "OPEN" | "LOCKED" | "PROOFING" | "RESOLVED";
    wagerStatus?: "WON" | "LOST" | "PUSH" | "PENDING";
    userSelection?: string | null;
    wagerAmount?: number;
    potentialPayout?: number;
    payout?: number;
    currency?: string;
    isWinning?: boolean; // For preliminary winning status in PROOFING
    odds?: string;
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
    odds
}: SidePanelTicketProps) {

    // Helper to format selection text (handle long strings)
    const formatSelection = (text: string) => {
        if (!text) return "-";
        if (text.length > 20) return text.substring(0, 18) + "...";
        return text;
    };

    // --- RENDER LOGIC BASED ON STATUS ---

    // 1. OPEN STATE
    if (status === "OPEN") {
        return (
            <div className="w-32 bg-slate-50 p-4 flex flex-col items-center justify-center text-center relative min-h-[140px]">
                {/* Perforation Effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-b-2 border-slate-300"></div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-t-2 border-slate-300"></div>

                <div className="mb-4 w-full">
                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Your Pick</div>
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-sm mx-auto overflow-hidden p-1">
                        <span className="font-black text-blue-900 text-[10px] leading-tight text-center break-words w-full px-0.5">
                            {userSelection ? formatSelection(userSelection) : <span className="text-slate-300">?</span>}
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase mb-1">
                        <span>Wager: {wagerAmount}</span>
                        {odds && <span className="text-blue-600">(@{odds})</span>}
                    </div>
                    <div className="text-xl font-black text-green-600 leading-none">
                        {potentialPayout > 0 ? `+${Math.floor(potentialPayout)}` : '-'}
                    </div>
                    {potentialPayout > 0 && (
                        <div className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block mt-1">Potential</div>
                    )}
                </div>
            </div>
        );
    }

    // 2. LOCKED STATE
    if (status === "LOCKED") {
        return (
            <div className="w-32 bg-yellow-50/50 p-4 flex flex-col items-center justify-center text-center relative min-h-[140px]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-b-2 border-slate-300"></div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-t-2 border-slate-300"></div>

                <div className="mb-4 opacity-75 w-full">
                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Your Pick</div>
                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center shadow-sm mx-auto overflow-hidden p-1">
                        <span className="font-black text-white text-[10px] leading-tight text-center break-words w-full px-0.5">
                            {formatSelection(userSelection || "")}
                        </span>
                    </div>
                </div>

                <div className="opacity-75">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Wager: {wagerAmount}</div>
                    <div className="text-xl font-black text-slate-700 leading-none">
                        {potentialPayout > 0 ? `~${Math.floor(potentialPayout)}` : '-'}
                    </div>
                    <div className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1 border border-amber-200">Locked</div>
                </div>
            </div>
        );
    }

    // 3. PROOFING STATE
    if (status === "PROOFING") {
        // If user is winning (preliminary check)
        if (isWinning) {
            return (
                <div className="w-32 bg-green-50 p-4 flex flex-col items-center justify-center text-center relative border-l-2 border-green-500 min-h-[140px]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-b-2 border-green-500"></div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-t-2 border-green-500"></div>

                    {/* Ping Animation for Winning */}
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>

                    <div className="mb-4 w-full">
                        <div className="text-[9px] font-black uppercase text-green-600 tracking-wider mb-1">Winning</div>
                        <div className="w-14 h-14 rounded-full bg-white border-4 border-green-500 flex items-center justify-center shadow-sm mx-auto overflow-hidden p-1 relative">
                            <div className="absolute inset-0 bg-green-50 opacity-50"></div>
                            <span className="font-black text-green-900 text-[10px] leading-tight relative z-10 text-center break-words w-full px-0.5">
                                {formatSelection(userSelection || "")}
                            </span>
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] text-green-600 font-bold uppercase mb-1">Payout</div>
                        <div className="text-2xl font-black text-green-600">+{(potentialPayout || 0).toFixed(0)}</div>
                    </div>
                </div>
            );
        } else {
            // Not winning or undecided yet
            return (
                <div className="w-32 bg-blue-50 p-4 flex flex-col items-center justify-center text-center relative min-h-[140px]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-b-2 border-blue-200"></div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-t-2 border-blue-200"></div>

                    <div className="mb-4 w-full">
                        <div className="text-[9px] font-black uppercase text-blue-400 tracking-wider mb-1">Your Pick</div>
                        <div className="w-14 h-14 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center shadow-sm mx-auto overflow-hidden p-1">
                            <span className="font-black text-blue-900 text-[10px] leading-tight text-center break-words w-full px-0.5">
                                {formatSelection(userSelection || "")}
                            </span>
                        </div>
                    </div>

                    <div>
                        <div className="text-[9px] text-blue-500 font-bold uppercase mb-1">Wager: {wagerAmount}</div>
                        <div className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-1">Proofing</div>
                    </div>
                </div>
            );
        }
    }

    // 4. RESOLVED STATE (WON)
    if (status === "RESOLVED" && wagerStatus === "WON") {
        return (
            <div className="w-32 bg-emerald-100 p-4 flex flex-col items-center justify-center text-center relative min-h-[140px]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-b-2 border-emerald-200"></div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-t-2 border-emerald-200"></div>

                <div className="mb-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm mx-auto">
                        <Check className="w-6 h-6" strokeWidth={3} />
                    </div>
                </div>

                <div>
                    <div className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Payout</div>
                    <div className="text-2xl font-black text-emerald-700">+{payout}</div>
                    <div className="text-[9px] font-bold text-emerald-600">{currency} added</div>
                </div>
            </div>
        );
    }

    // 5. RESOLVED STATE (LOST) or DEFAULT
    return (
        <div className="w-32 bg-slate-50 p-4 flex flex-col items-center justify-center text-center relative border-l-4 border-red-500 min-h-[140px]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-b-2 border-slate-300"></div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f8fafc] rounded-full border-t-2 border-slate-300"></div>

            <div className="mb-2 w-full">
                <div className="text-[10px] font-bold uppercase text-slate-400">You Picked</div>
                <div className="text-lg font-black text-slate-400 line-through truncate px-1">
                    {formatSelection(userSelection || "")}
                </div>
            </div>

            <div>
                <div className="text-xl font-black text-red-500">-{wagerAmount}</div>
                <div className="text-[9px] font-bold text-red-400">{currency} lost</div>
            </div>
        </div>
    );
}
