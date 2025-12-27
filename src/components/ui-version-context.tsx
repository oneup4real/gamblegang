"use client";

/**
 * UI VERSION CONTEXT
 * 
 * Allows switching between v1 (current) and v2 (new compact) UI.
 * Preference is stored in localStorage and only affects the current user's session.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UIVersion = "v1" | "v2";

interface UIVersionContextType {
    version: UIVersion;
    setVersion: (version: UIVersion) => void;
    isV2: boolean;
    toggleVersion: () => void;
}

const UIVersionContext = createContext<UIVersionContextType | undefined>(undefined);

const STORAGE_KEY = "gamblegang_ui_version";

export function UIVersionProvider({ children }: { children: ReactNode }) {
    const [version, setVersionState] = useState<UIVersion>("v2");
    const [isHydrated, setIsHydrated] = useState(false);

    // Load saved preference on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as UIVersion | null;
        if (saved === "v1" || saved === "v2") {
            setVersionState(saved);
        }
        setIsHydrated(true);
    }, []);

    // Save preference when changed
    const setVersion = (newVersion: UIVersion) => {
        setVersionState(newVersion);
        localStorage.setItem(STORAGE_KEY, newVersion);
    };

    const toggleVersion = () => {
        setVersion(version === "v1" ? "v2" : "v1");
    };

    // Don't render children until hydrated to prevent mismatch
    if (!isHydrated) {
        return null;
    }

    return (
        <UIVersionContext.Provider
            value={{
                version,
                setVersion,
                isV2: version === "v2",
                toggleVersion
            }}
        >
            {children}
        </UIVersionContext.Provider>
    );
}

export function useUIVersion() {
    const context = useContext(UIVersionContext);
    if (!context) {
        throw new Error("useUIVersion must be used within UIVersionProvider");
    }
    return context;
}

// HOC for easy conditional rendering
export function withUIVersion<P extends object>(
    V1Component: React.ComponentType<P>,
    V2Component: React.ComponentType<P>
) {
    return function VersionedComponent(props: P) {
        const { isV2 } = useUIVersion();
        return isV2 ? <V2Component {...props} /> : <V1Component {...props} />;
    };
}
