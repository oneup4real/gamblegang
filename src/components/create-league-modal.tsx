"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Coins } from "lucide-react";
import { createLeague } from "@/lib/services/league-service";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

interface CreateLeagueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
    const [name, setName] = useState("");
    const [startCapital, setStartCapital] = useState(1000);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const leagueId = await createLeague(user, name, startCapital);
            onClose();
            router.push(`/leagues/${leagueId}`);
        } catch (error) {
            console.error(error);
            // Ideally show toast error here
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
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-card p-6 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Create League</h2>
                            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    League Name
                                </label>
                                <div className="relative">
                                    <Trophy className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. The Sunday Gamblers"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Starting Capital (Points)
                                </label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="number"
                                        required
                                        min={100}
                                        max={100000}
                                        value={startCapital}
                                        onChange={(e) => setStartCapital(parseInt(e.target.value))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Initial points given to every member.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : "Create League"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
