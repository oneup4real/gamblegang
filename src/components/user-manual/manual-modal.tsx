"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Crown, User, BookOpen } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AiBetStatsAnimation } from "./animations/ai-bet-flow";
import { BetLifecycleAnimation } from "./animations/bet-lifecycle-animation";
import { ZeroSumVsArcadeAnimation } from "./animations/zero-sum-vs-arcade";

interface ManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type View = "HOME" | "ADMIN" | "PLAYER";

export function ManualModal({ isOpen, onClose }: ManualModalProps) {
    const t = useTranslations('Manual');
    const [view, setView] = useState<View>("HOME");
    const [slideIndex, setSlideIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    const reset = () => {
        setView("HOME");
        setSlideIndex(0);
        setIsExpanded(false);
    };

    const handleClose = () => {
        onClose();
        setTimeout(reset, 300); // Reset after close animation
    };

    const handleNext = () => {
        if (slideIndex < currentSlides.length - 1) {
            setSlideIndex(prev => prev + 1);
            setIsExpanded(false);
        } else {
            reset();
        }
    };

    const handlePrev = () => {
        setSlideIndex(prev => Math.max(0, prev - 1));
        setIsExpanded(false);
    };

    // --- Content ---

    const adminSlides = [
        {
            title: t('admin.slide1Title'),
            subtitle: t('admin.slide1Subtitle'),
            text: t('admin.slide1Text'),
            details: null, // No details for slide 1
            animation: (
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-4 border-2 border-black rounded-xl shadow-[4px_4px_0_0_#000] w-48 text-center">
                        <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                        <span className="font-black text-sm">My League</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded-full border border-black" />
                        <div className="h-8 w-8 bg-gray-200 rounded-full border border-black" />
                        <div className="h-8 w-8 bg-gray-200 rounded-full border border-black" />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-gray-400">Invite Code: 123-ABC</span>
                </div>
            )
        },
        {
            title: t('admin.slide2Title'),
            subtitle: t('admin.slide2Subtitle'),
            text: t('admin.slide2Text'),
            details: t('admin.slide2Details'),
            animation: <AiBetStatsAnimation />
        },
        {
            title: t('admin.slide3Title'),
            subtitle: t('admin.slide3Subtitle'),
            text: t('admin.slide3Text'),
            details: t('admin.slide3Details'),
            animation: <BetLifecycleAnimation />
        }
    ];

    const playerSlides = [
        {
            title: t('player.slide1Title'),
            subtitle: t('player.slide1Subtitle'),
            text: t('player.slide1Text'),
            details: null,
            animation: (
                <div className="flex items-center justify-center h-40">
                    <div className="bg-purple-100 p-4 border-2 border-black rounded-xl flex items-center gap-4">
                        <User className="w-8 h-8" />
                        <div className="flex flex-col">
                            <span className="font-black text-lg">Welcome!</span>
                            <span className="text-xs font-bold text-gray-500">+1000 pts</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: t('player.slide2Title'),
            subtitle: t('player.slide2Subtitle'),
            text: t('player.slide2Text'),
            details: t('player.slide2Details'),
            animation: <BetLifecycleAnimation />
        },
        {
            title: t('player.slide3Title'),
            subtitle: t('player.slide3Subtitle'),
            text: t('player.slide3Text'),
            details: t('player.slide3Details'),
            animation: <ZeroSumVsArcadeAnimation />
        }
    ];

    const currentSlides = view === "ADMIN" ? adminSlides : view === "PLAYER" ? playerSlides : [];
    const currentSlide = currentSlides[slideIndex];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0.9, rotate: 2, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-[3px] border-black shadow-[8px_8px_0_0_#000] flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-yellow-400 p-4 border-b-2 border-black flex justify-between items-center bg-[url('/noise.png')]">
                            <h2 className="text-2xl font-black font-comic uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-6 h-6 border-2 border-black rounded-md bg-white p-0.5" />
                                {t('title')}
                            </h2>
                            <button onClick={handleClose} className="p-1 hover:bg-black hover:text-white rounded border-2 border-black transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 flex flex-col">
                            {view === "HOME" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full my-auto">
                                    <button
                                        onClick={() => setView("ADMIN")}
                                        className="group relative p-6 bg-red-50 border-2 border-black rounded-2xl hover:translate-y-[-4px] hover:shadow-[4px_4px_0_0_#000] transition-all text-left flex flex-col gap-4"
                                    >
                                        <div className="bg-red-200 w-12 h-12 rounded-full border-2 border-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Crown className="w-6 h-6 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase">{t('admin.menuTitle')}</h3>
                                            <p className="text-sm font-bold text-gray-500 mt-1">{t('admin.menuDesc')}</p>
                                        </div>
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="w-6 h-6" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setView("PLAYER")}
                                        className="group relative p-6 bg-blue-50 border-2 border-black rounded-2xl hover:translate-y-[-4px] hover:shadow-[4px_4px_0_0_#000] transition-all text-left flex flex-col gap-4"
                                    >
                                        <div className="bg-blue-200 w-12 h-12 rounded-full border-2 border-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <User className="w-6 h-6 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase">{t('player.menuTitle')}</h3>
                                            <p className="text-sm font-bold text-gray-500 mt-1">{t('player.menuDesc')}</p>
                                        </div>
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="w-6 h-6" />
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    {/* Breadcrumb */}
                                    <button
                                        onClick={() => reset()}
                                        className="self-start text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black mb-4 flex items-center gap-1"
                                    >
                                        <ChevronLeft className="w-3 h-3" /> {t('backToMenu')}
                                    </button>

                                    {/* Slide Content */}
                                    <div className="flex flex-col md:flex-row gap-8 flex-1 items-start">
                                        <div className="flex-1 space-y-4">
                                            <div className="inline-block px-3 py-1 bg-black text-white text-xs font-black uppercase tracking-widest rounded-full">
                                                {t('stepCounter', { current: slideIndex + 1, total: currentSlides.length })}
                                            </div>
                                            <h3 className="text-3xl font-black font-comic leading-tight">{currentSlide.title}</h3>
                                            <p className="text-lg font-bold text-gray-500">{currentSlide.subtitle}</p>
                                            <p className="font-medium text-gray-800 leading-relaxed border-l-4 border-yellow-400 pl-4">
                                                {currentSlide.text}
                                            </p>

                                            {/* Expandable Details */}
                                            {currentSlide.details && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setIsExpanded(!isExpanded)}
                                                        className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                {t('showLess')} <ChevronUp className="w-4 h-4" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                {t('showMore')} <ChevronDown className="w-4 h-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                                animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                                                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-4 bg-gray-50 border-2 border-black/10 rounded-xl text-sm leading-relaxed text-gray-700 font-medium">
                                                                    💡 {currentSlide.details}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>

                                        {/* Graphic Panel */}
                                        <div className="flex-1 w-full flex items-start justify-center pt-8 md:pt-0">
                                            {/* Centered Vertically relative to text if not expanded, or flex justify start? 
                                                Actually, better to sticking to top if text expands.
                                            */}
                                            <div className="w-full relative sticky top-4">
                                                {currentSlide.animation}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Nav */}
                                    <div className="mt-8 flex justify-between items-center pt-4 border-t-2 border-gray-100">
                                        <button
                                            onClick={handlePrev}
                                            disabled={slideIndex === 0}
                                            className="px-4 py-2 font-bold disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> {t('prev')}
                                        </button>

                                        <div className="flex gap-2">
                                            {currentSlides.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2 h-2 rounded-full transition-colors ${i === slideIndex ? "bg-black" : "bg-gray-200"}`}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleNext}
                                            className="px-6 py-2 bg-black text-white font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] flex items-center gap-2"
                                        >
                                            {slideIndex === currentSlides.length - 1 ? t('finish') : t('next')} <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
