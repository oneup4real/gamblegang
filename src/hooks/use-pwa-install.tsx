"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallContextType {
    canInstall: boolean;
    isInstalled: boolean;
    promptInstall: () => Promise<boolean>;
}

const PWAInstallContext = createContext<PWAInstallContextType>({
    canInstall: false,
    isInstalled: false,
    promptInstall: async () => false,
});

export function PWAInstallProvider({ children }: { children: ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (typeof window !== 'undefined') {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
            setIsInstalled(isStandalone);
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        // Listen for app installed event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async (): Promise<boolean> => {
        if (!deferredPrompt) {
            console.log('No install prompt available');
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setDeferredPrompt(null);
                return true;
            } else {
                console.log('User dismissed the install prompt');
                return false;
            }
        } catch (error) {
            console.error('Error prompting install:', error);
            return false;
        }
    };

    return (
        <PWAInstallContext.Provider value={{
            canInstall: !!deferredPrompt && !isInstalled,
            isInstalled,
            promptInstall,
        }}>
            {children}
        </PWAInstallContext.Provider>
    );
}

export function usePWAInstall() {
    return useContext(PWAInstallContext);
}
