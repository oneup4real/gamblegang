"use client";

import { useState } from "react";
import { SplashScreen } from "./splash-screen";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const [splashComplete, setSplashComplete] = useState(false);

    // Check if splash was already seen (on client)
    const isClient = typeof window !== 'undefined';
    const hasSeenSplash = isClient && sessionStorage.getItem('gg-splash-seen');

    return (
        <>
            {!hasSeenSplash && (
                <SplashScreen
                    onComplete={() => setSplashComplete(true)}
                    minDisplayTime={2800}
                />
            )}
            {/* Always render children, splash overlays them */}
            {children}
        </>
    );
}
