"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle, Save, RefreshCw, Trash } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { League, updateLeague, resetLeague } from "@/lib/services/league-service";
import { Button } from "@/components/ui/button";

interface LeagueSettingsModalProps {
    league: League;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function LeagueSettingsModal({ league, isOpen, onClose, onUpdate }: LeagueSettingsModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(league.name);
    // Match Settings (Standard Mode)
    const [exactMult, setExactMult] = useState(league.matchSettings?.exact || 3);
    const [winnerMult, setWinnerMult] = useState(league.matchSettings?.winner || 2);
    const [diffMult, setDiffMult] = useState(league.matchSettings?.diff || 1);
    const [choicePoints, setChoicePoints] = useState(league.matchSettings?.choice || 1);
    const [rangePoints, setRangePoints] = useState(league.matchSettings?.range || 1);

    const [activeTab, setActiveTab] = useState<"general" | "danger">("general");

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const updates: Partial<League> = { name };
            if (league.mode === "STANDARD") {
                updates.matchSettings = {
                    exact: exactMult,
                    winner: winnerMult,
                    diff: diffMult,
                    choice: choicePoints,
                    range: rangePoints
                };
            }
            // Ensure no undefined values in updates (though state should prevent this)
            const cleanUpdates = JSON.parse(JSON.stringify(updates));
            await updateLeague(league.id, cleanUpdates);
            onUpdate();
            alert("League updated");
        } catch (e) {
            alert("Error updating league");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        const confirmMsg = "DANGER: This will reset EVERY member's points to " + league.startCapital + ". This cannot be undone.";
        if (!confirm(confirmMsg)) return;
        // Double confirmation
        if (prompt("Type 'RESET' to confirm") !== "RESET") return;

        setLoading(true);
        try {
            await resetLeague(league.id, league.startCapital);
            onUpdate();
            alert("Season reset! All members back to starting capital.");
            onClose();
        } catch (e) {
            alert("Error resetting league");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black tracking-tight font-comic uppercase">League Settings</h2>
                            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex gap-4 border-b-2 border-black mb-6">
                            <button
                                onClick={() => setActiveTab("general")}
                                className={`pb-2 text-sm font-black uppercase tracking-wide transition-all ${activeTab === "general" ? "border-b-4 border-primary text-primary translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                General
                            </button>
                            <button
                                onClick={() => setActiveTab("danger")}
                                className={`pb-2 text-sm font-black uppercase tracking-wide transition-all ${activeTab === "danger" ? "border-b-4 border-red-500 text-red-500 translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                Danger Zone
                            </button>
                        </div>

                        {activeTab === "general" && (
                            <form onSubmit={handleUpdateName} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase">League Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-lg font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-primary/20"
                                    />
                                </div>

                                {league.mode === "STANDARD" && (
                                    <div className="space-y-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                                        <h4 className="text-sm font-black uppercase text-purple-800 flex items-center gap-2">
                                            Arcade Point Settings
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Exact</label>
                                                <input type="number" min={1} value={exactMult} onChange={(e) => setExactMult(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Winner</label>
                                                <input type="number" min={1} value={winnerMult} onChange={(e) => setWinnerMult(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Diff</label>
                                                <input type="number" min={1} value={diffMult} onChange={(e) => setDiffMult(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Choice</label>
                                                <input type="number" min={1} value={choicePoints} onChange={(e) => setChoicePoints(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Guess</label>
                                                <input type="number" min={1} value={rangePoints} onChange={(e) => setRangePoints(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-purple-600 space-y-1 mt-2">
                                            <p>Points awarded for correct predictions.</p>
                                            <p className="opacity-75 italic border-t border-purple-200 pt-1">
                                                Note: No fixed points can be set for Zero Sum betting, because the odds are calculated dynamically like in real life.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {league.mode === "ZERO_SUM" && (
                                    <div className="space-y-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                                        <h4 className="text-sm font-black uppercase text-gray-500">Betting Settings</h4>
                                        <p className="text-xs font-bold text-gray-400 italic">
                                            Note: No fixed points can be set for Zero Sum betting, because the odds are calculated dynamically like in real life.
                                        </p>
                                    </div>
                                )}
                                <Button
                                    disabled={loading}
                                    className="w-full h-12 bg-primary text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </form>
                        )}

                        {activeTab === "danger" && (
                            <div className="space-y-6">
                                <div className="space-y-4 p-4 border-2 border-black bg-red-50 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-100 rounded-lg border-2 border-black">
                                            <AlertTriangle className="h-6 w-6 text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-red-700 text-lg uppercase">Reset Season</h4>
                                            <p className="text-xs font-bold text-red-600/80 mt-1">
                                                This will reset all members' points to the starting capital ({league.startCapital}).
                                                Use this when starting a new season.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleReset}
                                        disabled={loading}
                                        className="w-full bg-red-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700"
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Reset Points
                                    </Button>
                                </div>

                                <div className="space-y-4 p-4 border-2 border-black bg-red-100 rounded-xl border-dashed">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-200 rounded-lg border-2 border-black">
                                            <Trash className="h-6 w-6 text-red-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-red-700 text-lg uppercase">Delete League</h4>
                                            <p className="text-xs font-bold text-red-600/80 mt-1">
                                                Permanently delete this league and all its data. Irreversible.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("CRITICAL WARNING: Are you sure you want to delete this league? This cannot be undone.")) return;
                                            if (prompt("To match deletion, type 'DELETE' below:") !== "DELETE") return;

                                            try {
                                                setLoading(true);
                                                const { deleteLeague } = await import("@/lib/services/league-service");
                                                await deleteLeague(league.id);
                                                alert("League deleted.");
                                                window.location.href = "/dashboard";
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to delete league");
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center rounded-xl border-2 border-red-500 bg-transparent py-3 text-sm font-black text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-all uppercase tracking-wide"
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete League Permanently"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
