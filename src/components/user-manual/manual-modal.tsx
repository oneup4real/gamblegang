"use client";

/**
 * MANUAL MODAL - REDESIGNED
 * 
 * A comprehensive, modern "How to Play" guide with:
 * - Table of contents navigation
 * - More slides covering all features
 * - Better visual animations
 * - Separate sections for Players and Creators
 * - Full i18n support
 */

import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronRight, ChevronLeft, Crown, User, BookOpen,
    Zap, Trophy, Target, Clock, Shield, Sparkles, Users,
    TrendingUp, Settings, Activity, Award, Play, CheckCircle2,
    ArrowRight, Home, Coins, RefreshCw, Skull, Infinity as InfinityIcon,
    Gamepad2, Scale
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AiBetStatsAnimation } from "./animations/ai-bet-flow";
import { BetLifecycleAnimation } from "./animations/bet-lifecycle-animation";
import { ZeroSumVsArcadeAnimation } from "./animations/zero-sum-vs-arcade";
import { PowerUpsAnimation } from "./animations/power-ups-animation";
import { LiveScoreAnimation } from "./animations/live-score-animation";
import { PointTiersAnimation } from "./animations/point-tiers-animation";
import { LeagueSettingsAnimation } from "./animations/league-settings-animation";

interface ManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Section = "HOME" | "PLAYER" | "CREATOR";

interface Slide {
    id: string;
    title: string;
    subtitle?: string;
    content: React.ReactNode;
    animation: React.ReactNode;
}

