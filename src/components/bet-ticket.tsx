import { Ticket, CheckCircle2 } from "lucide-react";
import { useTranslations } from 'next-intl';

interface BetTicketProps {
    amount: number;
    potential: string;
    selectionDisplay: string;
    status?: string;
    explanation?: string;
    wagerStatus?: "WON" | "LOST" | "PUSH" | "PENDING"; // Add wager status
    eventDate?: any; // Event date (Firebase Timestamp or Date)
    verification?: {
        verified: boolean;
        source: string;
        verifiedAt: string;
        method: "AI_GROUNDING" | "MANUAL" | "API";
        confidence?: "high" | "medium" | "low";
    };
}

export function BetTicket({ amount, potential, selectionDisplay, status = "ACCEPTED", explanation, wagerStatus = "PENDING", eventDate, verification }: BetTicketProps) {
    const t = useTranslations('Bets.BetTicket');

    // Determine colors based on wager status
    const isResolved = wagerStatus && wagerStatus !== "PENDING";
    const isWon = wagerStatus === "WON";
    const isLost = wagerStatus === "LOST";
    const isPush = wagerStatus === "PUSH";

    const selectionBgColor = isWon ? "bg-green-100 border-green-600" :
        isLost ? "bg-red-100 border-red-600" :
            isPush ? "bg-yellow-100 border-yellow-600" :
                "bg-gray-100 border-black";

    const selectionTextColor = isWon ? "text-green-800" :
        isLost ? "text-red-800" :
            isPush ? "text-yellow-800" :
                "text-black";

    // Ticket always shows "Total Cashout" (full payout amount, not profit)
    const resultLabel = "Total Cashout";
    const resultColor = isWon ? "text-green-600" : isLost ? "text-red-600" : isPush ? "text-yellow-600" : "text-blue-600";

    return (
        <div className="relative bg-white w-full max-w-[300px] mx-auto rounded-sm border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden transform -rotate-2 hover:rotate-0 transition-all duration-300">
            {/* Yellow Header */}
            <div className="bg-yellow-400 p-3 border-b-4 border-black border-dashed flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-black" />
                    <span className="font-black uppercase text-base">{t('myBetSlip')}</span>
                </div>
                <span className="text-[10px] font-bold border-2 border-black rounded px-1 bg-white">{t('active')}</span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 bg-[radial-gradient(circle_at_center,_#ffffff_4px,_transparent_5px)] bg-[length:12px_12px]">
                <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">{t('selection')}</p>
                    <p className={`text-xl font-black leading-tight p-2 rounded border-2 border-dashed break-words ${selectionBgColor} ${selectionTextColor}`}>
                        {selectionDisplay}
                    </p>

                    {/* Event Date */}
                    {eventDate && (
                        <div className="mt-2 flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-gray-400">📅</span>
                            <p className="text-[10px] font-bold text-gray-600">
                                {(() => {
                                    try {
                                        const date = eventDate.toDate ? eventDate.toDate() : new Date(eventDate);
                                        return date.toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    } catch (e) {
                                        return 'Date TBD';
                                    }
                                })()}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t-2 border-black/10 border-dashed">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">{t('wager')}</p>
                        <p className="text-lg font-black">{amount > 0 ? amount : t('free')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-500">{resultLabel}</p>
                        <p className={`text-lg font-black ${resultColor}`}>{potential}</p>
                    </div>
                </div>
                {explanation && (
                    <p className="text-[9px] text-gray-400 font-bold text-center mt-2 italic leading-tight">
                        {explanation}
                    </p>
                )}

                {/* Verification Stamp - shown on all resolved bets */}
                {verification && verification.verified && (
                    <div className="mt-3 p-2 bg-green-50 border-2 border-green-300 border-dashed rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="text-[10px] font-black text-green-700 uppercase">Verified Result</span>
                        </div>
                        <div className="space-y-0.5 text-center">
                            <p className="text-[9px] font-bold text-gray-600">
                                📰 Source: {verification.source}
                            </p>
                            <p className="text-[9px] font-bold text-gray-500">
                                🕒 {new Date(verification.verifiedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                                {verification.method === "AI_GROUNDING" ? "⚡ AI Verified" :
                                    verification.method === "API" ? "🔗 API Verified" : "👤 Manual"}
                                {verification.confidence && ` • ${verification.confidence} confidence`}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Stamp */}
            <div className="bg-gray-100 p-2 border-t-4 border-black flex justify-center items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-black uppercase text-green-700 tracking-widest text-xs">{status}</span>
            </div>

            {/* Decorative Circles */}
            <div className="absolute -left-2 top-1/2 w-4 h-4 bg-yellow-400 border-r-2 border-black rounded-full" />
            <div className="absolute -right-2 top-1/2 w-4 h-4 bg-yellow-400 border-l-2 border-black rounded-full" />

            {/* Refund Overlay */}
            {wagerStatus === "PUSH" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 p-4">
                    <div className="bg-white border-4 border-black p-3 transform -rotate-12 shadow-[4px_4px_0_0_rgba(255,255,255,0.5)]">
                        <p className="text-2xl font-black text-black uppercase tracking-widest text-center leading-none">
                            REFUNDED
                        </p>
                        <p className="text-[10px] font-bold text-center mt-1 uppercase bg-yellow-400 px-1">
                            Full Amount Returned
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
