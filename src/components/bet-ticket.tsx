import { Ticket, CheckCircle2 } from "lucide-react";

interface BetTicketProps {
    amount: number;
    potential: string;
    selectionDisplay: string;
    status?: string;
    explanation?: string;
}

export function BetTicket({ amount, potential, selectionDisplay, status = "ACCEPTED", explanation }: BetTicketProps) {
    return (
        <div className="relative bg-white w-full max-w-[300px] mx-auto rounded-sm border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden transform -rotate-2 hover:rotate-0 transition-all duration-300">
            {/* Yellow Header */}
            <div className="bg-yellow-400 p-3 border-b-4 border-black border-dashed flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-black" />
                    <span className="font-black uppercase text-base">My Bet Slip</span>
                </div>
                <span className="text-[10px] font-bold border-2 border-black rounded px-1 bg-white">ACTIVE</span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 bg-[radial-gradient(circle_at_center,_#ffffff_4px,_transparent_5px)] bg-[length:12px_12px]">
                <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Selection</p>
                    <p className="text-xl font-black text-black leading-tight bg-gray-100 p-2 rounded border border-black border-dashed break-words">
                        {selectionDisplay}
                    </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t-2 border-black/10 border-dashed">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">Wager</p>
                        <p className="text-lg font-black">{amount > 0 ? amount : "FREE"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Est. Win</p>
                        <p className="text-lg font-black text-green-600">{potential}</p>
                    </div>
                </div>
                {explanation && (
                    <p className="text-[9px] text-gray-400 font-bold text-center mt-2 italic leading-tight">
                        {explanation}
                    </p>
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
        </div>
    );
}
