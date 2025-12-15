"use client";

import { useCallback } from 'react';

type SoundType = 'click' | 'success' | 'error' | 'hover';

export function useSound() {
    const playSound = useCallback((type: SoundType) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'click') {
                // High pithced blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'hover') {
                // Very short tick
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'success') {
                // Major arpeggio
                const duration = 0.1;
                [440, 554, 659].forEach((freq, i) => {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);

                    osc2.frequency.value = freq;
                    gain2.gain.setValueAtTime(0.1, now + i * 0.05);
                    gain2.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

                    osc2.start(now + i * 0.05);
                    osc2.stop(now + i * 0.05 + 0.3);
                });
            }
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    }, []);

    return { playSound };
}
