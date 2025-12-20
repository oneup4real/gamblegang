/**
 * Backfill Script using Firebase Admin SDK
 * Run with: npx tsx scripts/run-backfill-admin.ts
 * 
 * Requires: You must have a service account key file or be authenticated via gcloud
 */

import { config } from "dotenv";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Initialize Firebase Admin
let app: App;

if (getApps().length === 0) {
    // Try to use default credentials (works if you're logged in via gcloud)
    try {
        app = initializeApp({
            projectId: "gamblegang-926e3"
        });
    } catch (e) {
        console.error("Failed to initialize Firebase Admin. Make sure you're logged in via 'gcloud auth application-default login' or provide a service account key.");
        process.exit(1);
    }
} else {
    app = getApps()[0];
}

const db = getFirestore(app);

// TheSportsDB API - Use premium key from environment
const SPORTS_DB_API_KEY = process.env.SPORTS_DB_API_KEY || "3";
const SPORTS_DB_BASE_URL = "https://www.thesportsdb.com/api/v1/json";

console.log(`🔑 Using SportsDB API Key: ${SPORTS_DB_API_KEY === "3" ? "Free tier" : "Premium (" + SPORTS_DB_API_KEY + ")"}`);

interface BackfillResult {
    totalBets: number;
    apiMatched: number;
    aiAssigned: number;
    skipped: number;
    errors: number;
}

// Team name aliases for better matching
const TEAM_ALIASES: Record<string, string[]> = {
    // Swiss Super League
    "FC Zürich": ["Zurich", "FC Zurich", "FCZ", "Zürich"],
    "FC Thun Berner Oberland": ["Thun", "FC Thun"],
    "FC Lugano": ["Lugano"],
    "FC Lausanne-Sport": ["Lausanne", "Lausanne Sport", "FC Lausanne"],
    "FC Luzern": ["Luzern", "Lucerne", "FC Lucerne"],
    "BSC Young Boys": ["Young Boys", "YB Bern", "Bern Young Boys"],
    "Grasshopper Club Zürich": ["Grasshoppers", "GC Zurich", "Grasshopper"],
    "FC Basel 1893": ["Basel", "FC Basel", "FCB Basel"],
    "Servette FC": ["Servette", "Servette Geneva"],
    "FC St. Gallen": ["St Gallen", "St. Gallen", "Sankt Gallen"],
    "FC Winterthur": ["Winterthur"],
    "FC Sion": ["Sion"],
    "Yverdon Sport FC": ["Yverdon", "Yverdon Sport"],

    // German Bundesliga
    "Hamburger SV": ["Hamburg", "HSV"],
    "VfL Wolfsburg": ["Wolfsburg"],
    "1. FC Köln": ["Köln", "Cologne", "FC Koln", "Koeln"],
    "1. FC Union Berlin": ["Union Berlin", "Union"],
    "1. FC Heidenheim 1846": ["Heidenheim", "FC Heidenheim"],
    "FC Bayern München": ["Bayern Munich", "Bayern", "Bayern Munchen"],
    "TSG Hoffenheim": ["Hoffenheim", "TSG 1899 Hoffenheim"],
    "Sport-Club Freiburg": ["Freiburg", "SC Freiburg"],
    "SV Werder Bremen": ["Werder Bremen", "Bremen", "Werder"],
    "Bayer 04 Leverkusen": ["Leverkusen", "Bayer Leverkusen"],
    "Eintracht Frankfurt": ["Frankfurt", "SGE"],
    "VfB Stuttgart": ["Stuttgart"],
    "Borussia Mönchengladbach": ["Gladbach", "Mönchengladbach", "Borussia Monchengladbach"],
    "Borussia Dortmund": ["Dortmund", "BVB"],
    "RB Leipzig": ["Leipzig", "RasenBallsport Leipzig"],
    "FC Schalke 04": ["Schalke"],
    "Hertha BSC": ["Hertha", "Hertha Berlin"],
    "FSV Mainz 05": ["Mainz", "Mainz 05"],

    // NBA Teams (common variations)
    "Golden State Warriors": ["Warriors", "GSW", "Golden State"],
    "Los Angeles Lakers": ["Lakers", "LA Lakers"],
    "Los Angeles Clippers": ["Clippers", "LA Clippers"],
    "Boston Celtics": ["Celtics", "Boston"],
    "Miami Heat": ["Heat", "Miami"],
    "New York Knicks": ["Knicks", "NY Knicks"],
    "Brooklyn Nets": ["Nets", "Brooklyn"],
    "Philadelphia 76ers": ["76ers", "Sixers", "Philadelphia Sixers"],
    "Toronto Raptors": ["Raptors", "Toronto"],
    "Chicago Bulls": ["Bulls", "Chicago"],
    "Cleveland Cavaliers": ["Cavaliers", "Cavs", "Cleveland"],
    "Milwaukee Bucks": ["Bucks", "Milwaukee"],
    "Indiana Pacers": ["Pacers", "Indiana"],
    "Detroit Pistons": ["Pistons", "Detroit"],
    "Atlanta Hawks": ["Hawks", "Atlanta"],
    "Charlotte Hornets": ["Hornets", "Charlotte"],
    "Washington Wizards": ["Wizards", "Washington"],
    "Orlando Magic": ["Magic", "Orlando"],
    "Dallas Mavericks": ["Mavericks", "Mavs", "Dallas"],
    "Houston Rockets": ["Rockets", "Houston"],
    "San Antonio Spurs": ["Spurs", "San Antonio"],
    "Memphis Grizzlies": ["Grizzlies", "Memphis"],
    "New Orleans Pelicans": ["Pelicans", "New Orleans"],
    "Oklahoma City Thunder": ["Thunder", "OKC"],
    "Denver Nuggets": ["Nuggets", "Denver"],
    "Utah Jazz": ["Jazz", "Utah"],
    "Portland Trail Blazers": ["Trail Blazers", "Blazers", "Portland"],
    "Phoenix Suns": ["Suns", "Phoenix"],
    "Sacramento Kings": ["Kings", "Sacramento"],
    "Minnesota Timberwolves": ["Timberwolves", "Wolves", "Minnesota"],
};

