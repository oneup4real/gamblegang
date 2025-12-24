"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HelpTooltipProps {
    text: string;
    className?: string;
    iconClassName?: string;
    position?: "top" | "bottom" | "left" | "right";
}

export function HelpTooltip({
    text,
    className = "",
    iconClassName = "",
    position = "top"
}: HelpTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close tooltip when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                tooltipRef.current &&
                buttonRef.current &&
                !tooltipRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const getPositionClasses = () => {
        switch (position) {
            case "top":
                return "bottom-full left-1/2 -translate-x-1/2 mb-2";
            case "bottom":
                return "top-full left-1/2 -translate-x-1/2 mt-2";
            case "left":
                return "right-full top-1/2 -translate-y-1/2 mr-2";
            case "right":
                return "left-full top-1/2 -translate-y-1/2 ml-2";
            default:
                return "bottom-full left-1/2 -translate-x-1/2 mb-2";
        }
    };

    const getArrowClasses = () => {
        switch (position) {
            case "top":
                return "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800";
            case "bottom":
                return "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800";
            case "left":
                return "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800";
            case "right":
                return "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800";
            default:
                return "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800";
        }
    };

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${iconClassName}`}
                aria-label="Help"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-50 ${getPositionClasses()}`}
                    >
                        <div className="relative bg-slate-800 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg max-w-[240px] min-w-[160px]">
                            {/* Close button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-1 right-1 p-0.5 rounded hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {/* Content */}
                            <p className="pr-4 leading-relaxed">{text}</p>

                            {/* Arrow */}
                            <div
                                className={`absolute w-0 h-0 border-[6px] ${getArrowClasses()}`}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Label with integrated help tooltip
interface LabelWithHelpProps {
    label: string;
    helpText: string;
    required?: boolean;
    optional?: boolean;
    className?: string;
    tooltipPosition?: "top" | "bottom" | "left" | "right";
}

export function LabelWithHelp({
    label,
    helpText,
    required = false,
    optional = false,
    className = "",
    tooltipPosition = "top"
}: LabelWithHelpProps) {
    return (
        <div className={`flex items-center gap-1.5 mb-1 ${className}`}>
            <label className="text-sm font-black text-black uppercase">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {optional && <span className="text-slate-400 font-normal text-xs ml-1 normal-case">(optional)</span>}
            </label>
            <HelpTooltip text={helpText} position={tooltipPosition} />
        </div>
    );
}
