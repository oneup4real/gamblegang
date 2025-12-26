"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { PowerUpInventory } from '@/lib/services/league-service';

type PowerUpType = 'x2' | 'x3' | 'x4';

interface CompactPowerBoosterProps {
    powerUps: PowerUpInventory;
    selectedPowerUp?: PowerUpType;
    onSelect: (powerUp: PowerUpType | undefined) => void;
}

// Power-ups with clear labels and cleaner styling
const POWER_UP_CONFIG = {
    x2: { emoji: '💪', label: '×2', gradient: 'from-lime-400 to-green-500', bgColor: 'bg-lime-400' },
    x3: { emoji: '🔥', label: '×3', gradient: 'from-orange-400 to-red-500', bgColor: 'bg-orange-400' },
    x4: { emoji: '💥', label: '×4', gradient: 'from-red-500 to-pink-600', bgColor: 'bg-red-500' },
};

export function CompactPowerBooster({ powerUps, selectedPowerUp, onSelect }: CompactPowerBoosterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelectPowerUp = (type: PowerUpType) => {
        if (powerUps[type] > 0) {
            onSelect(selectedPowerUp === type ? undefined : type);
            setIsOpen(false);
        }
    };

    const hasAnyPowerUps = powerUps.x2 > 0 || powerUps.x3 > 0 || powerUps.x4 > 0;

    if (!hasAnyPowerUps && !selectedPowerUp) {
        return null; // Don't show if no power-ups available
    }

    const selectedConfig = selectedPowerUp ? POWER_UP_CONFIG[selectedPowerUp] : null;

    return (
        <div ref={containerRef} className="relative inline-flex">
            {/* Main Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative w-12 h-12 rounded-xl border-2 border-black 
                    shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] 
                    transition-all duration-200 
                    flex flex-col items-center justify-center gap-0
                    ${selectedPowerUp
                        ? `bg-gradient-to-br ${selectedConfig?.gradient} text-white scale-105`
                        : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:scale-105'
                    }
                    ${isOpen ? 'scale-110' : ''}
                `}
            >
                {selectedPowerUp ? (
                    <>
                        <span className="text-lg leading-none">{selectedConfig?.emoji}</span>
                        <span className="text-[9px] font-black text-white/90 leading-none">{selectedConfig?.label}</span>
                    </>
                ) : (
                    <Zap className="w-5 h-5" />
                )}
            </button>

            {/* Horizontal Power-Up Menu (expands to right to avoid cutoff) */}
            {isOpen && (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50 flex gap-2">
                    {/* X2 */}
                    <PowerUpButton
                        type="x2"
                        count={powerUps.x2}
                        config={POWER_UP_CONFIG.x2}
                        isSelected={selectedPowerUp === 'x2'}
                        onClick={() => handleSelectPowerUp('x2')}
                        delay="0ms"
                    />

                    {/* X3 */}
                    <PowerUpButton
                        type="x3"
                        count={powerUps.x3}
                        config={POWER_UP_CONFIG.x3}
                        isSelected={selectedPowerUp === 'x3'}
                        onClick={() => handleSelectPowerUp('x3')}
                        delay="50ms"
                    />

                    {/* X4 */}
                    <PowerUpButton
                        type="x4"
                        count={powerUps.x4}
                        config={POWER_UP_CONFIG.x4}
                        isSelected={selectedPowerUp === 'x4'}
                        onClick={() => handleSelectPowerUp('x4')}
                        delay="100ms"
                    />
                </div>
            )}

            {/* Glow effect when selected */}
            {selectedPowerUp && !isOpen && (
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${selectedConfig?.gradient} blur-lg opacity-50 -z-10 animate-pulse`} />
            )}
        </div>
    );
}

interface PowerUpButtonProps {
    type: PowerUpType;
    count: number;
    config: typeof POWER_UP_CONFIG.x2;
    isSelected: boolean;
    onClick: () => void;
    position?: string; // Optional - for radial layout
    delay: string;
    badgePosition?: 'left' | 'right';
}

function PowerUpButton({ type, count, config, isSelected, onClick, position, delay, badgePosition = 'right' }: PowerUpButtonProps) {
    const isDisabled = count === 0;
    const badgeClass = badgePosition === 'left' ? '-top-1 -left-1' : '-top-1 -right-1';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className={`
                ${position ? `absolute ${position}` : 'relative'} w-12 h-12 rounded-xl border-2 border-black 
                shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] 
                flex flex-col items-center justify-center gap-0
                transition-all duration-150
                animate-[popIn_150ms_ease-out_both]
                ${isDisabled
                    ? 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                    : isSelected
                        ? `bg-gradient-to-br ${config.gradient} text-white ring-2 ring-white ring-offset-1 scale-110`
                        : `bg-gradient-to-br ${config.gradient} text-white hover:scale-110`
                }
            `}
            style={{ animationDelay: delay }}
        >
            <span className="text-xl leading-none">{config.emoji}</span>
            <span className="text-[10px] font-black leading-none text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">{config.label}</span>

            {/* Count Badge */}
            <span className={`
                absolute ${badgeClass} min-w-[16px] h-[16px] px-0.5 rounded-full 
                text-[9px] font-black flex items-center justify-center border-2 border-black
                ${count > 0 ? 'bg-white text-black' : 'bg-gray-300 text-gray-500'}
            `}>
                {count}
            </span>
        </button>
    );
}
