"use client";

import { useCallback } from 'react';

type SoundType = 'click' | 'success' | 'error' | 'hover';

export function useSound() {
    const playSound = useCallback((type: SoundType) => {
        // Sound is currently disabled per user request
    }, []);

    return { playSound };
}
