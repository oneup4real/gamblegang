"use server";

/**
 * Sports Data Service
 * Integrates with TheSportsDB API to fetch real sports results
 * Documentation: https://www.thesportsdb.com/api.php
 */

const SPORTS_DB_API_KEY = process.env.SPORTS_DB_API_KEY || "3"; // Free tier key for testing
const SPORTS_DB_BASE_URL = "https://www.thesportsdb.com/api/v1/json";

interface SportsDBEvent {
    idEvent: string;
    strEvent: string;
    strHomeTeam: string;
    strAwayTeam: string;
    intHomeScore: string | null;
    intAwayScore: string | null;
    dateEvent: string;
    strTimestamp: string;
    strStatus: string;
    strLeague: string;
    idLeague: string;
}

interface SportsDBTeam {
    idTeam: string;
    strTeam: string;
    strAlternate: string;
    strLeague: string;
}

interface GameResult {
    found: boolean;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    eventDate?: string;
}

/**
 * Search for a team by name in TheSportsDB
 */
async function findTeamByName(teamName: string): Promise<SportsDBTeam | null> {
    try {
        const encodedTeam = encodeURIComponent(teamName);
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/searchteams.php?t=${encodedTeam}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error("Failed to search team:", response.statusText);
            return null;
        }

        const data = await response.json();
        if (data.teams && data.teams.length > 0) {
            return data.teams[0];
        }

        return null;
    } catch (error) {
        console.error("Error searching for team:", error);
        return null;
    }
}

/**
 * Get past events for a specific team
 */
async function getTeamPastEvents(teamId: string, limit: number = 15): Promise<SportsDBEvent[]> {
    try {
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/eventslast.php?id=${teamId}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error("Failed to fetch team events:", response.statusText);
            return [];
        }

        const data = await response.json();
        if (data.results) {
            return data.results.slice(0, limit);
        }

        return [];
    } catch (error) {
        console.error("Error fetching team events:", error);
        return [];
    }
}

/**
 * Find a specific game between two teams around a given date
 */
export async function findGameResult(
    homeTeam: string,
    awayTeam: string,
    gameDate: Date
): Promise<GameResult> {
    try {
        console.log(`🔍 Searching for game: ${homeTeam} vs ${awayTeam} on ${gameDate.toLocaleDateString()}`);

        // Step 1: Find the home team
        const homeTeamData = await findTeamByName(homeTeam);
        if (!homeTeamData) {
            console.log(`⚠️  Could not find home team: ${homeTeam}`);
            return { found: false, homeScore: null, awayScore: null, status: "TEAM_NOT_FOUND" };
        }

        console.log(`✅ Found home team: ${homeTeamData.strTeam} (ID: ${homeTeamData.idTeam})`);

        // Step 2: Get recent past events for the home team
        const events = await getTeamPastEvents(homeTeamData.idTeam);
        console.log(`📋 Retrieved ${events.length} recent events for ${homeTeamData.strTeam}`);

        // Step 3: Find the matching game
        const targetDate = gameDate.toISOString().split('T')[0]; // YYYY-MM-DD

        for (const event of events) {
            const eventDate = event.dateEvent; // Format: YYYY-MM-DD

            // Check if this event matches our criteria
            const isDateMatch = eventDate === targetDate;
            const isHomeTeamMatch = normalizeTeamName(event.strHomeTeam) === normalizeTeamName(homeTeam);
            const isAwayTeamMatch = normalizeTeamName(event.strAwayTeam) === normalizeTeamName(awayTeam);

            // Also check within +/- 1 day tolerance
            const eventDateObj = new Date(eventDate);
            const dayDiff = Math.abs((eventDateObj.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
            const isWithinTolerance = dayDiff <= 1;

            if ((isDateMatch || isWithinTolerance) && isHomeTeamMatch && isAwayTeamMatch) {
                console.log(`🎯 Found matching game: ${event.strEvent} on ${eventDate}`);

                // Extract scores
                const homeScore = event.intHomeScore ? parseInt(event.intHomeScore) : null;
                const awayScore = event.intAwayScore ? parseInt(event.intAwayScore) : null;

                if (homeScore !== null && awayScore !== null) {
                    console.log(`✅ Score found: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`);
                    return {
                        found: true,
                        homeScore,
                        awayScore,
                        status: event.strStatus || "FINISHED",
                        eventDate: event.dateEvent
                    };
                } else {
                    console.log(`⚠️  Game found but scores not available (Status: ${event.strStatus})`);
                    return {
                        found: false,
                        homeScore: null,
                        awayScore: null,
                        status: event.strStatus || "NO_SCORE"
                    };
                }
            }
        }

        console.log(`⚠️  No matching game found for ${homeTeam} vs ${awayTeam} on ${targetDate}`);
        return { found: false, homeScore: null, awayScore: null, status: "GAME_NOT_FOUND" };

    } catch (error) {
        console.error("Error finding game result:", error);
        return { found: false, homeScore: null, awayScore: null, status: "ERROR" };
    }
}

/**
 * Normalize team names for comparison (remove common variations)
 */
function normalizeTeamName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, '')
        .replace(/'/g, '')
        .trim();
}

/**
 * Test the sports data service
 */
export async function testSportsDataService() {
    console.log("🏀 Testing Sports Data Service\n");

    // Test case: Knicks vs Nets on Nov 15, 2024
    const result = await findGameResult(
        "New York Knicks",
        "Brooklyn Nets",
        new Date("2024-11-15")
    );

    console.log("\nTest Result:");
    console.log(JSON.stringify(result, null, 2));

    return result;
}
