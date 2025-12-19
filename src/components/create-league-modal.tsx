import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Coins, Calendar, Loader2, Gavel } from "lucide-react";
import { createLeague, LeagueMode, BuyInType, LEAGUE_COLOR_SCHEMES, LeagueColorScheme, LEAGUE_ICONS } from "@/lib/services/league-service";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBet } from "@/lib/services/bet-service";
import { generateBulkBets } from "@/app/actions/ai-bet-actions";
import { useTranslations } from 'next-intl';
import { AIProgressOverlay } from "@/components/ai-progress-overlay";

interface CreateLeagueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
    const t = useTranslations('League');
    const tBets = useTranslations('Bets');
    const tAi = useTranslations('AI');
    const [name, setName] = useState("");
    const [startCapital, setStartCapital] = useState(1000);
    const [mode, setMode] = useState<LeagueMode>("ZERO_SUM");
    const [buyInType, setBuyInType] = useState<BuyInType>("FIXED");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [disputeWindow, setDisputeWindow] = useState(12);

    // Arcade Settings
    const [exactMult, setExactMult] = useState(3);
    const [winnerMult, setWinnerMult] = useState(2);
    const [diffMult, setDiffMult] = useState(1);
    const [choicePoints, setChoicePoints] = useState(1);
    const [rangePoints, setRangePoints] = useState(1);

    // Power-Up Starter Pack (Standard Mode)
    const [x2Start, setX2Start] = useState(3);
    const [x3Start, setX3Start] = useState(1);
    const [x4Start, setX4Start] = useState(0);

    // AI Auto-Fill
    const [useAi, setUseAi] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiTimeframe, setAiTimeframe] = useState("Upcoming"); // Default
    const [aiTargetType, setAiTargetType] = useState<"CHOICE" | "MATCH">("MATCH");
    const [aiOutcomeType, setAiOutcomeType] = useState<"WINNER" | "WINNER_DRAW">("WINNER_DRAW");

    // Customization
    const [selectedIcon, setSelectedIcon] = useState("🏆");
    const [selectedColorScheme, setSelectedColorScheme] = useState<LeagueColorScheme>("purple");

    // Review Step state
    const [step, setStep] = useState<"FORM" | "REVIEW">("FORM");
    const [generatedBets, setGeneratedBets] = useState<any[]>([]);
    const [selectedBetIndices, setSelectedBetIndices] = useState<number[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [progress, setProgress] = useState(0);
    const { user } = useAuth();
    const router = useRouter();

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (useAi && aiTopic.trim()) {
            // Step 1: Generate Bets first
            setLoading(true);
            setLoadingMessage(tAi('analyzing'));
            setProgress(10);

            try {
                // Determine Bet Type based on Mode
                const targetType = mode === "ZERO_SUM" ? "CHOICE" : aiTargetType;

                // Simulate progress
                const interval = setInterval(() => setProgress(p => p < 80 ? p + 5 : p), 200);

                const bets = await generateBulkBets(aiTopic, aiTimeframe || "Upcoming", targetType, aiOutcomeType);

                clearInterval(interval);
                setProgress(100);

                if (Array.isArray(bets) && bets.length > 0) {
                    setGeneratedBets(bets);
                    setSelectedBetIndices(bets.map((_, i) => i)); // Select all by default
                    setStep("REVIEW");
                } else {
                    // Show empty state in review step
                    setGeneratedBets([]);
                    setSelectedBetIndices([]);
                    setStep("REVIEW");
                }
            } catch (err) {
                console.error(err);
                alert(tAi('error'));
            } finally {
                setLoading(false);
                setProgress(0);
            }
        } else {
            // No AI -> Create directly
            await finalizeLeagueCreation([]);
        }
    };

    const finalizeLeagueCreation = async (betsToCreate: any[]) => {
        if (!user) return;
        setLoading(true);
        setLoadingMessage(t('btnCreating'));
        setProgress(10);

        try {
            // 1. Create League
            const leagueId = await createLeague(
                user,
                name,
                mode,
                startCapital,
                buyInType,
                startDate ? new Date(startDate) : undefined,
                endDate ? new Date(endDate) : undefined,
                mode === "STANDARD" ? { exact: exactMult, winner: winnerMult, diff: diffMult, choice: choicePoints, range: rangePoints } : undefined,
                selectedIcon,
                selectedColorScheme,
                mode === "STANDARD" ? { x2: x2Start, x3: x3Start, x4: x4Start } : undefined,
                disputeWindow
            );

            setProgress(40);

            // 2. Create Selected Bets
            if (betsToCreate.length > 0) {
                setLoadingMessage(`Creating ${betsToCreate.length} bets...`);
                for (let i = 0; i < betsToCreate.length; i++) {
                    const bet = betsToCreate[i];
                    const date = bet.date ? new Date(bet.date) : new Date(Date.now() + 86400000);
                    const finalType = mode === "ZERO_SUM" ? "CHOICE" : bet.type;

                    await createBet(
                        leagueId,
                        user,
                        bet.question,
                        finalType,
                        date,
                        date,
                        finalType === "CHOICE" ? bet.options : undefined,
                        undefined,
                        finalType === "MATCH" ? { home: bet.matchHome, away: bet.matchAway } : undefined,
                        true, // autoConfirm
                        120   // autoConfirmDelay
                    );
                    setProgress(40 + Math.round(((i + 1) / betsToCreate.length) * 50));
                }
            }

            setProgress(100);
            await new Promise(r => setTimeout(r, 500));

            onClose();
            router.push(`/leagues/${leagueId}?new=true`);

        } catch (error) {
            console.error(error);
            alert(t('errorCreate'));
        } finally {
            setLoading(false);
            setLoadingMessage("");
            setProgress(0);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <AIProgressOverlay
                        isVisible={loading}
                        message={loadingMessage}
                        progress={progress}
                        subMessage={step === "FORM" ? tAi('analyzing') : t('btnCreating')}
                    />
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
                            <h2 className="text-2xl font-black tracking-tight font-comic uppercase">
                                {step === "REVIEW" ? t('reviewStep') : t('createTitle')}
                            </h2>
                            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {step === "FORM" ? (
                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                {/* ... Standard Form Fields ... */}
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase">{t('nameLabel')}</label>
                                    <div className="relative">
                                        <Trophy className="absolute left-3 top-3.5 h-5 w-5 text-black" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('namePlaceholder')}
                                            className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 pl-10 text-lg font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Icon & Color Scheme Selection */}
                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                    <label className="text-sm font-black uppercase flex items-center gap-2">
                                        🎨 {t('customizeAppearance')}
                                    </label>

                                    {/* Preview Card */}
                                    <div className={`bg-gradient-to-r ${LEAGUE_COLOR_SCHEMES[selectedColorScheme].from} ${LEAGUE_COLOR_SCHEMES[selectedColorScheme].to} rounded-xl px-4 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl drop-shadow-md">{selectedIcon}</span>
                                            <span className={`font-black text-lg uppercase ${LEAGUE_COLOR_SCHEMES[selectedColorScheme].text} drop-shadow-sm`}>
                                                {name || t('yourLeague')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Icon Selection */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">{t('selectIcon')}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {LEAGUE_ICONS.map((icon) => (
                                                <button
                                                    key={icon}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(icon)}
                                                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-all flex items-center justify-center ${selectedIcon === icon
                                                        ? "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[1px]"
                                                        : "border-gray-200 bg-white hover:border-gray-400"
                                                        }`}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Color Scheme Selection */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">{t('selectColorTheme')}</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(Object.entries(LEAGUE_COLOR_SCHEMES) as [LeagueColorScheme, typeof LEAGUE_COLOR_SCHEMES[LeagueColorScheme]][]).map(([key, scheme]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setSelectedColorScheme(key)}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${selectedColorScheme === key
                                                        ? "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[1px]"
                                                        : "border-gray-200 hover:border-gray-400"
                                                        }`}
                                                >
                                                    <div className={`w-full h-6 rounded bg-gradient-to-r ${scheme.from} ${scheme.to}`} />
                                                    <span className="text-[10px] font-bold text-gray-600">{scheme.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-black uppercase">{t('modeLabel')}</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setMode("ZERO_SUM")}
                                            className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${mode === "ZERO_SUM"
                                                ? "border-black bg-blue-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-400"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Coins className={`h-5 w-5 ${mode === "ZERO_SUM" ? "text-blue-600" : "text-gray-400"}`} />
                                                <span className={`font-black ${mode === "ZERO_SUM" ? "text-blue-900" : "text-gray-500"}`}>{t('zeroSum')}</span>
                                            </div>
                                            <p className="text-xs font-bold leading-tight">{t('zeroSumDesc')}</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setMode("STANDARD")}
                                            className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${mode === "STANDARD"
                                                ? "border-black bg-purple-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-400"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Trophy className={`h-5 w-5 ${mode === "STANDARD" ? "text-purple-600" : "text-gray-400"}`} />
                                                <span className={`font-black ${mode === "STANDARD" ? "text-purple-900" : "text-gray-500"}`}>{t('arcade')}</span>
                                            </div>
                                            <p className="text-xs font-bold leading-tight">{t('arcadeDesc')}</p>
                                        </button>
                                    </div>
                                </div>

                                {mode === "ZERO_SUM" && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-sm font-black uppercase">{t('buyInType')}</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setBuyInType("FIXED")}
                                                    className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${buyInType === "FIXED"
                                                        ? "border-black bg-green-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <span className={`font-black text-sm ${buyInType === "FIXED" ? "text-green-900" : "text-gray-500"}`}>
                                                        💰 {t('fixed')}
                                                    </span>
                                                    <p className="text-[10px] font-bold leading-tight text-gray-600">
                                                        {t('fixedDesc')}
                                                    </p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBuyInType("FLEXIBLE")}
                                                    className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${buyInType === "FLEXIBLE"
                                                        ? "border-black bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-[2px]"
                                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <span className={`font-black text-sm ${buyInType === "FLEXIBLE" ? "text-yellow-900" : "text-gray-500"}`}>
                                                        🔓 {t('flexible')}
                                                    </span>
                                                    <p className="text-[10px] font-bold leading-tight text-gray-600">
                                                        {t('flexibleDesc')}
                                                    </p>
                                                </button>
                                            </div>
                                        </div>

                                        <label className="text-sm font-black uppercase">{buyInType === "FIXED" ? t('startCapital') : t('rebuyUnit')}</label>
                                        <div className="relative">
                                            <Coins className="absolute left-3 top-3.5 h-5 w-5 text-black" />
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                max={100000}
                                                value={startCapital}
                                                onChange={(e) => setStartCapital(parseInt(e.target.value))}
                                                className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 pl-10 text-lg font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <p className="text-xs font-bold text-gray-500 ml-1">
                                            {t('chipsDesc')}
                                        </p>
                                    </motion.div>
                                )}

                                {mode === "STANDARD" && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="space-y-4 overflow-hidden p-4 bg-purple-50 rounded-xl border-2 border-dashed border-purple-200"
                                    >
                                        <h3 className="font-black text-purple-900 uppercase text-sm">{t('arcadeSettings')}</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">{t('exactX')}</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={exactMult}
                                                    onChange={(e) => setExactMult(Number(e.target.value))}
                                                    className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">{t('winnerX')}</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={winnerMult}
                                                    onChange={(e) => setWinnerMult(Number(e.target.value))}
                                                    className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">{t('diffX')}</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={diffMult}
                                                    onChange={(e) => setDiffMult(Number(e.target.value))}
                                                    className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200 mt-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">{t('choiceX')}</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={choicePoints}
                                                    onChange={(e) => setChoicePoints(Number(e.target.value))}
                                                    className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">{t('rangeX')}</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={rangePoints}
                                                    onChange={(e) => setRangePoints(Number(e.target.value))}
                                                    className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t-2 border-dashed border-purple-200">
                                            <h3 className="font-black text-purple-900 uppercase text-sm mb-3">⚡ Power-Up Starter Pack</h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-indigo-500 uppercase">x2 Boosts</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={50}
                                                        value={x2Start}
                                                        onChange={(e) => setX2Start(Number(e.target.value))}
                                                        className="w-full h-10 px-2 rounded-lg border-2 border-indigo-200 focus:border-indigo-500 font-bold text-center text-indigo-700 bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-pink-500 uppercase">x3 Boosts</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={50}
                                                        value={x3Start}
                                                        onChange={(e) => setX3Start(Number(e.target.value))}
                                                        className="w-full h-10 px-2 rounded-lg border-2 border-pink-200 focus:border-pink-500 font-bold text-center text-pink-700 bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-amber-500 uppercase">x4 Boosts</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={50}
                                                        value={x4Start}
                                                        onChange={(e) => setX4Start(Number(e.target.value))}
                                                        className="w-full h-10 px-2 rounded-lg border-2 border-amber-200 focus:border-amber-500 font-bold text-center text-amber-700 bg-white"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 mt-2">
                                                Every player starts with these power-ups.
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-bold text-purple-600 space-y-1 mt-2">
                                            <p>{t('multipliersDesc')}</p>
                                            <p className="opacity-75 italic border-t border-purple-200 pt-1">
                                                {t('zeroSumNoPoints')}
                                            </p>
                                        </div>

                                        {/* Dispute Window Settings */}
                                        <div className="space-y-2 mt-4 pt-4 border-t-2 border-gray-200">
                                            <label className="text-sm font-black uppercase flex items-center gap-2">
                                                <Gavel className="w-4 h-4" /> Dispute Window
                                            </label>
                                            <p className="text-xs text-gray-500 font-bold -mt-1 mb-2">
                                                Hours allowed to dispute a result.
                                            </p>
                                            <div className="flex gap-2">
                                                {[12, 24, 48].map(h => (
                                                    <button
                                                        key={h}
                                                        type="button"
                                                        onClick={() => setDisputeWindow(h)}
                                                        className={`flex-1 py-2 rounded-lg font-black border-2 transition-all ${disputeWindow === h
                                                            ? "bg-black text-white border-black"
                                                            : "bg-white text-gray-500 border-gray-200 hover:border-black"
                                                            }`}
                                                    >
                                                        {h}h
                                                    </button>
                                                ))}
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={disputeWindow}
                                                        onChange={e => setDisputeWindow(Math.max(1, Number(e.target.value)))}
                                                        className={`w-full h-full px-2 rounded-lg font-bold border-2 text-center focus:outline-none ${![12, 24, 48].includes(disputeWindow) ? "border-black bg-gray-50" : "border-gray-200"
                                                            }`}
                                                        placeholder="Custom"
                                                    />
                                                    <span className="absolute right-2 top-2.5 text-xs font-bold text-gray-400">h</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black uppercase">{t('startDate')}</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black uppercase">{t('endDate')}</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                    </div>
                                </div>

                                {/* AI Auto-Fill Section */}
                                <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
                                    <button
                                        type="button"
                                        onClick={() => setUseAi(!useAi)}
                                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${useAi ? "bg-purple-100 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]" : "bg-gray-50 border-gray-200 hover:border-black"}`}
                                    >
                                        <div className="text-left">
                                            <p className={`font-black uppercase ${useAi ? "text-purple-700" : "text-gray-500"}`}>{t('aiAutoPopulate')}</p>
                                            <p className="text-xs font-bold text-gray-400">{t('aiDesc')}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${useAi ? "bg-purple-600 border-purple-600" : "border-gray-300 bg-white"}`}>
                                            {useAi && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {useAi && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-2 p-1">
                                                    <label className="text-sm font-black uppercase text-purple-800">{t('aiTopic')}</label>
                                                    <input
                                                        type="text"
                                                        value={aiTopic}
                                                        onChange={(e) => setAiTopic(e.target.value)}
                                                        placeholder={t('aiTopicPlaceholder')}
                                                        className="flex h-12 w-full rounded-xl border-2 border-purple-200 bg-white px-3 py-2 text-black font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2 p-1">
                                                    <label className="text-sm font-black uppercase text-purple-800">{t('aiTimeframe')}</label>
                                                    <input
                                                        type="text"
                                                        value={aiTimeframe}
                                                        onChange={(e) => setAiTimeframe(e.target.value)}
                                                        placeholder={t('aiTimeframePlaceholder')}
                                                        className="flex h-12 w-full rounded-xl border-2 border-purple-200 bg-white px-3 py-2 text-black font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all"
                                                    />
                                                </div>

                                                {/* Standard Mode: Forecast Style */}
                                                {mode === "STANDARD" && (
                                                    <div className="space-y-2 p-1">
                                                        <label className="text-sm font-black uppercase text-purple-800">{t('forecastStyle')}</label>
                                                        <div className="flex bg-gray-100 rounded-lg p-1 border border-purple-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => setAiTargetType("MATCH")}
                                                                className={`flex-1 py-1 text-xs font-bold rounded uppercase transition-all ${aiTargetType === "MATCH" ? "bg-white text-purple-900 border border-purple-200 shadow-sm" : "text-gray-400 hover:text-purple-700"}`}
                                                            >
                                                                {tBets('forecastExact')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAiTargetType("CHOICE")}
                                                                className={`flex-1 py-1 text-xs font-bold rounded uppercase transition-all ${aiTargetType === "CHOICE" ? "bg-white text-purple-900 border border-purple-200 shadow-sm" : "text-gray-400 hover:text-purple-700"}`}
                                                            >
                                                                {tBets('forecastWinner')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Outcome Options */}
                                                {(mode === "ZERO_SUM" || (mode === "STANDARD" && aiTargetType === "CHOICE")) && (
                                                    <div className="space-y-2 p-1">
                                                        <label className="text-sm font-black uppercase text-purple-800">{t('outcomeOptions')}</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setAiOutcomeType("WINNER_DRAW")}
                                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all ${aiOutcomeType === "WINNER_DRAW" ? "bg-purple-600 text-white border-purple-600" : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"}`}
                                                            >
                                                                {tBets('opt1x2Desc')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAiOutcomeType("WINNER")}
                                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all ${aiOutcomeType === "WINNER" ? "bg-purple-600 text-white border-purple-600" : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"}`}
                                                            >
                                                                {tBets('optWinnerDesc')}
                                                            </button>
                                                        </div>
                                                        {mode === "ZERO_SUM" && (
                                                            <p className="text-[10px] text-purple-600 font-bold">
                                                                {t('zeroSumRequirement')}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onClose}
                                        className="text-gray-500 hover:text-black font-bold"
                                    >
                                        {t('btnCancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 h-12 bg-gradient-to-r from-primary to-green-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg uppercase font-black tracking-widest hover:translate-y-[-2px] transition-all"
                                    >
                                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (useAi ? t('generateBets') : t('btnCreate'))}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-900 text-sm font-bold">
                                    {t('almostThere')}
                                </div>

                                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                                    {generatedBets.length === 0 ? (
                                        <div className="p-6 text-center border-2 border-dashed border-orange-300 rounded-xl bg-orange-50">
                                            <div className="text-4xl mb-3">🔍</div>
                                            <h3 className="text-lg font-black text-orange-800 uppercase mb-2">{tAi('noBets')}</h3>
                                            <p className="text-sm text-orange-600 font-medium">
                                                {tAi('noMatchesHint')}
                                            </p>
                                        </div>
                                    ) : (
                                        generatedBets.map((bet, i) => (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    if (selectedBetIndices.includes(i)) {
                                                        setSelectedBetIndices(selectedBetIndices.filter(idx => idx !== i));
                                                    } else {
                                                        setSelectedBetIndices([...selectedBetIndices, i]);
                                                    }
                                                }}
                                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedBetIndices.includes(i) ? "bg-purple-100 border-purple-500 shadow-[2px_2px_0px_0px_rgba(147,51,234,1)]" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                            >
                                                <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selectedBetIndices.includes(i) ? "bg-purple-600 border-purple-600" : "border-gray-300 bg-white"}`}>
                                                    {selectedBetIndices.includes(i) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
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
                                        ))
                                    )}
                                </div>

                                <div className="flex justify-between pt-4 border-t-2 border-dashed border-gray-300">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep("FORM")}
                                        className="text-gray-500 hover:text-black font-bold"
                                    >
                                        {t('backToSettings')}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const selectedBets = generatedBets.filter((_, i) => selectedBetIndices.includes(i));
                                            finalizeLeagueCreation(selectedBets);
                                        }}
                                        disabled={loading || selectedBetIndices.length === 0}
                                        className="px-6 h-12 bg-green-500 hover:bg-green-600 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg uppercase font-black tracking-widest hover:translate-y-[-2px] transition-all"
                                    >
                                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : t('createWithBets', { count: selectedBetIndices.length })}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
