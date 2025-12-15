"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createBet, BetType } from "@/lib/services/bet-service";
import { Loader2 } from "lucide-react";

interface CreateBetModalProps {
    leagueId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateBetModal({ leagueId, isOpen, onClose, onSuccess }: CreateBetModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState("");
    const [type, setType] = useState<BetType>("CHOICE");
    const [closesAt, setClosesAt] = useState("");

    // Choice Logic
    const [options, setOptions] = useState<string[]>(["", ""]);

    // Range Logic
    const [rangeMin, setRangeMin] = useState<number | undefined>(undefined);
    const [rangeMax, setRangeMax] = useState<number | undefined>(undefined);
    const [rangeUnit, setRangeUnit] = useState("");

    // Match Logic
    const [matchHome, setMatchHome] = useState("");
    const [matchAway, setMatchAway] = useState("");

    // AI Logic
    const [aiTopic, setAiTopic] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAiInput, setShowAiInput] = useState(false);



    // Bulk Logic
    const [mode, setMode] = useState<"SINGLE" | "BULK">("SINGLE");
    const [bulkTopic, setBulkTopic] = useState("");
    const [bulkTimeframe, setBulkTimeframe] = useState("");
    const [bulkType, setBulkType] = useState<"CHOICE" | "MATCH">("MATCH");
    const [bulkBets, setBulkBets] = useState<any[]>([]);
    const [selectedBulkIndices, setSelectedBulkIndices] = useState<number[]>([]);

