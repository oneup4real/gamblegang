"use client";

/**
 * Custom hook for real-time data mode subscription
 * Provides live updates when the global AI/API mode changes
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export type DataMode = "AI" | "API";

interface DataModeState {
    mode: DataMode;
    loading: boolean;
    error: string | null;
}

export function useDataMode(): DataModeState {
    const [state, setState] = useState<DataModeState>({
        mode: "AI",
        loading: true,
        error: null
    });

    useEffect(() => {
        // Check if Firestore is initialized
        if (!db || Object.keys(db).length === 0) {
            setState({ mode: "AI", loading: false, error: "Database not initialized" });
            return;
        }

        const docRef = doc(db, "appSettings", "dataMode");

        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setState({
                        mode: data.mode || "AI",
                        loading: false,
                        error: null
                    });
                } else {
                    // Document doesn't exist, use default
                    setState({
                        mode: "AI",
                        loading: false,
                        error: null
                    });
                }
            },
            (error) => {
                console.error("Error listening to data mode:", error);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: error.message
                }));
            }
        );

        return () => unsubscribe();
    }, []);

    return state;
}
