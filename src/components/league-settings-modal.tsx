"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle, Save, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { League, updateLeague, resetLeague } from "@/lib/services/league-service";

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
    const [activeTab, setActiveTab] = useState<"general" | "danger">("general");

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            await updateLeague(league.id, { name });
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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                />
            )}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-card p-6 shadow-xl"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">League Settings</h2>
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex gap-4 border-b mb-6">
                        <button
                            onClick={() => setActiveTab("general")}
                            className={`pb-2 text-sm font-medium ${activeTab === "general" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab("danger")}
                            className={`pb-2 text-sm font-medium ${activeTab === "danger" ? "border-b-2 border-red-500 text-red-500" : "text-muted-foreground"}`}
                        >
                            Danger Zone
                        </button>
                    </div>

                    {activeTab === "general" && (
                        <form onSubmit={handleUpdateName} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">League Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="flex h-10 w-full rounded-md border bg-background px-3"
                                />
                            </div>
                            <button
                                disabled={loading}
                                className="flex w-full items-center justify-center rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </button>
                        </form>
                    )}

                    {activeTab === "danger" && (
                        <div className="space-y-4 p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg">
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-1" />
                                <div>
                                    <h4 className="font-bold text-red-700 dark:text-red-400">Reset Season</h4>
                                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                                        This will reset all members' points to the starting capital ({league.startCapital}).
                                        Use this when starting a new season.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleReset}
                                disabled={loading}
                                className="flex w-full items-center justify-center rounded-md bg-red-600 py-2 text-sm font-medium text-white shadow hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Reset Points
                            </button>
                        </div>
                    )}

                </motion.div>
            )}
        </AnimatePresence>
    );
}