    const handleBulkGenerate = async () => {
        if (!bulkTopic.trim() || !bulkTimeframe.trim()) return alert("Please fill in topic and timeframe");
        setIsAiLoading(true);
        setBulkBets([]);
        try {
            const { generateBulkBets } = await import("@/app/actions/ai-bet-actions");
            const res = await generateBulkBets(bulkTopic, bulkTimeframe, bulkType);
            if (Array.isArray(res) && res.length > 0) {
                setBulkBets(res);
                setSelectedBulkIndices(res.map((_, i) => i)); // Select all by default
            } else {
                alert("No bets found for this criteria.");
            }
        } catch (e) {
            console.error(e);
            alert("Bulk generation failed");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleBulkCreate = async () => {
        if (selectedBulkIndices.length === 0) return;
        setLoading(true);
        try {
            let successCount = 0;
            for (const idx of selectedBulkIndices) {
                const bet = bulkBets[idx];
                // format date or use default if invalid
                const date = bet.date ? new Date(bet.date) : new Date(Date.now() + 86400000);

                await createBet(
                    leagueId,
                    user!,
                    bet.question,
                    bet.type,
                    date,
                    bet.type === "CHOICE" ? bet.options : undefined,
                    undefined, // No range support in bulk for now
                    bet.type === "MATCH" ? { homeTeam: bet.matchHome, awayTeam: bet.matchAway, date: bet.date } : undefined
                );
                successCount++;
            }
            alert(`Successfully created ${successCount} bets!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Some bets failed to create.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddOption = () => setOptions([...options, ""]);
    const handleRemoveOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));
    const handleOptionChange = (idx: number, val: string) => {
        const newOpts = [...options];
        newOpts[idx] = val;
        setOptions(newOpts);
    };

    const handleAiGenerate = async () => {
        if (!aiTopic.trim()) return alert("Enter a topic (e.g. 'Champions League Final')");
        setIsAiLoading(true);
        try {
            const { generateBetIdeas } = await import("@/app/actions/ai-bet-actions");
            const ideas = await generateBetIdeas(aiTopic);
            if (ideas && ideas.length > 0) {
                const idea = ideas[0];
                setQuestion(idea.question);
                setType(idea.type as BetType);
                if (idea.type === "CHOICE" && idea.options) {
                    setOptions(idea.options);
                }
                if (idea.type === "RANGE") {
                    setRangeMin(idea.rangeMin);
                    setRangeMax(idea.rangeMax);
                    setRangeUnit(idea.rangeUnit || "");
                }
                setShowAiInput(false);
            } else {
                alert("No ideas returned. Try a different topic.");
            }
        } catch (e) {
            console.error(e);
            alert("AI generation failed");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await createBet(
                leagueId,
                user,
                question,
                type,
                new Date(closesAt),
                type === "CHOICE" ? options.filter(o => o.trim() !== "") : undefined,
                type === "RANGE" ? { min: rangeMin, max: rangeMax, unit: rangeUnit } : undefined,
                type === "MATCH" ? { homeTeam: matchHome, awayTeam: matchAway, date: closesAt } : undefined
            );
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to create bet");
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
                        className="glass fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Create New Bet</h2>
                            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-secondary/50 rounded-lg mb-6">
                            <button
                                onClick={() => setMode("SINGLE")}
                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === "SINGLE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"}`}
                            >
                                Single Bet
                            </button>
                            <button
                                onClick={() => setMode("BULK")}
                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === "BULK" ? "bg-purple-600 text-white shadow" : "text-muted-foreground hover:text-white"}`}
                            >
                                Bulk Wizard (AI)
                            </button>
                        </div>

                        {mode === "SINGLE" ? (
                            <>
                                {!showAiInput ? (
                                    <button
                                        onClick={() => setShowAiInput(true)}
                                        className="w-full mb-6 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-all"
                                    >
                                        <span className="font-bold">✨ Ask AI to draft a bet?</span>
                                    </button>
                                ) : (
                                    <div className="mb-6 p-4 rounded-lg bg-secondary/50 border space-y-3">
                                        <label className="text-sm font-medium">What's the topic?</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={aiTopic}
                                                onChange={(e) => setAiTopic(e.target.value)}
                                                placeholder="e.g. Super Bowl, Election, Weather..."
                                                className="flex-1 h-9 rounded-md border bg-background px-3"
                                            />
                                            <button
                                                onClick={handleAiGenerate}
                                                disabled={isAiLoading}
                                                className="bg-purple-600 text-white px-4 rounded-md font-medium text-sm hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="text-sm font-bold text-white drop-shadow-md">Question</label>
                                        <input
                                            type="text"
                                            required
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            placeholder={type === "MATCH" ? `${matchHome || "Home"} vs ${matchAway || "Away"}` : "e.g. Who wins the match?"}
                                            className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-white drop-shadow-md">Type</label>
                                            <select
                                                value={type}
                                                onChange={(e) => setType(e.target.value as BetType)}
                                                className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                            >
                                                <option value="CHOICE" className="bg-zinc-900 text-white">Multiple Choice</option>
                                                <option value="RANGE" className="bg-zinc-900 text-white">Range / Number</option>
                                                <option value="MATCH" className="bg-zinc-900 text-white">Match Prediction</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-white drop-shadow-md">Closes At</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={closesAt}
                                                onChange={(e) => setClosesAt(e.target.value)}
                                                className="flex h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    {type === "CHOICE" && (
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-white drop-shadow-md">Options</label>
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={opt}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        placeholder={`Option ${idx + 1}`}
                                                        className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                                    />
                                                    {options.length > 2 && (
                                                        <button type="button" onClick={() => handleRemoveOption(idx)} className="p-2 text-red-400 hover:text-red-300 transition-colors">
                                                            <Trash className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button type="button" onClick={handleAddOption} className="text-sm text-primary font-bold flex items-center hover:text-primary/80 transition-colors">
                                                <Plus className="h-4 w-4 mr-1" /> Add Option
                                            </button>
                                        </div>
                                    )}

                                    {type === "MATCH" && (
                                        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-white/50">Home Team</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={matchHome}
                                                        onChange={(e) => setMatchHome(e.target.value)}
                                                        placeholder="e.g. Arsenal"
                                                        className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-white focus:border-primary/50 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-white/50">Away Team</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={matchAway}
                                                        onChange={(e) => setMatchAway(e.target.value)}
                                                        placeholder="e.g. Chelsea"
                                                        className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-white focus:border-primary/50 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-white/50 font-mono">
                                                Payout Shares: Exact Score (5), Goal Diff (3), Winner (1).
                                            </p>
                                        </div>
                                    )}

                                    {type === "RANGE" && (
                                        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-white/50">Min</label>
                                                    <input
                                                        type="number"
                                                        value={rangeMin}
                                                        onChange={(e) => setRangeMin(Number(e.target.value))}
                                                        className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-white focus:border-primary/50 outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-white/50">Max</label>
                                                    <input
                                                        type="number"
                                                        value={rangeMax}
                                                        onChange={(e) => setRangeMax(Number(e.target.value))}
                                                        className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-white focus:border-primary/50 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-white/50">Unit (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={rangeUnit}
                                                    onChange={(e) => setRangeUnit(e.target.value)}
                                                    placeholder="e.g. Points, Goals"
                                                    className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-white focus:border-primary/50 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-green-400 px-8 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(0,255,100,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,255,100,0.5)] disabled:opacity-50"
                                        >
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Bet
                                        </motion.button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-white">Project / League</label>
                                        <input
                                            value={bulkTopic}
                                            onChange={(e) => setBulkTopic(e.target.value)}
                                            placeholder="e.g. Premier League, NBA Playoffs..."
                                            className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/20 focus:border-purple-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-white">Timeframe</label>
                                        <input
                                            value={bulkTimeframe}
                                            onChange={(e) => setBulkTimeframe(e.target.value)}
                                            placeholder="e.g. Next 3 gameweeks, Until March 2026..."
                                            className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/20 focus:border-purple-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-white">Bet Type</label>
                                        <select
                                            value={bulkType}
                                            onChange={(e) => setBulkType(e.target.value as any)}
                                            className="flex h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white focus:border-purple-500/50 outline-none"
                                        >
                                            <option value="MATCH" className="bg-zinc-900">Match Prediction (Exact Score)</option>
                                            <option value="CHOICE" className="bg-zinc-900">1x2 (Home/Draw/Away)</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={handleBulkGenerate}
                                        disabled={isAiLoading}
                                        className="w-full flex items-center justify-center rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🤖 Generate Schedule"}
                                    </button>
                                </div>

                                {/* Preview List */}
                                {bulkBets.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-white/50 border-b border-white/10 pb-2">
                                            <span>Generated {bulkBets.length} matches</span>
                                            <button
                                                onClick={() => setSelectedBulkIndices(selectedBulkIndices.length === bulkBets.length ? [] : bulkBets.map((_, i) => i))}
                                                className="text-purple-400 hover:text-purple-300"
                                            >
                                                {selectedBulkIndices.length === bulkBets.length ? "Deselect All" : "Select All"}
                                            </button>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                            {bulkBets.map((bet, i) => (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedBulkIndices.includes(i) ? "bg-purple-500/20 border-purple-500/50" : "bg-black/20 border-white/5 hover:bg-white/5"}`} onClick={() => {
                                                    if (selectedBulkIndices.includes(i)) {
                                                        setSelectedBulkIndices(selectedBulkIndices.filter(idx => idx !== i));
                                                    } else {
                                                        setSelectedBulkIndices([...selectedBulkIndices, i]);
                                                    }
                                                }}>
                                                    <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center ${selectedBulkIndices.includes(i) ? "bg-purple-500 border-purple-500" : "border-white/30"}`}>
                                                        {selectedBulkIndices.includes(i) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-sm text-white">{bet.question}</p>
                                                        <p className="text-xs text-white/50">{new Date(bet.date).toLocaleString()} • {bet.matchHome} vs {bet.matchAway} • {bet.type === "MATCH" ? "Score Prediction" : "1x2"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-white/10">
                                            <button
                                                onClick={handleBulkCreate}
                                                disabled={loading || selectedBulkIndices.length === 0}
                                                className="w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-3 text-sm font-bold text-white shadow hover:shadow-lg disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                Create {selectedBulkIndices.length} Selected Bets
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
