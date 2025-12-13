"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, Plus, Trash } from "lucide-react";
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

    // AI Logic
    const [aiTopic, setAiTopic] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAiInput, setShowAiInput] = useState(false);

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
                // Pick the first one for simplicity or let user choose (Future: Carousel)
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
                type === "RANGE" ? { min: rangeMin, max: rangeMax, unit: rangeUnit } : undefined
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
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Create New Bet</h2>
                            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* AI Banner */}
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
                                <label className="text-sm font-medium">Question</label>
                                <input
                                    type="text"
                                    required
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="e.g. Who wins the match?"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as BetType)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900"
                                    >
                                        <option value="CHOICE">Multiple Choice</option>
                                        <option value="RANGE">Range / Number</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Closes At</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={closesAt}
                                        onChange={(e) => setClosesAt(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900"
                                    />
                                </div>
                            </div>

                            {type === "CHOICE" ? (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Options</label>
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                required
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                placeholder={`Option ${idx + 1}`}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900"
                                            />
                                            {options.length > 2 && (
                                                <button type="button" onClick={() => handleRemoveOption(idx)} className="p-2 text-muted-foreground hover:text-destructive">
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={handleAddOption} className="text-sm text-primary flex items-center hover:underline">
                                        <Plus className="h-4 w-4 mr-1" /> Add Option
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 rounded-md border p-4 bg-accent/20">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs font-medium">Min</label>
                                            <input
                                                type="number"
                                                value={rangeMin}
                                                onChange={(e) => setRangeMin(Number(e.target.value))}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm dark:bg-zinc-900"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-medium">Max</label>
                                            <input
                                                type="number"
                                                value={rangeMax}
                                                onChange={(e) => setRangeMax(Number(e.target.value))}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm dark:bg-zinc-900"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium">Unit (Optional)</label>
                                        <input
                                            type="text"
                                            value={rangeUnit}
                                            onChange={(e) => setRangeUnit(e.target.value)}
                                            placeholder="e.g. Points, Goals"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm dark:bg-zinc-900"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create
                                </button>
                            </div>

                        </form>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
