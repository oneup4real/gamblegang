
import React from "react";
import teamLogos from "@/lib/data/team-logos.json";
import { HelpCircle } from "lucide-react";

interface TeamLogoProps {
    teamName: string;
    className?: string;
    size?: number;
}

export function TeamLogo({ teamName, className = "", size = 24 }: TeamLogoProps) {
    // Normalize team name for lookup
    const cleanName = teamName?.toLowerCase().trim();

    // Try to find the logo
    // 1. Exact match (already normalized in JSON generation)
    // 2. Contains match? No, that might be too aggressive (e.g. "Man" matching "Man Utd" vs "Man City")
    // The JSON generation already included displayName, name, abbreviation, etc.

    const logoUrl = (teamLogos as Record<string, string>)[cleanName];

    if (!logoUrl) {
        // If no logo found, show a placeholder or just name initial?
        // Let's return a generic shield or just an initial avatar
        return (
            <div
                className={`flex items-center justify-center bg-slate-100 rounded-full border border-slate-200 text-slate-400 font-bold uppercase ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
                title={teamName}
            >
                {teamName.substring(0, 2)}
            </div>
        );
    }

    return (
        <img
            src={logoUrl}
            alt={teamName}
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
            onError={(e) => {
                // Fallback on error
                e.currentTarget.style.display = 'none';
            }}
        />
    );
}
