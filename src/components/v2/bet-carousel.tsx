"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, PanInfo, animate } from "framer-motion";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";

interface BetCarouselProps<T> {
    items: T[];
    renderItem: (item: T, isActive: boolean) => React.ReactNode;
    fullHeight?: boolean;
}

export function BetCarousel<T extends { id: string }>({ items, renderItem, fullHeight = false }: BetCarouselProps<T>) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    // Update width on resize
    useEffect(() => {
        if (containerRef.current) {
            setWidth(containerRef.current.offsetWidth);
        }
        const handleResize = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.offsetWidth);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const x = useMotionValue(0);

    // Spring for smooth snapping
    const springX = useSpring(x, { stiffness: 300, damping: 30 });

    // Snap to current index when it changes or width changes
    useEffect(() => {
        if (width > 0) {
            const target = -currentIndex * width;
            animate(x, target, { type: "spring", stiffness: 300, damping: 30 });
        }
    }, [currentIndex, width, x]);

    // Safety check
    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                <Layers className="w-12 h-12 mb-2 opacity-20" />
                <p>No items to display</p>
            </div>
        );
    }

    const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
        const swipe = offset.x;
        const swipeThreshold = width / 4; // Drag 25% to change
        const velocityThreshold = 0.2;

        let newIndex = currentIndex;

        if (swipe < -swipeThreshold || (swipe < 0 && velocity.x < -velocityThreshold)) {
            newIndex = Math.min(currentIndex + 1, items.length - 1);
        } else if (swipe > swipeThreshold || (swipe > 0 && velocity.x > velocityThreshold)) {
            newIndex = Math.max(currentIndex - 1, 0);
        }

        // Apply change
        setCurrentIndex(newIndex);

        // If index didn't change (bounce back), we need to trigger animation manually
        // because useEffect dependency [currentIndex] won't trigger.
        if (newIndex === currentIndex) {
            animate(x, -currentIndex * width, { type: "spring", stiffness: 300, damping: 30 });
        }
    };

    return (
        <div className={`relative w-full flex flex-col ${fullHeight ? "h-full" : "min-h-[750px]"} overflow-hidden`}>

            {/* Carousel Container */}
            <div
                className="relative flex-1 flex overflow-visible"
                ref={containerRef}
            >
                <motion.div
                    className="flex h-full"
                    style={{ x: x, touchAction: "pan-y" }} // Use raw x for drag, but spring doesn't support drag binding directly nicely 
                    // Actually, if we bind x to style, drag updates x.
                    drag="x"
                    dragConstraints={{
                        left: -((items.length - 1) * width),
                        right: 0
                    }}
                    dragElastic={0.1} // Resistance at edges
                    onDragEnd={handleDragEnd}
                >
                    {items.map((item, i) => {
                        // Virtualization: Only render neighbors
                        // +1/-1 range is enough for mostly visible.
                        // But precise snapping might show +2 briefly.
                        const shouldRender = Math.abs(i - currentIndex) <= 1;

                        return (
                            <div
                                key={item.id}
                                className="flex-shrink-0 w-full px-4 flex items-start justify-center"
                                style={{ width: width || "100%" }}
                            >
                                <div className="w-full max-w-md relative top-4">
                                    {shouldRender ? (
                                        renderItem(item, i === currentIndex)
                                    ) : (
                                        <div className="h-64 bg-gray-50/50 rounded-xl animate-pulse" /> // Placeholder
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Controls / Progress */}
            <div className="flex flex-col items-center gap-2 mt-4 z-10 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-2">

                {/* Dots Progress */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] py-1 px-2 no-scrollbar">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentIndex(i)}
                            className={`rounded-full transition-all flex-shrink-0 ${i === currentIndex
                                ? "w-4 h-1.5 bg-black"
                                : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                                }`}
                        />
                    ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-8 text-sm font-bold text-gray-400">
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className={`flex items-center gap-1 p-2 transition-colors ${currentIndex > 0 ? "text-gray-600 hover:text-black" : "opacity-30 cursor-not-allowed"}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        PREV
                    </button>
                    <span className="text-xs font-mono">
                        {currentIndex + 1} / {items.length}
                    </span>
                    <button
                        onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
                        disabled={currentIndex === items.length - 1}
                        className={`flex items-center gap-1 p-2 transition-colors ${currentIndex < items.length - 1 ? "text-gray-600 hover:text-black" : "opacity-30 cursor-not-allowed"}`}
                    >
                        NEXT
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