// ============================================
// TABLE OF CONTENTS COMPONENT
// ============================================
function TableOfContents({
    slides,
    currentIndex,
    onSelect
}: {
    slides: Slide[];
    currentIndex: number;
    onSelect: (idx: number) => void;
}) {
    return (
        <div className="flex gap-1 flex-wrap justify-center">
            {slides.map((slide, idx) => (
                <button
                    key={slide.id}
                    onClick={() => onSelect(idx)}
                    className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${idx === currentIndex
                        ? "bg-black text-white scale-110"
                        : idx < currentIndex
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                >
                    {idx < currentIndex ? "✓" : idx + 1}
                </button>
            ))}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function ManualModal({ isOpen, onClose }: ManualModalProps) {
    const t = useTranslations('Manual');
    const [section, setSection] = useState<Section>("HOME");
    const [slideIndex, setSlideIndex] = useState(0);

    // ============================================
    // PLAYER SLIDES
    // ============================================
    const playerSlides: Slide[] = [
        {
            id: "p1",
            title: t('player.p1.title'),
            subtitle: t('player.p1.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p1.text')}
                    </p>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                        <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            {t('player.p1.note')}
                        </p>
                    </div>
                </div>
            ),
            animation: (
                <div className="flex flex-col items-center gap-3 p-4">
                    <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center"
                    >
                        <Trophy className="w-10 h-10 text-white" />
                    </motion.div>
                    <div className="flex -space-x-2">
                        {["bg-blue-400", "bg-green-400", "bg-orange-400", "bg-red-400"].map((c, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1 * i }}
                                className={`w-8 h-8 ${c} rounded-full border-2 border-white`}
                            />
                        ))}
                    </div>
                </div>
            ),
        },
        {
            id: "p2",
            title: t('player.p2.title'),
            subtitle: t('player.p2.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p2.text')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-purple-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-colors">
                            <Gamepad2 className="w-6 h-6 text-purple-600 mb-2" />
                            <p className="font-black text-sm text-purple-900">{t('player.p2.arcadeTitle')}</p>
                            <p className="text-[10px] text-purple-700 leading-tight mt-1">
                                {t('player.p2.arcadeText')}
                            </p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-200 hover:border-amber-400 transition-colors">
                            <Coins className="w-6 h-6 text-amber-600 mb-2" />
                            <p className="font-black text-sm text-amber-900">{t('player.p2.zeroSumTitle')}</p>
                            <p className="text-[10px] text-amber-700 leading-tight mt-1">
                                {t('player.p2.zeroSumText')}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-center text-gray-500 italic">
                        {t('player.p2.note')}
                    </p>
                </div>
            ),
            animation: <ZeroSumVsArcadeAnimation />,
        },
        {
            id: "p3",
            title: t('player.p3.title'),
            subtitle: t('player.p3.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p3.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p3.text')}
                    </p>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="flex items-center gap-2"><Target className="w-4 h-4 text-emerald-600" /> {t('player.p3.exact')}</span>
                            <span className="font-black text-emerald-600">+3 pts</span>
                        </li>
                        <li className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="flex items-center gap-2"><Scale className="w-4 h-4 text-blue-600" /> {t('player.p3.diff')}</span>
                            <span className="font-black text-blue-600">+2 pts</span>
                        </li>
                        <li className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                            <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-600" /> {t('player.p3.winner')}</span>
                            <span className="font-black text-yellow-600">+1 pt</span>
                        </li>
                    </ul>
                </div>
            ),
            animation: <PointTiersAnimation />,
        },
        {
            id: "p4",
            title: t('player.p4.title'),
            subtitle: t('player.p4.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p4.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p4.text')}
                    </p>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-lime-50 p-2 rounded-lg border border-lime-200 text-center">
                            <span className="font-black text-lime-600 block text-lg">x2</span>
                            <span className="text-[10px] text-gray-500">{t('player.p4.double')}</span>
                        </div>
                        <div className="flex-1 bg-orange-50 p-2 rounded-lg border border-orange-200 text-center">
                            <span className="font-black text-orange-600 block text-lg">x3</span>
                            <span className="text-[10px] text-gray-500">{t('player.p4.triple')}</span>
                        </div>
                        <div className="flex-1 bg-red-50 p-2 rounded-lg border border-red-200 text-center">
                            <span className="font-black text-red-600 block text-lg">x4</span>
                            <span className="text-[10px] text-gray-500">{t('player.p4.quadruple')}</span>
                        </div>
                    </div>
                    <p className="text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                        {t('player.p4.note')}
                    </p>
                </div>
            ),
            animation: <PowerUpsAnimation />,
        },
        {
            id: "p5",
            title: t('player.p5.title'),
            subtitle: t('player.p5.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p5.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p5.text')}
                    </p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <p className="text-sm font-bold flex items-center gap-2">
                            <Scale className="w-4 h-4" />
                            {t('player.p5.cardTitle')}
                        </p>
                        <p className="text-xs text-gray-600">
                            {t('player.p5.cardText')}
                        </p>
                    </div>
                </div>
            ),
            animation: (
                <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
                    <div className="relative w-32 h-32">
                        <motion.div
                            className="absolute inset-0 border-4 border-amber-200 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <Coins className="w-10 h-10 text-amber-500 mb-1" />
                            <span className="text-xs font-black text-amber-700">THE POT</span>
                        </div>
                        {/* Orbiting coins */}
                        {[0, 120, 240].map((deg, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-sm flex items-center justify-center text-[10px] font-bold text-yellow-900"
                                style={{ top: '50%', left: '50%', marginTop: -12, marginLeft: -12 }}
                                animate={{
                                    x: [40 * Math.cos(deg * Math.PI / 180), 40 * Math.cos((deg + 360) * Math.PI / 180)],
                                    y: [40 * Math.sin(deg * Math.PI / 180), 40 * Math.sin((deg + 360) * Math.PI / 180)]
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
                            >
                                $
                            </motion.div>
                        ))}
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase">System</p>
                        <p className="text-sm font-black text-gray-800">Parimutuel Betting</p>
                    </div>
                </div>
            ),
        },
        {
            id: "p6",
            title: t('player.p6.title'),
            subtitle: t('player.p6.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p6.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                        {t('player.p6.text')}
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                            <div className="bg-white p-2 rounded-full border border-red-100 shadow-sm">
                                <Skull className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-red-900">{t('player.p6.suddenDeathTitle')}</p>
                                <p className="text-xs text-red-700 mt-0.5">
                                    {t('player.p6.suddenDeathText')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="bg-white p-2 rounded-full border border-blue-100 shadow-sm">
                                <InfinityIcon className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-blue-900">{t('player.p6.uncappedTitle')}</p>
                                <p className="text-xs text-blue-700 mt-0.5">
                                    {t('player.p6.uncappedText')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            animation: (
                <div className="flex flex-col items-center justify-center p-4 gap-4 h-full">
                    <div className="relative flex flex-col items-center">
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-6xl mb-2"
                        >
                            ☠️
                        </motion.div>
                        <motion.div
                            className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        >
                            GAME OVER
                        </motion.div>
                    </div>
                    <p className="text-xs text-center text-gray-500 w-3/4">
                        In Sudden Death, once your account hits 0, you can only spectate.
                    </p>
                </div>
            ),
        },
        {
            id: "p7",
            title: t('player.p7.title'),
            subtitle: t('player.p7.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p7.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p7.text')}
                    </p>
                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />

                        <div className="relative z-10 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400">STATUS</span>
                                <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                                </span>
                            </div>

                            <div className="flex justify-between items-center font-mono">
                                <span>Man City</span>
                                <span className="text-xl font-black text-green-400">2 - 1</span>
                                <span>Liverpool</span>
                            </div>

                            <div className="pt-2 border-t border-white/10 flex justify-between items-end">
                                <div className="text-[10px] text-gray-400">
                                    <p>Your Prediction: 2-1</p>
                                    <p className="text-green-400 font-bold mt-1">Current Points: +3 (Exact)</p>
                                </div>
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-center text-gray-500 italic mt-2">
                        {t('player.p7.note')}
                    </p>
                </div>
            ),
            animation: <LiveScoreAnimation />,
        },
        {
            id: "p8",
            title: t('player.p8.title'),
            subtitle: t('player.p8.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p8.badge')}
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                            <span className="text-sm font-bold">{t('player.p8.step1')}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                            <span className="text-sm font-bold">{t('player.p8.step2')}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                            <span className="text-sm font-bold">{t('player.p8.step3')}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-lg">
                            <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                            <span className="text-sm font-bold">{t('player.p8.step4')}</span>
                        </div>
                    </div>
                </div>
            ),
            animation: <BetLifecycleAnimation />,
        },
        {
            id: "p9",
            title: t('player.p9.title'),
            subtitle: t('player.p9.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p9.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p9.text')}
                    </p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                        <p className="text-sm font-bold flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {t('player.p9.cardTitle')}
                        </p>
                        <p className="text-xs text-gray-600">
                            {t('player.p9.cardText')} <span className="font-bold text-red-500">INVALID</span>.
                        </p>
                        <div className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700 font-medium">
                            {t('player.p9.note')}
                        </div>
                    </div>
                </div>
            ),
            animation: (
                <div className="flex flex-col items-center justify-center p-4 gap-4 h-full">
                    <div className="bg-white p-4 rounded-xl border-2 border-black shadow-lg w-full max-w-[200px]">
                        <p className="text-[10px] font-bold text-center mb-3">VOTE: IS RESULT WRONG?</p>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-gray-500">
                                    <span>YES (Invalid)</span>
                                    <span>70%</span>
                                </div>
                                <div className="w-full h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <motion.div
                                        className="absolute left-0 top-0 bottom-0 bg-red-500"
                                        animate={{ width: "70%" }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-gray-500">
                                    <span>NO (Valid)</span>
                                    <span>30%</span>
                                </div>
                                <div className="w-full h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <motion.div
                                        className="absolute left-0 top-0 bottom-0 bg-green-500"
                                        animate={{ width: "30%" }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                    />
                                </div>
                            </div>
                        </div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 2, type: "spring" }}
                            className="mt-4 text-center"
                        >
                            <span className="bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                                🚫 Invalidated
                            </span>
                        </motion.div>
                    </div>
                </div>
            ),
        },
        {
            id: "p10",
            title: t('player.p10.title'),
            subtitle: t('player.p10.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('player.p10.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('player.p10.text')}
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-slate-800">{t('player.p10.item1Title')}</p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    {t('player.p10.item1Text')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="bg-white p-2 rounded-full border border-purple-200 shadow-sm">
                                <Shield className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-purple-900">{t('player.p10.item2Title')}</p>
                                <p className="text-xs text-purple-700 mt-0.5">
                                    {t('player.p10.item2Text')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs font-medium text-center text-gray-500 italic mt-2">
                        {t('player.p10.note')}
                    </p>
                </div>
            ),
            animation: (
                <div className="flex flex-col items-center justify-center p-4 gap-4 h-full">
                    <div className="bg-white w-full max-w-[240px] rounded-xl border-2 border-slate-200 p-3 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-green-100 rounded-bl-xl flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">BET AUDIT #8291</p>

                        <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">Total Pot</span>
                                <span className="font-bold text-amber-600">$500.00</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">Winners</span>
                                <span className="font-bold text-green-600">12 Users</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded p-2 text-[10px] space-y-1">
                            <div className="flex justify-between">
                                <span>User_A</span>
                                <span className="font-bold text-green-600">Winner (+50)</span>
                            </div>
                            <div className="flex justify-between">
                                <span>User_B</span>
                                <span className="font-bold text-red-400">Lost</span>
                            </div>
                            <div className="flex justify-between">
                                <span>User_C</span>
                                <span className="font-bold text-green-600">Winner (+50)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
    ];

    // ============================================
    // CREATOR SLIDES
    // ============================================
    const creatorSlides: Slide[] = [
        {
            id: "c1",
            title: t('creator.c1.title'),
            subtitle: t('creator.c1.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c1.text')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <Crown className="w-4 h-4 text-purple-600 mb-1" />
                            <p className="text-xs font-bold">{t('creator.c1.item1')}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <Users className="w-4 h-4 text-blue-600 mb-1" />
                            <p className="text-xs font-bold">{t('creator.c1.item2')}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                            <Settings className="w-4 h-4 text-green-600 mb-1" />
                            <p className="text-xs font-bold">{t('creator.c1.item3')}</p>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <Trophy className="w-4 h-4 text-orange-600 mb-1" />
                            <p className="text-xs font-bold">{t('creator.c1.item4')}</p>
                        </div>
                    </div>
                </div>
            ),
            animation: (
                <div className="flex flex-col items-center gap-3 p-4">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center"
                    >
                        <Crown className="w-10 h-10 text-white" />
                    </motion.div>
                    <p className="text-xs font-bold text-gray-500">League Commissioner</p>
                </div>
            ),
        },
        {
            id: "c2",
            title: t('creator.c2.title'),
            subtitle: t('creator.c2.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c2.text')}
                    </p>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-200">
                        <p className="text-sm font-bold mb-2">{t('creator.c2.cardTitle')}</p>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-600">{t('creator.c2.item1')}</p>
                            <p className="text-xs text-gray-600">{t('creator.c2.item2')}</p>
                            <p className="text-xs text-gray-600">{t('creator.c2.item3')}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {t('creator.c2.note')}
                    </p>
                </div>
            ),
            animation: <AiBetStatsAnimation />,
        },
        {
            id: "c3",
            title: t('creator.c3.title'),
            subtitle: t('creator.c3.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c3.text')}
                    </p>
                    <div className="space-y-2">
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                            <p className="font-bold text-purple-800 mb-1">{t('creator.c3.arcadeTitle')}</p>
                            <p className="text-xs text-gray-600">{t('creator.c3.arcadeText')}</p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="font-bold text-amber-800 mb-1">{t('creator.c3.zeroSumTitle')}</p>
                            <p className="text-xs text-gray-600">{t('creator.c3.zeroSumText')}</p>
                        </div>
                    </div>
                </div>
            ),
            animation: <ZeroSumVsArcadeAnimation />,
        },
        {
            id: "c4",
            title: t('creator.c4.title'),
            subtitle: t('creator.c4.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('creator.c4.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c4.text')}
                    </p>
                    <div className="bg-gray-50 p-3 rounded-xl border space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">{t('creator.c4.exact')}</span>
                            <span className="font-bold text-emerald-600">1-10 pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">{t('creator.c4.diff')}</span>
                            <span className="font-bold text-blue-600">1-10 pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">{t('creator.c4.winner')}</span>
                            <span className="font-bold text-yellow-600">1-10 pts</span>
                        </div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                        <p className="text-xs text-yellow-800">
                            {t('creator.c4.note')}
                        </p>
                    </div>
                </div>
            ),
            animation: <LeagueSettingsAnimation />,
        },
        {
            id: "c5",
            title: t('creator.c5.title'),
            subtitle: t('creator.c5.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('creator.c5.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c5.text')}
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-lime-50 rounded-lg border border-lime-300">
                            <span className="font-bold text-lime-700">{t('creator.c5.boost2')}</span>
                            <span className="text-sm">e.g., 5</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-300">
                            <span className="font-bold text-orange-700">{t('creator.c5.boost3')}</span>
                            <span className="text-sm">e.g., 3</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-300">
                            <span className="font-bold text-red-700">{t('creator.c5.boost4')}</span>
                            <span className="text-sm">e.g., 1</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {t('creator.c5.note')}
                    </p>
                </div>
            ),
            animation: <PowerUpsAnimation />,
        },
        {
            id: "zs1",
            title: t('creator.zs1.title'),
            subtitle: t('creator.zs1.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('creator.zs1.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.zs1.text')}
                    </p>
                    <div className="space-y-2">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Coins className="w-4 h-4 text-amber-500" />
                                <span className="font-bold text-xs">{t('creator.zs1.item1Title')}</span>
                            </div>
                            <p className="text-xs text-gray-500">{t('creator.zs1.item1Text')}</p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="font-bold text-xs">{t('creator.zs1.item2Title')}</span>
                            </div>
                            <p className="text-xs text-gray-500">{t('creator.zs1.item2Text')}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                        {t('creator.zs1.note')}
                    </p>
                </div>
            ),
            animation: (
                <div className="flex items-center justify-center p-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="absolute w-20 h-20 bg-amber-400 rounded-full border-4 border-amber-600 shadow-xl flex items-center justify-center text-amber-800 font-bold text-xl"
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: i * -15, opacity: 1 }}
                                transition={{ delay: i * 0.3, type: "spring" }}
                                style={{ zIndex: i }}
                            >
                                $
                            </motion.div>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            id: "zs2",
            title: t('creator.zs2.title'),
            subtitle: t('creator.zs2.subtitle'),
            content: (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                            {t('creator.zs2.badge')}
                        </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.zs2.text')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex flex-col items-center text-center">
                            <Skull className="w-8 h-8 text-red-500 mb-2" />
                            <p className="font-black text-xs text-red-700 mb-1">{t('creator.zs2.sdTitle')}</p>
                            <p className="text-[10px] text-gray-600 leading-tight">{t('creator.zs2.sdText')}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex flex-col items-center text-center">
                            <RefreshCw className="w-8 h-8 text-blue-500 mb-2" />
                            <p className="font-black text-xs text-blue-700 mb-1">{t('creator.zs2.ucTitle')}</p>
                            <p className="text-[10px] text-gray-600 leading-tight">{t('creator.zs2.ucText')}</p>
                        </div>
                    </div>
                </div>
            ),
            animation: (
                <div className="flex items-center justify-center gap-6 p-4">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-red-100 p-4 rounded-full"
                    >
                        <Skull className="w-12 h-12 text-red-600" />
                    </motion.div>
                    <div className="h-16 w-1 bg-gray-200 rounded-full" />
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="bg-blue-100 p-4 rounded-full"
                    >
                        <RefreshCw className="w-12 h-12 text-blue-600" />
                    </motion.div>
                </div>
            )
        },
        {
            id: "c6",
            title: t('creator.c6.title'),
            subtitle: t('creator.c6.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c6.text')}
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                        {["4h", "8h", "12h", "24h"].map((h) => (
                            <div key={h} className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="font-black text-blue-600">{h}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border space-y-1">
                        <p className="text-xs font-bold">{t('creator.c6.cardTitle')}</p>
                        <p className="text-xs text-gray-600">
                            {t('creator.c6.cardText')}
                        </p>
                    </div>
                </div>
            ),
            animation: <BetLifecycleAnimation />,
        },
        {
            id: "c7",
            title: t('creator.c7.title'),
            subtitle: t('creator.c7.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c7.text')}
                    </p>
                    <div className="space-y-2">
                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> {t('creator.c7.apiTitle')}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                {t('creator.c7.apiText')}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                            <p className="text-sm font-bold text-purple-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> {t('creator.c7.aiTitle')}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                {t('creator.c7.aiText')}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                        {t('creator.c7.note')}
                    </p>
                </div>
            ),
            animation: <AiBetStatsAnimation />,
        },
        {
            id: "c8",
            title: t('creator.c8.title'),
            subtitle: t('creator.c8.subtitle'),
            content: (
                <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                        {t('creator.c8.text')}
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <div>
                                <p className="text-sm font-bold">{t('creator.c8.actLogTitle')}</p>
                                <p className="text-xs text-gray-500">{t('creator.c8.actLogText')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <div>
                                <p className="text-sm font-bold">{t('creator.c8.analyticsTitle')}</p>
                                <p className="text-xs text-gray-500">{t('creator.c8.analyticsText')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <Award className="w-4 h-4 text-orange-500" />
                            <div>
                                <p className="text-sm font-bold">{t('creator.c8.leaderboardTitle')}</p>
                                <p className="text-xs text-gray-500">{t('creator.c8.leaderboardText')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <Shield className="w-4 h-4 text-purple-500" />
                            <div>
                                <p className="text-sm font-bold">{t('creator.c8.betAuditTitle')}</p>
                                <p className="text-xs text-gray-500">{t('creator.c8.betAuditText')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            animation: (
                <div className="p-4">
                    <div className="bg-white p-3 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000]">
                        <div className="space-y-2">
                            {[
                                { user: "Alex", action: "placed bet", points: "+2-1", color: "bg-green-100" },
                                { user: "Sam", action: "won!", points: "+6 pts", color: "bg-emerald-100" },
                                { user: "Chris", action: "used x3", points: "🚀", color: "bg-orange-100" },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.2 }}
                                    className={`p-2 ${item.color} rounded-lg flex justify-between items-center`}
                                >
                                    <span className="text-xs">
                                        <span className="font-bold">{item.user}</span> {item.action}
                                    </span>
                                    <span className="text-xs font-bold">{item.points}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    const currentSlides = section === "PLAYER" ? playerSlides : section === "CREATOR" ? creatorSlides : [];
    const currentSlide = currentSlides[slideIndex];

    const reset = () => {
        setSection("HOME");
        setSlideIndex(0);
    };

    const handleClose = () => {
        onClose();
        setTimeout(reset, 300); // Reset after animation
    };

    const handleNext = () => {
        if (slideIndex < currentSlides.length - 1) {
            setSlideIndex(prev => prev + 1);
        } else {
            reset();
        }
    };

    const handlePrev = () => {
        if (slideIndex > 0) {
            setSlideIndex(prev => prev - 1);
        } else {
            setSection("HOME");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full h-full md:h-[850px] md:max-w-[450px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative"
                    >
                        {/* HEADER - Only visible on Home or specific mobile views if needed */}
                        {section === "HOME" && (
                            <div className="flex items-center justify-between p-4 px-6 pt-6 border-b border-gray-100 bg-white z-10">
                                <h2 className="text-2xl font-black flex items-center gap-2">
                                    <BookOpen className="w-7 h-7" />
                                    {t('title')}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        )}

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-hidden relative flex flex-col">
                            <AnimatePresence mode="wait">
                                {section === "HOME" ? (
                                    <motion.div
                                        key="home"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full p-6 flex flex-col overflow-y-auto"
                                    >
                                        <div className="text-center mb-8">
                                            <p className="text-gray-500 font-medium">{t('home.welcome')}</p>
                                        </div>

                                        <div className="flex flex-col gap-4 flex-1">
                                            {/* PLAYER CARD */}
                                            <button
                                                onClick={() => setSection("PLAYER")}
                                                className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white text-left transition-transform hover:scale-[1.02] shadow-lg shadow-blue-500/25 flex-1 min-h-[220px]"
                                            >
                                                <div className="absolute -bottom-4 -right-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Gamepad2 className="w-40 h-40" />
                                                </div>
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                                        <User className="w-6 h-6 text-white" />
                                                    </div>
                                                    <h3 className="text-2xl font-black mb-1">{t('home.playerTitle')}</h3>
                                                    <p className="text-blue-100 text-sm mb-6 max-w-[80%]">
                                                        {t('home.playerDesc')}
                                                    </p>
                                                    <div className="mt-auto flex items-center gap-2">
                                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                                            {t('home.playerTopics', { count: 9 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* CREATOR CARD */}
                                            <button
                                                onClick={() => setSection("CREATOR")}
                                                className="group relative overflow-hidden bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-6 text-white text-left transition-transform hover:scale-[1.02] shadow-lg shadow-orange-500/25 flex-1 min-h-[220px]"
                                            >
                                                <div className="absolute -bottom-4 -right-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Crown className="w-40 h-40" />
                                                </div>
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                                        <Settings className="w-6 h-6 text-white" />
                                                    </div>
                                                    <h3 className="text-2xl font-black mb-1">{t('home.creatorTitle')}</h3>
                                                    <p className="text-orange-100 text-sm mb-6 max-w-[80%]">
                                                        {t('home.creatorDesc')}
                                                    </p>
                                                    <div className="mt-auto flex items-center gap-2">
                                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                                            {t('home.creatorTopics', { count: 8 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="mt-6 text-center">
                                            <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                                                <span>💡 {t('home.quickTips1')}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-full flex flex-col">
                                        {/* TOP: PROGRESS BARS (INSTAGRAM STYLE) */}
                                        <div className="pt-3 px-2 pb-1 flex gap-1 z-20 bg-gray-50/90 backdrop-blur-sm">
                                            {currentSlides.map((_, idx) => (
                                                <div key={idx} className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full ${idx <= slideIndex ? "bg-black" : "bg-transparent"}`}
                                                        initial={{ width: "0%" }}
                                                        animate={{ width: idx < slideIndex ? "100%" : idx === slideIndex ? "100%" : "0%" }}
                                                        transition={{ duration: idx === slideIndex ? 0.3 : 0 }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* HEADER - With X and Back */}
                                        <div className="px-4 py-2 flex items-center justify-between z-20 bg-gray-50/90 backdrop-blur-sm">
                                            <button onClick={reset} className="p-2 -ml-2 hover:bg-gray-200 rounded-full">
                                                <ArrowRight className="w-5 h-5 rotate-180 text-gray-500" />
                                            </button>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                {section === "PLAYER" ? t('home.playerTitle') : t('home.creatorTitle')}
                                            </span>
                                            <button onClick={handleClose} className="p-2 -mr-2 hover:bg-gray-200 rounded-full">
                                                <X className="w-5 h-5 text-gray-900" />
                                            </button>
                                        </div>

                                        {/* MIDDLE TOP: ANIMATION AREA */}
                                        <div className="relative h-[280px] shrink-0 bg-gray-50 flex items-center justify-center p-6 overflow-hidden">
                                            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={currentSlide.id}
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 1.1, y: -10 }}
                                                    transition={{ type: "spring", bounce: 0.4 }}
                                                    className="relative z-10 w-full max-w-[320px] aspect-square flex items-center justify-center"
                                                >
                                                    {currentSlide.animation}
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        {/* MIDDLE BOTTOM: TEXT CONTENT */}
                                        <div className="flex-1 bg-white rounded-t-[32px] -mt-6 z-10 p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] overflow-y-auto">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={currentSlide.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <h3 className="text-2xl font-black text-black mb-1 leading-tight">
                                                        {currentSlide.title}
                                                    </h3>
                                                    {currentSlide.subtitle && (
                                                        <p className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wide">
                                                            {currentSlide.subtitle}
                                                        </p>
                                                    )}
                                                    <div className="space-y-3 min-h-[140px]">
                                                        {currentSlide.content}
                                                    </div>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        {/* BOTTOM: NAVIGATION */}
                                        <div className="p-4 pt-0 bg-white flex items-center justify-center gap-4">
                                            <button
                                                onClick={handlePrev}
                                                className="h-12 w-12 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shrink-0 shadow-sm"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>

                                            <button
                                                onClick={handleNext}
                                                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md ${slideIndex === currentSlides.length - 1
                                                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20"
                                                    : "bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                                                    }`}
                                            >
                                                {slideIndex === currentSlides.length - 1 ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 ml-0.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
