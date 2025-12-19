
import React from "react";
import teamLogos from "@/lib/data/team-logos.json";

interface TeamLogoProps {
    teamName: string;
    className?: string;
    size?: number;
}

// Normalize and create variations of team name for fuzzy matching
function getNameVariations(name: string): string[] {
    const normalized = name?.toLowerCase().trim() || "";
    if (!normalized) return [];

    const variations: string[] = [normalized];

    // Common prefixes to strip
    const prefixes = [
        "sv ", "fc ", "vfl ", "vfb ", "tsv ", "1. ", "sc ", "sport-club ",
        "sportverein ", "spvgg ", "sg ", "ssv ", "fsv ", "bayer ", "borussia ",
        "eintracht ", "fortuna ", "hertha ", "arminia ", "dynamo ", "preußen ",
        "real ", "atlético ", "athletic ", "sporting ", "as ", "ac ", "afc ",
        "rcd ", "rb ", "tsg ", "hsv ", "bsc ", "fk ", "cf ", "cd "
    ];

    // Common suffixes to strip
    const suffixes = [
        " fc", " sc", " sv", " 04", " 05", " 07", " 08", " 09", " 96", " 98", " 99",
        " 1846", " 1848", " 1860", " 1893", " 1894", " 1895", " 1896", " 1899",
        " 1900", " 1903", " 1904", " 1906", " 1907", " 1909", " 1919",
        " cf", " united", " city", " town", " rovers", " wanderers",
        " hotspur", " albion"
    ];

    // Try without prefixes
    let stripped = normalized;
    for (const prefix of prefixes) {
        if (stripped.startsWith(prefix)) {
            stripped = stripped.slice(prefix.length);
            if (stripped && !variations.includes(stripped)) {
                variations.push(stripped);
            }
            break;
        }
    }

    // Try without suffixes
    for (const suffix of suffixes) {
        if (normalized.endsWith(suffix)) {
            const withoutSuffix = normalized.slice(0, -suffix.length);
            if (withoutSuffix && !variations.includes(withoutSuffix)) {
                variations.push(withoutSuffix);
            }
        }
        if (stripped.endsWith(suffix)) {
            const strippedWithoutSuffix = stripped.slice(0, -suffix.length);
            if (strippedWithoutSuffix && !variations.includes(strippedWithoutSuffix)) {
                variations.push(strippedWithoutSuffix);
            }
        }
    }

    // Try just the last word (often the city/main name)
    const words = normalized.split(" ");
    if (words.length > 1) {
        const lastWord = words[words.length - 1];
        if (lastWord.length > 3 && !variations.includes(lastWord)) {
            variations.push(lastWord);
        }
    }

    return variations;
}

export function TeamLogo({ teamName, className = "", size = 24 }: TeamLogoProps) {
    const logos = teamLogos as Record<string, string>;

    // Try to find the logo using multiple name variations
    const variations = getNameVariations(teamName);
    let logoUrl: string | undefined;

    for (const variant of variations) {
        if (logos[variant]) {
            logoUrl = logos[variant];
            break;
        }
    }

    if (!logoUrl) {
        // If no logo found, show a placeholder with initials
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
