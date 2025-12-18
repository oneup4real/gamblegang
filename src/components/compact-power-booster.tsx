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

const POWER_UP_CONFIG = {
    x2: { emoji: '⚡', label: '2X', gradient: 'from-yellow-400 to-orange-500', bgColor: 'bg-yellow-400' },
    x3: { emoji: '🔥', label: '3X', gradient: 'from-orange-500 to-red-500', bgColor: 'bg-orange-500' },
    x4: { emoji: '💥', label: '4X', gradient: 'from-red-500 to-pink-600', bgColor: 'bg-red-500' },
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
                    relative w-12 h-12 rounded-full border-2 border-black 
                    shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] 
                    transition-all duration-200 
                    flex items-center justify-center
                    ${selectedPowerUp
                        ? `bg-gradient-to-br ${selectedConfig?.gradient} text-white scale-110`
                        : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:scale-105'
                    }
                    ${isOpen ? 'scale-110 rotate-12' : ''}
                `}
            >
                {selectedPowerUp ? (
                    <span className="text-xl">{selectedConfig?.emoji}</span>
                ) : (
                    <Zap className="w-6 h-6" />
                )}

                {/* Badge showing count or selected */}
                {selectedPowerUp && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black text-[10px] font-black rounded-full flex items-center justify-center border border-black">
                        {selectedConfig?.label}
                    </span>
                )}
            </button>

            {/* Radial Power-Up Menu */}
            {isOpen && (
                <div className="absolute z-50">
                    {/* X2 - Top Left */}
                    <PowerUpButton
                        type="x2"
                        count={powerUps.x2}
                        config={POWER_UP_CONFIG.x2}
                        isSelected={selectedPowerUp === 'x2'}
                        onClick={() => handleSelectPowerUp('x2')}
                        position="-top-14 -left-8"
                        delay="0ms"
                    />

                    {/* X3 - Top */}
                    <PowerUpButton
                        type="x3"
                        count={powerUps.x3}
                        config={POWER_UP_CONFIG.x3}
                        isSelected={selectedPowerUp === 'x3'}
                        onClick={() => handleSelectPowerUp('x3')}
                        position="-top-16 left-2"
                        delay="50ms"
                    />

                    {/* X4 - Top Right */}
                    <PowerUpButton
                        type="x4"
                        count={powerUps.x4}
                        config={POWER_UP_CONFIG.x4}
                        isSelected={selectedPowerUp === 'x4'}
                        onClick={() => handleSelectPowerUp('x4')}
                        position="-top-14 left-12"
                        delay="100ms"
                    />

                    {/* Clear selection button */}
                    {selectedPowerUp && (
                        <button
                            type="button"
                            onClick={() => {
                                onSelect(undefined);
                                setIsOpen(false);
                            }}
                            className="absolute -bottom-12 left-1 w-10 h-10 rounded-full bg-gray-200 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-all animate-[popIn_150ms_ease-out_150ms_both]"
                        >
                            ✕
                        </button>
                    )}
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
    position: string;
    delay: string;
}

function PowerUpButton({ type, count, config, isSelected, onClick, position, delay }: PowerUpButtonProps) {
    const isDisabled = count === 0;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className={`
                absolute ${position} w-12 h-12 rounded-full border-2 border-black 
                shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] 
                flex flex-col items-center justify-center gap-0
                transition-all duration-150
                animate-[popIn_150ms_ease-out_both]
                ${isDisabled
                    ? 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                    : isSelected
                        ? `bg-gradient-to-br ${config.gradient} text-white ring-2 ring-white ring-offset-2`
                        : `bg-gradient-to-br ${config.gradient} text-white hover:scale-110`
                }
            `}
            style={{ animationDelay: delay }}
        >
            <span className="text-lg leading-none">{config.emoji}</span>
            <span className="text-[8px] font-black leading-none">{config.label}</span>

            {/* Count Badge */}
            <span className={`
                absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full 
                text-[9px] font-black flex items-center justify-center border border-black
                ${count > 0 ? 'bg-white text-black' : 'bg-gray-300 text-gray-500'}
            `}>
                {count}
            </span>
        </button>
    );
}
