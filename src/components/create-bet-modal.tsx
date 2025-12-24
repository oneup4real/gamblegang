"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash, Pencil, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createBet, BetType, Bet, updateBet } from "@/lib/services/bet-service";
import { Button } from "@/components/ui/button";
import { AIProgressOverlay } from "@/components/ai-progress-overlay";
import { HelpTooltip, LabelWithHelp } from "@/components/ui/help-tooltip";
import { useTranslations } from "next-intl";

import { LeagueMode } from "@/lib/services/league-service";

interface CreateBetModalProps {
    leagueId: string;
    leagueMode?: LeagueMode; // Add leagueMode
    aiAutoConfirmEnabled?: boolean; // New prop
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    betToEdit?: any;
}

export function CreateBetModal({ leagueId, leagueMode, aiAutoConfirmEnabled, isOpen, onClose, onSuccess, betToEdit }: CreateBetModalProps) {
    const t = useTranslations('Bets');
    const tAi = useTranslations('AI');
    const tHelp = useTranslations('Help');
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [progress, setProgress] = useState(0);
    const [overlayMessage, setOverlayMessage] = useState("");
    const [question, setQuestion] = useState("");
    const [type, setType] = useState<BetType>("CHOICE");
    const [eventDateStr, setEventDateStr] = useState("");
    const [eventEndDateStr, setEventEndDateStr] = useState(""); // Optional event end time
    const [lockBufferMinutes, setLockBufferMinutes] = useState(0); // 0 = At Start
    // Removed autoConfirm/delay config state as it is now league-level


    // Choice Logic
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [choiceStyle, setChoiceStyle] = useState<"VARIOUS" | "MATCH_WINNER" | "MATCH_1X2">("VARIOUS"); // Track choice style

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
    const [bulkNoResults, setBulkNoResults] = useState(false);

    // Populate form if editing
    // Populate form if editing
    useEffect(() => {
        if (isOpen && betToEdit) {
            setQuestion(betToEdit.question);
            setType(betToEdit.type);

            // Handle Date formatting for input
            let d: Date;
            // Firestore Timestamp check
            if (betToEdit.eventDate && typeof betToEdit.eventDate.toDate === 'function') {
                d = betToEdit.eventDate.toDate();
            } else if (betToEdit.eventDate && typeof betToEdit.eventDate.seconds === 'number') {
                d = new Date(betToEdit.eventDate.seconds * 1000);
            } else {
                d = new Date(betToEdit.eventDate);
            }

            if (!isNaN(d.getTime())) {
                // Input datetime-local expects YYYY-MM-DDTHH:mm
                // Adjust for local timezone offset
                const offset = d.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                setEventDateStr(localISOTime);

                // Calculate Lock Buffer
                let closeDate: Date | null = null;
                if (betToEdit.closesAt && typeof betToEdit.closesAt.toDate === 'function') {
                    closeDate = betToEdit.closesAt.toDate();
                } else if (betToEdit.closesAt && typeof betToEdit.closesAt.seconds === 'number') {
                    closeDate = new Date(betToEdit.closesAt.seconds * 1000);
                } else if (betToEdit.closesAt) {
                    closeDate = new Date(betToEdit.closesAt);
                }

                if (closeDate && !isNaN(closeDate.getTime())) {
                    const diff = (d.getTime() - closeDate.getTime()) / 60000;
                    // Match nearest option or default to 0
                    if (diff >= 1440) setLockBufferMinutes(1440);
                    else if (diff >= 60) setLockBufferMinutes(60);
                    else if (diff >= 15) setLockBufferMinutes(15);
                    else setLockBufferMinutes(0);
                }
            } else {
                setEventDateStr("");
            }

            if (betToEdit.type === "CHOICE") {
                if (betToEdit.options && betToEdit.options.length > 0) {
                    setOptions(betToEdit.options.map((o: any) => o.text));
                } else {
                    setOptions(["", ""]);
                }
            }

            if (betToEdit.type === "RANGE") {
                setRangeMin(betToEdit.rangeMin);
                setRangeMax(betToEdit.rangeMax);
                setRangeUnit(betToEdit.unit || "");
            }

            if (betToEdit.type === "MATCH" && betToEdit.matchDetails) {
                setMatchHome(betToEdit.matchDetails.homeTeam);
                setMatchAway(betToEdit.matchDetails.awayTeam);
            }

            // Handle Event End Date if present
            if (betToEdit.eventEndDate) {
                let endD: Date;
                if (typeof betToEdit.eventEndDate.toDate === 'function') {
                    endD = betToEdit.eventEndDate.toDate();
                } else if (typeof betToEdit.eventEndDate.seconds === 'number') {
                    endD = new Date(betToEdit.eventEndDate.seconds * 1000);
                } else {
                    endD = new Date(betToEdit.eventEndDate);
                }
                if (!isNaN(endD.getTime())) {
                    const offset = endD.getTimezoneOffset() * 60000;
                    const localISOEndTime = (new Date(endD.getTime() - offset)).toISOString().slice(0, 16);
                    setEventEndDateStr(localISOEndTime);
                }
            } else {
                setEventEndDateStr("");
            }

        } else if (isOpen && !betToEdit) {
            // Reset if opening fresh
            setQuestion("");
            setType(leagueMode === "ZERO_SUM" ? "CHOICE" : "CHOICE");
            setOptions(["", ""]);
            setRangeMin(undefined);
            setRangeMax(undefined);
            setRangeUnit("");
            setMatchHome("");
            setMatchAway("");
            setEventDateStr("");
            setEventEndDateStr(""); // Reset event end date
            setLockBufferMinutes(0);
        }
    }, [isOpen, betToEdit, leagueMode]);

    // Check if bet has existing wagers (prevents editing options)
    const hasWagers = betToEdit && betToEdit.wagerCount && betToEdit.wagerCount > 0;

    // Outcome Type for Bulk
    const [bulkOutcomeType, setBulkOutcomeType] = useState<"WINNER" | "WINNER_DRAW">("WINNER_DRAW");

    const handleBulkGenerate = async () => {
        if (!bulkTopic) return;
        setIsAiLoading(true);
        setBulkNoResults(false);
        setLoadingMessage(tAi('scanning'));
        setProgress(10);

        try {
            const { generateBulkBets } = await import("@/app/actions/ai-bet-actions");
            // Simulate progress
            const interval = setInterval(() => setProgress(p => p < 80 ? p + 10 : p), 500);

            // Standard/Arcade Mode => Use Bulk Type (MATCH vs CHOICE)
            // Zero Sum => Force CHOICE
            const targetType = leagueMode === "ZERO_SUM" ? "CHOICE" : bulkType;

            const bets = await generateBulkBets(bulkTopic, bulkTimeframe || "Upcoming", targetType, bulkOutcomeType);

            clearInterval(interval);
            setProgress(100);

            if (bets && bets.length > 0) {
                setLoadingMessage(tAi('found', { count: bets.length }));
                setBulkBets(bets);
                setSelectedBulkIndices(bets.map((_: any, i: number) => i)); // Select all by default
                setBulkNoResults(false);
            } else {
                setLoadingMessage(tAi('noBets'));
                setBulkBets([]);
                setBulkNoResults(true);
            }
        } catch (error) {
            console.error(error);
            setLoadingMessage(tAi('error'));
        } finally {
            setIsAiLoading(false);
            setProgress(0);
        }
    };

    const handleBulkCreate = async () => {
        if (selectedBulkIndices.length === 0) return;
        setLoading(true);
        setOverlayMessage(tAi('processing'));
        setProgress(0);
        try {
            let successCount = 0;
            const total = selectedBulkIndices.length;

            for (let i = 0; i < total; i++) {
                const idx = selectedBulkIndices[i];
                const bet = bulkBets[idx];
                const date = bet.date ? new Date(bet.date) : new Date(Date.now() + 86400000);

                // Zero Sum enforcement
                const finalType = leagueMode === "ZERO_SUM" ? "CHOICE" : bet.type;

                // Pass matchDetails for both MATCH and CHOICE types when we have team info
                const matchDetails = bet.matchHome && bet.matchAway
                    ? { home: bet.matchHome, away: bet.matchAway }
                    : undefined;

                await createBet(
                    leagueId,
                    user!,
                    bet.question,
                    finalType,
                    date,
                    date,
                    finalType === "CHOICE" ? bet.options : undefined,
                    undefined,
                    matchDetails, // Pass matchDetails for both MATCH and CHOICE
                    aiAutoConfirmEnabled !== false, // Default true
                    120, // Fixed delay
                    // Map bulkOutcomeType to choiceStyle for CHOICE bets
                    finalType === "CHOICE" ? (bulkOutcomeType === "WINNER" ? "MATCH_WINNER" : "MATCH_1X2") : undefined
                );
                successCount++;
                setProgress(Math.round(((i + 1) / total) * 100));
            }
            alert(t('successCreate', { count: successCount }));
            if (onSuccess) onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert(t('partialError'));
        } finally {
            setLoading(false);
            setOverlayMessage("");
            setProgress(0);
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

                // Force Choice if Zero Sum
                if (leagueMode === "ZERO_SUM" && idea.type !== "CHOICE") {
                    setType("CHOICE");
                    // Maybe try to adapt valid options?
                    setOptions(["Yes", "No"]);
                } else {
                    setType(idea.type as BetType);
                }

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
                alert(tAi('noBets'));
            }
        } catch (e) {
            console.error(e);
            alert(tAi('error'));
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
            const clDate = new Date(evDate.getTime() - (lockBufferMinutes * 60000));
            const evEndDate = eventEndDateStr ? new Date(eventEndDateStr) : undefined;

            if (betToEdit) {
                await updateBet(leagueId, betToEdit.id, {
                    question,
                    type,
                    closesAt: clDate,
                    eventDate: evDate,
                    ...(evEndDate ? { eventEndDate: evEndDate } : {}),
                    ...(type === "CHOICE" ? { options: options.filter(o => o.trim() !== "").map((t, i) => ({ id: String(i), text: t, totalWagered: 0, odds: 1 })) } : {}),
                    ...(type === "RANGE" ? { rangeMin: Number(rangeMin), rangeMax: Number(rangeMax), rangeUnit } : {}),
                    ...(type === "MATCH" ? { matchDetails: { homeTeam: matchHome, awayTeam: matchAway, date: evDate.toISOString() } } : {}),
                    autoConfirm: aiAutoConfirmEnabled !== false, // Default true if undefined
                    autoConfirmDelay: 120
                });
                alert("Draft Updated!");
            } else {
                await createBet(
                    leagueId,
                    user,
                    question,
                    type,
                    clDate,
                    evDate,
                    type === "CHOICE" ? options.filter(o => o.trim() !== "") : undefined,
                    type === "RANGE" ? { min: Number(rangeMin), max: Number(rangeMax), unit: rangeUnit } : undefined,
                    type === "MATCH" ? { home: matchHome, away: matchAway } : undefined,
                    aiAutoConfirmEnabled !== false, // Default true
                    120, // Fixed delay
                    type === "CHOICE" ? choiceStyle : undefined, // Pass choiceStyle for CHOICE bets
                    evEndDate // Pass optional event end date
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
                    {(isAiLoading || (loading && mode === "BULK")) && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <AIProgressOverlay
                                isVisible={true}
                                progress={progress}
                                message={loadingMessage || overlayMessage || tAi('processing')}
                            />
                        </div>
                    )}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg rounded-xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto"
                        >
                            {/* ... Header ... */}

                            {/* Mode Switcher - Hide BULK if Zero Sum maybe? Or restrict Bulk options too. */}
                            {/* Lets keep Bulk but restrict types inside it */}
                            <div className="flex p-1 bg-gray-100 border-2 border-black rounded-xl mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {/* ... buttons ... */}
                                <button
                                    onClick={() => setMode("SINGLE")}
                                    className={`flex-1 py-2 text-sm font-black rounded-lg transition-all uppercase ${mode === "SINGLE" ? "bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                                >
                                    {t('singleBet')}
                                </button>
                                <button
                                    onClick={() => setMode("BULK")}
                                    className={`flex-1 py-2 text-sm font-black rounded-lg transition-all uppercase ${mode === "BULK" ? "bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                                >
                                    {t('bulkWizard')}
                                </button>
                            </div>

                            {mode === "SINGLE" ? (
                                <>
                                    {/* ... AI Button ... */}
                                    {/* ... Form ... */}
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Question Input */}
                                        <div>
                                            <LabelWithHelp
                                                label={t('question')}
                                                helpText={tHelp('question')}
                                                required
                                            />
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
                                                <LabelWithHelp
                                                    label={t('type')}
                                                    helpText={tHelp('type')}
                                                />
                                                {leagueMode === "ZERO_SUM" ? (
                                                    <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-900 text-xs font-bold leading-tight">
                                                        {t('onlyZeroSumChoice')}
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <select
                                                            value={type}
                                                            onChange={(e) => setType(e.target.value as BetType)}
                                                            className="flex h-12 w-full appearance-none rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pr-8"
                                                        >
                                                            <option value="CHOICE">{t('typeChoice')}</option>
                                                            <option value="RANGE">{t('typeRange')}</option>
                                                            <option value="MATCH">{t('typeMatch')}</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                            <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <LabelWithHelp
                                                    label={t('startTime')}
                                                    helpText={tHelp('startTime')}
                                                    required
                                                />
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    value={eventDateStr}
                                                    onChange={(e) => setEventDateStr(e.target.value)}
                                                    className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                                />
                                            </div>
                                        </div>

                                        {/* Event End Time - Optional for long-running bets */}
                                        <div>
                                            <LabelWithHelp
                                                label={t('eventEndTime')}
                                                helpText={tHelp('eventEndTime')}
                                                optional
                                            />
                                            <input
                                                type="datetime-local"
                                                value={eventEndDateStr}
                                                onChange={(e) => setEventEndDateStr(e.target.value)}
                                                className="flex h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                                                min={eventDateStr}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                                {tHelp('eventEndTime')}
                                            </p>
                                        </div>

                                        {/* ... Lock Buffer ... */}
                                        <div>
                                            <LabelWithHelp
                                                label={t('lockBetting')}
                                                helpText={tHelp('lockBetting')}
                                            />
                                            <div className="relative">
                                                <select
                                                    value={lockBufferMinutes}
                                                    onChange={(e) => setLockBufferMinutes(Number(e.target.value))}
                                                    className="flex h-12 w-full appearance-none rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pr-8"
                                                >
                                                    <option value={0}>{t('lockAtStart')}</option>
                                                    <option value={15}>{t('lock15Min')}</option>
                                                    <option value={60}>{t('lock1Hour')}</option>
                                                    <option value={1440}>{t('lock24Hours')}</option>
                                                </select>
                                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                    <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Auto-Confirm Settings Removed (Now League Level) */}
                                        {type === "CHOICE" && (
                                            // ... Choice options UI ...
                                            <div className="space-y-3">
                                                <label className="text-sm font-black text-black uppercase block">{t('options')}</label>

                                                {/* Warning when editing bet with wagers */}
                                                {hasWagers && (
                                                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 text-sm">
                                                        <p className="font-bold text-yellow-800">⚠️ Options Locked</p>
                                                        <p className="text-yellow-700 text-xs">This bet has {betToEdit.wagerCount} wager(s). Options cannot be changed, but you can edit the question text and event date.</p>
                                                    </div>
                                                )}

                                                {options.map((opt, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            required
                                                            value={opt}
                                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                            placeholder={`Option ${idx + 1}`}
                                                            disabled={hasWagers}
                                                            className={`flex h-10 w-full rounded-lg border-2 border-black px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${hasWagers ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}`}
                                                        />
                                                        {options.length > 2 && !hasWagers && (
                                                            <button type="button" onClick={() => handleRemoveOption(idx)} className="p-2 text-red-500 hover:text-red-700 transition-colors border-2 border-red-500 rounded-lg shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] active:translate-y-[1px] active:shadow-none hover:bg-red-50">
                                                                <Trash className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* Only show add/prefill buttons when no wagers exist */}
                                                {!hasWagers && (
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={handleAddOption} className="text-sm text-primary font-bold flex items-center hover:text-primary/80 transition-colors uppercase tracking-wide">
                                                            <Plus className="h-4 w-4 mr-1 border-2 border-primary rounded-full p-0.5" /> {t('addOption')}
                                                        </button>

                                                        {/* Pre-fill Helpers - Also set choiceStyle */}
                                                        <button
                                                            type="button"
                                                            onClick={() => { setOptions(["Yes", "No"]); setChoiceStyle("VARIOUS"); }}
                                                            className={`text-xs font-bold border rounded px-2 py-0.5 transition-all ${choiceStyle === "VARIOUS" ? "text-primary border-primary bg-primary/10" : "text-gray-400 hover:text-black border-gray-300"}`}
                                                        >
                                                            {t('optYesNo')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setOptions(["Home Team", "Away Team"]); setChoiceStyle("MATCH_WINNER"); }}
                                                            className={`text-xs font-bold border rounded px-2 py-0.5 transition-all ${choiceStyle === "MATCH_WINNER" ? "text-primary border-primary bg-primary/10" : "text-gray-400 hover:text-black border-gray-300"}`}
                                                        >
                                                            {t('optWinnerDesc')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setOptions(["Home Team", "Draw", "Away Team"]); setChoiceStyle("MATCH_1X2"); }}
                                                            className={`text-xs font-bold border rounded px-2 py-0.5 transition-all ${choiceStyle === "MATCH_1X2" ? "text-primary border-primary bg-primary/10" : "text-gray-400 hover:text-black border-gray-300"}`}
                                                        >
                                                            {t('opt1x2Desc')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {type === "MATCH" && (
                                            <div className="space-y-4 rounded-xl border-2 border-black bg-blue-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                {/* Match inputs */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">{t('homeTeam')}</label>
                                                        <input type="text" required value={matchHome} onChange={(e) => setMatchHome(e.target.value)} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">{t('awayTeam')}</label>
                                                        <input type="text" required value={matchAway} onChange={(e) => setMatchAway(e.target.value)} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {type === "RANGE" && (
                                            <div className="space-y-4 rounded-xl border-2 border-black bg-blue-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                {/* Range inputs */}
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">{t('min')}</label>
                                                        <input type="number" value={rangeMin} onChange={(e) => setRangeMin(Number(e.target.value))} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">{t('max')}</label>
                                                        <input type="number" value={rangeMax} onChange={(e) => setRangeMax(Number(e.target.value))} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">{t('unit')}</label>
                                                    <input type="text" value={rangeUnit} onChange={(e) => setRangeUnit(e.target.value)} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
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
                                                {betToEdit ? t('btnSave') : t('btnCreate')}
                                            </Button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                // BULK MODE
                                <div className="space-y-6">
                                    {/* ... Bulk Inputs ... */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-black text-black">{t('projectLeague')}</label>
                                            <input value={bulkTopic} onChange={(e) => setBulkTopic(e.target.value)} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-black text-black">{t('timeframe')}</label>
                                            <input value={bulkTimeframe} onChange={(e) => setBulkTimeframe(e.target.value)} className="flex h-10 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-black text-black">{t('type')}</label>
                                            {leagueMode === "ZERO_SUM" ? (
                                                <div className="space-y-2">
                                                    <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-900 text-xs font-bold">
                                                        {t('bulkZeroSumNote')}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setBulkOutcomeType("WINNER_DRAW")}
                                                            className={`flex-1 py-1 text-xs font-bold rounded-lg border-2 transition-all ${bulkOutcomeType === "WINNER_DRAW" ? "bg-purple-600 text-white border-purple-600" : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"}`}
                                                        >
                                                            {t('opt1x2Desc')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setBulkOutcomeType("WINNER")}
                                                            className={`flex-1 py-1 text-xs font-bold rounded-lg border-2 transition-all ${bulkOutcomeType === "WINNER" ? "bg-purple-600 text-white border-purple-600" : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"}`}
                                                        >
                                                            {t('optWinnerDesc')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <select
                                                            value={bulkType}
                                                            onChange={(e) => setBulkType(e.target.value as any)}
                                                            className="flex h-10 w-full appearance-none rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                        >
                                                            <option value="MATCH">{t('typeMatchExact')}</option>
                                                            <option value="CHOICE">{t('typeWinnerChoice')}</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                            <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                        </div>
                                                    </div>

                                                    {/* Outcome Options for Standard Mode (if Choice selected) */}
                                                    {bulkType === "CHOICE" && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-500 uppercase">{t('outcomeOptions')}</label>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBulkOutcomeType("WINNER_DRAW")}
                                                                    className={`flex-1 py-1 text-xs font-bold rounded-lg border-2 transition-all ${bulkOutcomeType === "WINNER_DRAW" ? "bg-purple-600 text-white border-purple-600" : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"}`}
                                                                >
                                                                    {t('opt1x2Desc')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBulkOutcomeType("WINNER")}
                                                                    className={`flex-1 py-1 text-xs font-bold rounded-lg border-2 transition-all ${bulkOutcomeType === "WINNER" ? "bg-purple-600 text-white border-purple-600" : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"}`}
                                                                >
                                                                    {t('optWinnerDesc')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            onClick={handleBulkGenerate}
                                            disabled={isAiLoading}
                                            className="w-full h-12 bg-purple-600 text-white hover:bg-purple-700 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        >
                                            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('generateSchedule')}
                                        </Button>
                                    </div>

                                    {/* No Results State */}
                                    {bulkNoResults && bulkBets.length === 0 && (
                                        <div className="p-6 text-center border-2 border-dashed border-orange-300 rounded-xl bg-orange-50">
                                            <div className="text-4xl mb-3">🔍</div>
                                            <h3 className="text-lg font-black text-orange-800 uppercase mb-2">{tAi('noBets')}</h3>
                                            <p className="text-sm text-orange-600 font-medium">
                                                {tAi('noMatchesHint')}
                                            </p>
                                        </div>
                                    )}

                                    {/* ... Results ... */}
                                    {bulkBets.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                                {bulkBets.map((bet, i) => (
                                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedBulkIndices.includes(i) ? "bg-purple-100 border-purple-500 shadow-[2px_2px_0px_0px_rgba(147,51,234,1)]" : "bg-white border-gray-200 hover:bg-gray-50"}`} onClick={() => {
                                                        if (selectedBulkIndices.includes(i)) {
                                                            setSelectedBulkIndices(selectedBulkIndices.filter(idx => idx !== i));
                                                        } else {
                                                            setSelectedBulkIndices([...selectedBulkIndices, i]);
                                                        }
                                                    }}>
                                                        {/* ... Checkbox ... */}
                                                        <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${selectedBulkIndices.includes(i) ? "bg-purple-600 border-purple-600" : "border-gray-300 bg-white"}`}>
                                                            {selectedBulkIndices.includes(i) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-bold text-sm text-black truncate">{bet.question}</p>
                                                                {bet.verified && (
                                                                    <span className="px-2 py-0.5 bg-green-100 border border-green-300 rounded text-[10px] font-black text-green-700 uppercase shrink-0">
                                                                        ✓ Verified
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 font-bold">
                                                                📅 {new Date(bet.date).toLocaleString()} • {bet.matchHome} vs {bet.matchAway}
                                                            </p>
                                                            {bet.source && (
                                                                <p className="text-[10px] text-gray-400 font-bold mt-1">
                                                                    📰 Source: {bet.source}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* ... Submit Button ... */}
                                            <div className="pt-4 border-t-2 border-dashed border-gray-200">
                                                <Button
                                                    onClick={handleBulkCreate}
                                                    disabled={loading || selectedBulkIndices.length === 0}
                                                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                                >
                                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                    {t('btnCreateSelected', { count: selectedBulkIndices.length })}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