// Get all possible names for a team
function getTeamSearchNames(teamName: string): string[] {
    const names = [teamName];

    // Check if we have aliases
    if (TEAM_ALIASES[teamName]) {
        names.push(...TEAM_ALIASES[teamName]);
    }

    // Also check if the input matches any alias (reverse lookup)
    for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
        if (aliases.some(a => a.toLowerCase() === teamName.toLowerCase())) {
            names.push(canonical);
            names.push(...aliases);
        }
    }

    return [...new Set(names)]; // Remove duplicates
}

// Rate limiter
let lastApiCall = 0;
const MIN_API_DELAY = 500; // 500ms between calls

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;

    if (timeSinceLastCall < MIN_API_DELAY) {
        await new Promise(r => setTimeout(r, MIN_API_DELAY - timeSinceLastCall));
    }

    lastApiCall = Date.now();
    return fetch(url);
}

async function searchTeam(teamName: string): Promise<any | null> {
    const searchNames = getTeamSearchNames(teamName);

    for (const name of searchNames) {
        try {
            const response = await rateLimitedFetch(
                `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/searchteams.php?t=${encodeURIComponent(name)}`
            );

            // Check for rate limiting (HTML response)
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) {
                console.log(`        ⏳ Rate limited, waiting 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            const data = await response.json();
            if (data.teams?.[0]) {
                console.log(`        ✓ Found "${name}" in SportsDB`);
                return data.teams[0];
            }
        } catch (error) {
            console.log(`        ⚠️ Error searching "${name}": ${error}`);
        }
    }

    return null;
}

async function getTeamNextEvents(teamId: string): Promise<any[]> {
    try {
        const response = await rateLimitedFetch(
            `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/eventsnext.php?id=${teamId}`
        );

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            console.log(`        ⏳ Rate limited on next events, waiting 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            return [];
        }

        const data = await response.json();
        return data.events || [];
    } catch (error) {
        console.error(`Error getting next events for team ${teamId}:`, error);
        return [];
    }
}

async function getTeamLastEvents(teamId: string): Promise<any[]> {
    try {
        const response = await rateLimitedFetch(
            `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/eventslast.php?id=${teamId}`
        );

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            console.log(`        ⏳ Rate limited on last events, waiting 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            return [];
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error(`Error getting last events for team ${teamId}:`, error);
        return [];
    }
}

function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

async function findSportsDbEvent(
    homeTeam: string,
    awayTeam: string,
    eventDate: Date
): Promise<{ found: boolean; eventId?: string; leagueId?: string; teamId?: string }> {
    console.log(`    🔍 Searching for: ${homeTeam} vs ${awayTeam} on ${eventDate.toLocaleDateString()}`);

    // Search for home team first
    const team = await searchTeam(homeTeam);
    if (!team) {
        // Try away team
        const awayTeamData = await searchTeam(awayTeam);
        if (!awayTeamData) {
            console.log(`    ⚠️ Neither team found in SportsDB`);
            return { found: false };
        }
    }

    const teamId = team?.idTeam;
    if (!teamId) {
        return { found: false };
    }

    // Check upcoming events
    const nextEvents = await getTeamNextEvents(teamId);
    for (const event of nextEvents) {
        const eventDateApi = new Date(event.dateEvent);
        if (isSameDay(eventDateApi, eventDate)) {
            console.log(`    ✅ Found upcoming match: ${event.strEvent}`);
            return {
                found: true,
                eventId: event.idEvent,
                leagueId: event.idLeague,
                teamId: teamId
            };
        }
    }

    // Check recent events (for bets on past games)
    const lastEvents = await getTeamLastEvents(teamId);
    for (const event of lastEvents) {
        const eventDateApi = new Date(event.dateEvent);
        if (isSameDay(eventDateApi, eventDate)) {
            console.log(`    ✅ Found past match: ${event.strEvent}`);
            return {
                found: true,
                eventId: event.idEvent,
                leagueId: event.idLeague,
                teamId: teamId
            };
        }
    }

    console.log(`    ⚠️ No matching event found for date`);
    return { found: false };
}

async function backfillSportsDbEventIds(): Promise<BackfillResult> {
    const result: BackfillResult = {
        totalBets: 0,
        apiMatched: 0,
        aiAssigned: 0,
        skipped: 0,
        errors: 0
    };

    console.log("🔄 Starting backfill of SportsDB event IDs...\n");

    // Query all bets using collection group
    const betsSnapshot = await db.collectionGroup("bets").get();

    console.log(`📊 Found ${betsSnapshot.size} bets to process\n`);
    result.totalBets = betsSnapshot.size;

    let processedCount = 0;

    for (const betDoc of betsSnapshot.docs) {
        try {
            const bet = betDoc.data();
            const leagueId = betDoc.ref.parent.parent?.id;

            processedCount++;
            console.log(`\n[${processedCount}/${result.totalBets}] Processing: ${bet.question?.substring(0, 50)}...`);

            if (!leagueId) {
                console.log("  ⚠️ Skipping - no league ID");
                result.skipped++;
                continue;
            }

            // Skip if already has API dataSource with eventId (successful match)
            // But RE-PROCESS if dataSource is AI (might find match with premium key)
            if (bet.dataSource === "API" && bet.sportsDbEventId) {
                console.log(`  ⏭️ Skipping - already matched to API: ${bet.sportsDbEventId}`);
                result.skipped++;
                continue;
            }

            if (bet.dataSource === "AI") {
                console.log(`  🔄 Re-processing AI bet with premium key...`);
            }

            // Extract team names
            let homeTeam: string | undefined;
            let awayTeam: string | undefined;
            let eventDate: Date | undefined;

            // From MATCH type bets
            if (bet.matchDetails) {
                homeTeam = bet.matchDetails.homeTeam;
                awayTeam = bet.matchDetails.awayTeam;
            }

            // Try parsing from question for CHOICE bets
            if (!homeTeam || !awayTeam) {
                const vsMatch = bet.question?.match(/(.+?)\s+(?:vs\.?|versus|v\.?)\s+(.+?)(?:\s*[-–—]\s*|\s*\?|$)/i);
                if (vsMatch) {
                    homeTeam = vsMatch[1].trim();
                    awayTeam = vsMatch[2].trim();
                }
            }

            // Get event date
            if (bet.eventDate) {
                if (bet.eventDate.toDate) {
                    eventDate = bet.eventDate.toDate();
                } else if (bet.eventDate._seconds) {
                    eventDate = new Date(bet.eventDate._seconds * 1000);
                } else {
                    eventDate = new Date(bet.eventDate);
                }
            }

            // Prepare update data
            const updateData: any = {};

            // Try to find SportsDB event
            if (homeTeam && awayTeam && eventDate) {
                // Add delay to respect API rate limits
                await new Promise(r => setTimeout(r, 300));

                const matchResult = await findSportsDbEvent(homeTeam, awayTeam, eventDate);

                if (matchResult.found && matchResult.eventId) {
                    updateData.dataSource = "API";
                    updateData.sportsDbEventId = matchResult.eventId;
                    updateData.sportsDbLeagueId = matchResult.leagueId;
                    updateData.sportsDbTeamId = matchResult.teamId;
                    result.apiMatched++;
                    console.log(`  ✅ Matched to SportsDB event: ${matchResult.eventId}`);
                } else {
                    updateData.dataSource = "AI";
                    result.aiAssigned++;
                    console.log(`  🤖 No match found, assigned to AI`);
                }
            } else {
                updateData.dataSource = "AI";
                result.aiAssigned++;
                console.log(`  🤖 No team/date info, assigned to AI`);
            }

            // Update the document
            if (Object.keys(updateData).length > 0) {
                await betDoc.ref.update(updateData);
                console.log(`  💾 Updated!`);
            }

        } catch (error) {
            console.error(`  ❌ Error:`, error);
            result.errors++;
        }
    }

    return result;
}

// Main
async function main() {
    console.log("🚀 SportsDB Backfill Script");
    console.log("============================\n");

    try {
        const result = await backfillSportsDbEventIds();

        console.log("\n\n========================================");
        console.log("✅ BACKFILL COMPLETE");
        console.log("========================================");
        console.log(`Total bets:     ${result.totalBets}`);
        console.log(`API matched:    ${result.apiMatched}`);
        console.log(`AI assigned:    ${result.aiAssigned}`);
        console.log(`Skipped:        ${result.skipped}`);
        console.log(`Errors:         ${result.errors}`);
        console.log("========================================\n");

    } catch (error) {
        console.error("❌ Backfill failed:", error);
        process.exit(1);
    }
}

main();
