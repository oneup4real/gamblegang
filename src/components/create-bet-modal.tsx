"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash, Wand2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createBet, BetType } from "@/lib/services/bet-service";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateBetModalProps {
    leagueId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    betToEdit?: any; // Simpler to use any for now, or import Bet
}

import { Bet } from "@/lib/services/bet-service";
import { updateBet } from "@/lib/services/bet-service";

export function CreateBetModal({ leagueId, isOpen, onClose, onSuccess, betToEdit }: CreateBetModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState("");
    const [type, setType] = useState<BetType>("CHOICE");
    const [eventDateStr, setEventDateStr] = useState("");
    const [lockBufferMinutes, setLockBufferMinutes] = useState(0); // 0 = At Start

    // Populate form if editing
    useEffect(() => {
        if (isOpen && betToEdit) {
            setQuestion(betToEdit.question);
            setType(betToEdit.type);

            // Dates
            if (betToEdit.eventDate?.seconds) {
                const d = new Date(betToEdit.eventDate.seconds * 1000);
                // Format to YYYY-MM-DDTHH:mm for input
                const dateString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setEventDateStr(dateString);
            }

            if (betToEdit.type === "CHOICE" && betToEdit.options) {
                setOptions(betToEdit.options.map((o: any) => o.text));
            }
            if (betToEdit.type === "MATCH" && betToEdit.matchDetails) {
                setMatchHome(betToEdit.matchDetails.homeTeam);
                setMatchAway(betToEdit.matchDetails.awayTeam);
            }
            if (betToEdit.type === "RANGE") {
                setRangeMin(betToEdit.rangeMin);
                setRangeMax(betToEdit.rangeMax);
                setRangeUnit(betToEdit.rangeUnit);
            }
        } else if (isOpen && !betToEdit) {
            // Reset if opening fresh
            setQuestion("");
            setType("CHOICE");
            setEventDateStr("");
            setOptions(["", ""]);
            setMatchHome("");
            setMatchAway("");
            setRangeMin(undefined);
            setRangeMax(undefined);
            setRangeUnit("");
        }
    }, [isOpen, betToEdit]);


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
                    date, // closesAt
                    date, // eventDate
                    bet.type === "CHOICE" ? bet.options : undefined,
                    undefined, // No range support in bulk for now
                    bet.type === "MATCH" ? { home: bet.matchHome, away: bet.matchAway } : undefined
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
            const evDate = new Date(eventDateStr);
            // Calculate closesAt: EventDate - Buffer
            const clDate = new Date(evDate.getTime() - (lockBufferMinutes * 60000));

            if (betToEdit) {
                // Editing existing draft
                await updateBet(leagueId, betToEdit.id, {
                    question,
                    type,
                    closesAt: clDate,
                    eventDate: evDate,
                    // Partial updates for specific types
                    ...(type === "CHOICE" ? { options: options.filter(o => o.trim() !== "").map((t, i) => ({ id: String(i), text: t, totalWagered: 0, odds: 1 })) } : {}),
                    ...(type === "RANGE" ? { rangeMin: Number(rangeMin), rangeMax: Number(rangeMax), rangeUnit } : {}),
                    ...(type === "MATCH" ? { matchDetails: { homeTeam: matchHome, awayTeam: matchAway, date: evDate.toISOString() } } : {}),
                });
                alert("Draft Updated!");
            } else {
                await createBet(
                    leagueId,
                    user,
                    question,
                    type,
                    clDate, // Calculated closesAt
                    evDate, // Actual Event Date
                    type === "CHOICE" ? options.filter(o => o.trim() !== "") : undefined,
                    type === "RANGE" ? { min: Number(rangeMin), max: Number(rangeMax), unit: rangeUnit } : undefined,
                    type === "MATCH" ? { home: matchHome, away: matchAway } : undefined // Fix match arg
                );
            }
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
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black tracking-tight font-comic uppercase text-black">
                                {betToEdit ? "Edit Draft Bet" : "Create New Bet"}
                            </h2>
                            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all">
                                <X className="h-6 w-6 text-black" />
                            </button>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-gray-100 border-2 border-black rounded-xl mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <button
                                onClick={() => setMode("SINGLE")}
                                className={`flex-1 py-2 text-sm font-black rounded-lg transition-all uppercase ${mode === "SINGLE" ? "bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                Single Bet
                            </button>
                            <button
                                onClick={() => setMode("BULK")}
                                className={`flex-1 py-2 text-sm font-black rounded-lg transition-all uppercase ${mode === "BULK" ? "bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                Bulk Wizard (AI)
                            </button>
                        </div>

                        {mode === "SINGLE" ? (
                            <>
                                {!showAiInput ? (
                                    <button
                                        onClick={() => setShowAiInput(true)}
                                        className="w-full mb-6 p-3 rounded-xl bg-purple-100 border-2 border-purple-500 text-purple-700 flex items-center justify-center gap-2 hover:bg-purple-200 transition-all font-bold shadow-[2px_2px_0px_0px_rgba(147,51,234,1)] active:translate-y-[1px] active:shadow-none"
                                    >
                                        <Wand2 className="h-4 w-4" />
                                        <span>Ask AI to draft a bet?</span>
                                    </button>
                                ) : (
                                    <div className="mb-6 p-4 rounded-xl bg-purple-50 border-2 border-purple-200 space-y-3">
                                        <label className="text-sm font-bold text-black border-b border-purple-200 pb-1 block">What's the topic?</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={aiTopic}
                                                onChange={(e) => setAiTopic(e.target.value)}
                                                placeholder="e.g. Super Bowl, Election..."
                                                className="flex-1 h-10 rounded-lg border-2 border-black bg-white px-3 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <Button
                                                onClick={handleAiGenerate}
                                                disabled={isAiLoading}
                                                className="bg-purple-600 text-white hover:bg-purple-700 border-2 border-black"
                                            >
                                                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="text-sm font-black text-black uppercase mb-1 block">Question</label>
                                        <input
                                            type="text"
                                            required
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            placeholder={type === "MATCH" ? `${matchHome || "Home"} vs ${matchAway || "Away"}` : "e.g. Who wins the match?"}
                                            className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-black text-black uppercase mb-1 block">Type</label>
                                            <div className="relative">
                                                <select
                                                    value={type}
                                                    onChange={(e) => setType(e.target.value as BetType)}
                                                    className="flex h-12 w-full appearance-none rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pr-8"
                                                >
                                                    <option value="CHOICE">Multiple Choice</option>
                                                    <option value="RANGE">Range / Number</option>
                                                    <option value="MATCH">Match Prediction</option>
                                                </select>
                                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                    <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-black text-black uppercase mb-1 block">Event Start Time</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={eventDateStr}
                                                onChange={(e) => setEventDateStr(e.target.value)}
                                                className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-black text-black uppercase mb-1 block">Lock Betting</label>
                                        <div className="relative">
                                            <select
                                                value={lockBufferMinutes}
                                                onChange={(e) => setLockBufferMinutes(Number(e.target.value))}
                                                className="flex h-12 w-full appearance-none rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pr-8"
                                            >
                                                <option value={0}>At Start (Kick-off)</option>
                                                <option value={15}>15 Minutes Before</option>
                                                <option value={60}>1 Hour Before</option>
                                                <option value={1440}>24 Hours Before</option>
                                            </select>
                                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500 mt-1">
                                            Betting will close at {eventDateStr ? new Date(new Date(eventDateStr).getTime() - (lockBufferMinutes * 60000)).toLocaleString() : "..."}
                                        </p>
                                    </div>

                                    {type === "CHOICE" && (
                                        <div className="space-y-3">
                                            <label className="text-sm font-black text-black uppercase block">Options</label>
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={opt}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        placeholder={`Option ${idx + 1}`}
                                                        className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    />
                                                    {options.length > 2 && (
                                                        <button type="button" onClick={() => handleRemoveOption(idx)} className="p-2 text-red-500 hover:text-red-700 transition-colors border-2 border-red-500 rounded-lg shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] active:translate-y-[1px] active:shadow-none hover:bg-red-50">
                                                            <Trash className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button type="button" onClick={handleAddOption} className="text-sm text-primary font-bold flex items-center hover:text-primary/80 transition-colors uppercase tracking-wide">
                                                <Plus className="h-4 w-4 mr-1 border-2 border-primary rounded-full p-0.5" /> Add Option
                                            </button>
                                        </div>
                                    )}

                                    {type === "MATCH" && (
                                        <div className="space-y-4 rounded-xl border-2 border-black bg-blue-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Home Team</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={matchHome}
                                                        onChange={(e) => setMatchHome(e.target.value)}
                                                        placeholder="e.g. Arsenal"
                                                        className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Away Team</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={matchAway}
                                                        onChange={(e) => setMatchAway(e.target.value)}
                                                        placeholder="e.g. Chelsea"
                                                        className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-blue-600 font-bold font-mono">
                                                Payouts: Exact(5), Diff(3), Winner(1).
                                            </p>
                                        </div>
                                    )}

                                    {/* Range - similar style */}
                                    {type === "RANGE" && (
                                        <div className="space-y-4 rounded-xl border-2 border-black bg-blue-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Min</label>
                                                    <input
                                                        type="number"
                                                        value={rangeMin}
                                                        onChange={(e) => setRangeMin(Number(e.target.value))}
                                                        className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Max</label>
                                                    <input
                                                        type="number"
                                                        value={rangeMax}
                                                        onChange={(e) => setRangeMax(Number(e.target.value))}
                                                        className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Unit</label>
                                                <input
                                                    type="text"
                                                    value={rangeUnit}
                                                    onChange={(e) => setRangeUnit(e.target.value)}
                                                    placeholder="e.g. Points, Goals"
                                                    className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-green-400 text-black border-2 border-black hover:bg-green-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all h-12 text-lg font-black uppercase tracking-widest"
                                        >
                                            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                            {betToEdit ? "Save Changes" : "Create Bet"}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-black text-black">Project / League</label>
                                        <input
                                            value={bulkTopic}
                                            onChange={(e) => setBulkTopic(e.target.value)}
                                            placeholder="e.g. Premier League, NBA..."
                                            className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-black text-black">Timeframe</label>
                                        <input
                                            value={bulkTimeframe}
                                            onChange={(e) => setBulkTimeframe(e.target.value)}
                                            placeholder="e.g. Next Week..."
                                            className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-black text-black">Bet Type</label>
                                        <div className="relative">
                                            <select
                                                value={bulkType}
                                                onChange={(e) => setBulkType(e.target.value as any)}
                                                className="flex h-10 w-full appearance-none rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                            >
                                                <option value="MATCH">Match Prediction (Exact Score)</option>
                                                <option value="CHOICE">1x2 (Home/Draw/Away)</option>
                                            </select>
                                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleBulkGenerate}
                                        disabled={isAiLoading}
                                        className="w-full h-12 bg-purple-600 text-white hover:bg-purple-700 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🤖 Generate Schedule"}
                                    </Button>
                                </div>

                                {/* Preview List */}
                                {bulkBets.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-gray-500 border-b-2 border-gray-100 pb-2">
                                            <span className="font-bold">Generated {bulkBets.length} matches</span>
                                            <button
                                                onClick={() => setSelectedBulkIndices(selectedBulkIndices.length === bulkBets.length ? [] : bulkBets.map((_, i) => i))}
                                                className="text-purple-600 hover:text-purple-800 font-bold"
                                            >
                                                {selectedBulkIndices.length === bulkBets.length ? "Deselect All" : "Select All"}
                                            </button>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                            {bulkBets.map((bet, i) => (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedBulkIndices.includes(i) ? "bg-purple-100 border-purple-500 shadow-[2px_2px_0px_0px_rgba(147,51,234,1)]" : "bg-white border-gray-200 hover:bg-gray-50"}`} onClick={() => {
                                                    if (selectedBulkIndices.includes(i)) {
                                                        setSelectedBulkIndices(selectedBulkIndices.filter(idx => idx !== i));
                                                    } else {
                                                        setSelectedBulkIndices([...selectedBulkIndices, i]);
                                                    }
                                                }}>
                                                    <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${selectedBulkIndices.includes(i) ? "bg-purple-600 border-purple-600" : "border-gray-300 bg-white"}`}>
                                                        {selectedBulkIndices.includes(i) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-sm text-black">{bet.question}</p>
                                                        <p className="text-xs text-gray-500 font-bold">{new Date(bet.date).toLocaleString()} • {bet.matchHome} vs {bet.matchAway}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t-2 border-dashed border-gray-200">
                                            <Button
                                                onClick={handleBulkCreate}
                                                disabled={loading || selectedBulkIndices.length === 0}
                                                className="w-full h-12 bg-green-500 hover:bg-green-600 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                            >
                                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                Create {selectedBulkIndices.length} Selected Bets
                                            </Button>
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
