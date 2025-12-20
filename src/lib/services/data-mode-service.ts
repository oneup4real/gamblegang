"use server";

/**
 * Data Mode Service
 * Manages the global setting for data source: AI (Gemini) vs API (TheSportsDB)
 * This setting affects bet generation and auto-resolution across the entire app.
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export type DataMode = "AI" | "API";

interface DataModeSettings {
    mode: DataMode;
    updatedAt: string;
    updatedBy: string;
}

const SETTINGS_COLLECTION = "appSettings";
const DATA_MODE_DOC = "dataMode";

/**
 * Get the current data mode setting
 * Defaults to "AI" if not set
 */
export async function getDataMode(): Promise<DataMode> {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, DATA_MODE_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as DataModeSettings;
            return data.mode || "AI";
        }

        return "AI"; // Default
    } catch (error) {
        console.error("Error fetching data mode:", error);
        return "AI"; // Default on error
    }
}

/**
 * Set the data mode
 * Requires authenticated user
 */
export async function setDataMode(mode: DataMode, userId: string): Promise<boolean> {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, DATA_MODE_DOC);

        const settings: DataModeSettings = {
            mode,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
        };

        await setDoc(docRef, settings);
        console.log(`✅ Data mode updated to: ${mode}`);
        return true;
    } catch (error) {
        console.error("Error setting data mode:", error);
        return false;
    }
}
