"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Ticket, CheckCircle2 } from "lucide-react";

interface BetTicketAnimationProps {
    amount: number;
    potential: string;
    selectionDisplay: string;
    onComplete: () => void;
}

export function BetTicketAnimation({ amount, potential, selectionDisplay, onComplete }: BetTicketAnimationProps) {
    useEffect(() => {
        // Auto-dismiss after 8 seconds (long enough to read)
        const timer = setTimeout(() => {
            onComplete();
        }, 8000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            onClick={onComplete}
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px]"
        >
            {/* Ticket */}
            <motion.div
                initial={{ y: 500, rotate: -20, opacity: 0 }}
                animate={{ y: 0, rotate: -3, opacity: 1 }}
                exit={{ y: -500, rotate: 10, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative bg-white w-72 rounded-sm border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] overflow-hidden pointer-events-auto"
                onClick={(e) => {
                    // Prevent closing if clicking on the ticket (optional, but requested behavior implies "click anywhere") 
                    // acts nicer if we just let it bubble or handle it. 
                    // User said "it doesnt stay", so click-anywhere to close is best.
                }}
            >
                {/* Yellow Header */}
                <div className="bg-yellow-400 p-4 border-b-4 border-black border-dashed flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Ticket className="h-6 w-6 text-black" />
                        <span className="font-black uppercase text-lg">Bet Slip</span>
                    </div>
                    <span className="text-xs font-bold border-2 border-black rounded px-1 bg-white">#{Math.floor(Math.random() * 10000)}</span>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 bg-[radial-gradient(circle_at_center,_#ffffff_4px,_transparent_5px)] bg-[length:12px_12px]">
                    <div className="text-center">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Selection</p>
                        <p className="text-xl font-black text-black leading-tight bg-gray-100 p-2 rounded border border-black border-dashed">
                            {selectionDisplay}
                        </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t-2 border-black/10 border-dashed">
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-500">Wager</p>
                            <p className="text-xl font-black">{amount > 0 ? amount : "FREE"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase font-bold text-gray-500">Est. Win</p>
                            <p className="text-xl font-black text-green-600">{potential}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Stamp */}
                <div className="bg-gray-100 p-3 border-t-4 border-black flex justify-center items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-black uppercase text-green-700 tracking-widest text-sm">ACCEPTED</span>
                </div>

                {/* Decorative Circles (Punch holes) */}
                <div className="absolute -left-3 top-1/2 w-6 h-6 bg-yellow-400 border-r-2 border-black rounded-full" />
                <div className="absolute -right-3 top-1/2 w-6 h-6 bg-yellow-400 border-l-2 border-black rounded-full" />
            </motion.div>
        </div>
    );
}
