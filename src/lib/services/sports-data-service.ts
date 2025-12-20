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

// ============================================
// LEAGUE & EVENT SEARCH (For Bulk Generation)
// ============================================

interface SportsDBLeague {
    idLeague: string;
    strLeague: string;
    strSport: string;
    strCountry: string;
}

/**
 * Search for leagues by name (e.g., "Premier League", "NBA")
 */
export async function searchLeagues(query: string): Promise<SportsDBLeague[]> {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/search_all_leagues.php?s=${encodedQuery}`;

        console.log(`🔍 [SportsDB] Searching leagues for: ${query}`);

        const response = await fetch(url);
        if (!response.ok) {
            console.error("Failed to search leagues:", response.statusText);
            return [];
        }

        const data = await response.json();
        if (data.countrys) {
            // The API returns leagues under "countrys" when searching by sport
            console.log(`✅ [SportsDB] Found ${data.countrys.length} leagues`);
            return data.countrys;
        }

        return [];
    } catch (error) {
        console.error("Error searching leagues:", error);
        return [];
    }
}

/**
 * Search for a league by exact name
 */
async function findLeagueByName(leagueName: string): Promise<SportsDBLeague | null> {
    try {
        const encodedName = encodeURIComponent(leagueName);
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/search_all_leagues.php?l=${encodedName}`;

        console.log(`🔍 [SportsDB] Searching for league: ${leagueName}`);

        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.leagues && data.leagues.length > 0) {
            console.log(`✅ [SportsDB] Found league: ${data.leagues[0].strLeague}`);
            return data.leagues[0];
        }

        // Try searching by sport if direct league search fails
        const leagues = await searchLeagues(leagueName);
        if (leagues.length > 0) {
            // Find best match
            const match = leagues.find(l =>
                l.strLeague.toLowerCase().includes(leagueName.toLowerCase()) ||
                leagueName.toLowerCase().includes(l.strLeague.toLowerCase())
            );
            return match || leagues[0];
        }

        return null;
    } catch (error) {
        console.error("Error finding league:", error);
        return null;
    }
}

/**
 * Get next/upcoming events for a league
 */
export async function getLeagueNextEvents(leagueId: string, limit: number = 15): Promise<SportsDBEvent[]> {
    try {
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/eventsnextleague.php?id=${leagueId}`;

        console.log(`📅 [SportsDB] Fetching next events for league ID: ${leagueId}`);

        const response = await fetch(url);
        if (!response.ok) {
            console.error("Failed to fetch league events:", response.statusText);
            return [];
        }

        const data = await response.json();
        if (data.events) {
            console.log(`✅ [SportsDB] Found ${data.events.length} upcoming events`);
            return data.events.slice(0, limit);
        }

        return [];
    } catch (error) {
        console.error("Error fetching league events:", error);
        return [];
    }
}

/**
 * Get events for a specific date range from a league
 */
async function getLeagueEventsByDate(leagueId: string, startDate: string, endDate: string): Promise<SportsDBEvent[]> {
    try {
        // Note: This endpoint requires premium API key
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/eventsseason.php?id=${leagueId}&s=${new Date().getFullYear()}`;

        const response = await fetch(url);
        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        if (data.events) {
            // Filter by date range
            const start = new Date(startDate);
            const end = new Date(endDate);

            return data.events.filter((event: SportsDBEvent) => {
                const eventDate = new Date(event.dateEvent);
                return eventDate >= start && eventDate <= end;
            });
        }

        return [];
    } catch (error) {
        console.error("Error fetching events by date:", error);
        return [];
    }
}

// ============================================
// BULK BET GENERATION (API Alternative to AI)
// ============================================

interface GeneratedBet {
    question: string;
    type: "MATCH" | "CHOICE";
    matchHome: string;
    matchAway: string;
    date: string;
    verified: boolean;
    options?: string[];
    source: string;
}

/**
 * Generate bulk bets from TheSportsDB API
 * This is the API alternative to the AI-based generateBulkBets function
 */
export async function generateBulkBetsFromAPI(
    topic: string,
    timeframe: string,
    type: "CHOICE" | "MATCH",
    outcomeType?: "WINNER" | "WINNER_DRAW"
): Promise<GeneratedBet[]> {
    console.log(`🏟️ [SportsDB API] Generating bets for: ${topic}, timeframe: ${timeframe}`);

    try {
        // Step 1: Find the league
        const league = await findLeagueByName(topic);

        if (!league) {
            console.warn(`⚠️ [SportsDB API] Could not find league: ${topic}`);
            // Try to find a team and get their league's events
            const team = await findTeamByName(topic);
            if (team) {
                console.log(`🔄 [SportsDB API] Found team instead, fetching team events...`);
                const events = await getTeamNextEvents(team.idTeam);
                return convertEventsToGeneratedBets(events, type, outcomeType);
            }
            return [];
        }

        // Step 2: Get upcoming events for the league
        const events = await getLeagueNextEvents(league.idLeague, 30);

        if (events.length === 0) {
            console.warn(`⚠️ [SportsDB API] No upcoming events found for: ${league.strLeague}`);
            return [];
        }

        // Step 3: Filter events based on timeframe
        const filteredEvents = filterEventsByTimeframe(events, timeframe);

        // Step 4: Convert to GeneratedBet format
        const bets = convertEventsToGeneratedBets(filteredEvents, type, outcomeType);

        console.log(`✅ [SportsDB API] Generated ${bets.length} bets from ${league.strLeague}`);
        return bets;

    } catch (error) {
        console.error("❌ [SportsDB API] Error generating bulk bets:", error);
        return [];
    }
}

/**
 * Get upcoming events for a team
 */
async function getTeamNextEvents(teamId: string, limit: number = 15): Promise<SportsDBEvent[]> {
    try {
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/eventsnext.php?id=${teamId}`;

        const response = await fetch(url);
        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        if (data.events) {
            return data.events.slice(0, limit);
        }

        return [];
    } catch (error) {
        console.error("Error fetching team next events:", error);
        return [];
    }
}

/**
 * Filter events based on a human-readable timeframe
 */
function filterEventsByTimeframe(events: SportsDBEvent[], timeframe: string): SportsDBEvent[] {
    const now = new Date();
    const lowerTimeframe = timeframe.toLowerCase();

    let filterFn: (event: SportsDBEvent) => boolean;

    if (lowerTimeframe.includes("today")) {
        const todayStr = now.toISOString().split('T')[0];
        filterFn = (e) => e.dateEvent === todayStr;
    } else if (lowerTimeframe.includes("tomorrow")) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        filterFn = (e) => e.dateEvent === tomorrowStr;
    } else if (lowerTimeframe.includes("weekend") || lowerTimeframe.includes("this week")) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        filterFn = (e) => {
            const eventDate = new Date(e.dateEvent);
            return eventDate >= now && eventDate <= weekEnd;
        };
    } else if (lowerTimeframe.includes("next week")) {
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(nextWeekStart.getDate() + 7);
        const nextWeekEnd = new Date(now);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);
        filterFn = (e) => {
            const eventDate = new Date(e.dateEvent);
            return eventDate >= nextWeekStart && eventDate <= nextWeekEnd;
        };
    } else if (lowerTimeframe.includes("month") || lowerTimeframe.includes("all")) {
        const monthEnd = new Date(now);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        filterFn = (e) => {
            const eventDate = new Date(e.dateEvent);
            return eventDate >= now && eventDate <= monthEnd;
        };
    } else {
        // Check for "next X matches" pattern
        const matchCount = lowerTimeframe.match(/next\s+(\d+)/);
        if (matchCount) {
            const count = parseInt(matchCount[1]);
            return events.slice(0, count);
        }
        // Default: return all events within 30 days
        const defaultEnd = new Date(now);
        defaultEnd.setDate(defaultEnd.getDate() + 30);
        filterFn = (e) => {
            const eventDate = new Date(e.dateEvent);
            return eventDate >= now && eventDate <= defaultEnd;
        };
    }

    return events.filter(filterFn);
}

/**
 * Convert SportsDBEvent array to GeneratedBet array
 */
function convertEventsToGeneratedBets(
    events: SportsDBEvent[],
    type: "CHOICE" | "MATCH",
    outcomeType?: "WINNER" | "WINNER_DRAW"
): GeneratedBet[] {
    return events.map(event => {
        const bet: GeneratedBet = {
            question: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
            type,
            matchHome: event.strHomeTeam,
            matchAway: event.strAwayTeam,
            date: event.strTimestamp || `${event.dateEvent}T00:00:00.000Z`,
            verified: true,
            source: "TheSportsDB"
        };

        if (type === "CHOICE") {
            if (outcomeType === "WINNER") {
                bet.options = [event.strHomeTeam, event.strAwayTeam];
            } else {
                bet.options = [event.strHomeTeam, "Draw", event.strAwayTeam];
            }
        }

        return bet;
    });
}

// ============================================
// AUTO-RESOLVE (API Alternative to AI)
// ============================================

/**
 * Auto-resolve a bet using TheSportsDB API
 * This is the API alternative to the AI-based aiAutoResolveBet function
 */
export async function apiAutoResolveBet(bet: any): Promise<any | null> {
    console.log(`🏟️ [SportsDB API] Attempting to resolve bet: ${bet.question}`);

    const betType = bet.type?.toUpperCase();

    if (betType === "MATCH") {
        return resolveMatchBetWithAPI(bet);
    } else if (betType === "CHOICE") {
        return resolveChoiceBetWithAPI(bet);
    }

    // RANGE bets are not easily resolvable via sports API
    console.warn(`⚠️ [SportsDB API] Cannot resolve ${betType} bet type with API`);
    return null;
}

/**
 * Resolve a MATCH bet using the API
 */
async function resolveMatchBetWithAPI(bet: any): Promise<any | null> {
    const homeTeam = bet.matchDetails?.homeTeam;
    const awayTeam = bet.matchDetails?.awayTeam;

    // Parse event date
    let eventDate: Date | null = null;
    if (bet.eventDate) {
        if (bet.eventDate.toDate) {
            eventDate = bet.eventDate.toDate();
        } else if (typeof bet.eventDate === 'string') {
            eventDate = new Date(bet.eventDate);
        } else if (bet.eventDate.seconds) {
            eventDate = new Date(bet.eventDate.seconds * 1000);
        }
    }

    if (!homeTeam || !awayTeam || !eventDate) {
        console.warn(`⚠️ [SportsDB API] Missing match details for bet`);
        return null;
    }

    const result = await findGameResult(homeTeam, awayTeam, eventDate);

    if (result.found && result.homeScore !== null && result.awayScore !== null) {
        return {
            type: "MATCH",
            home: result.homeScore,
            away: result.awayScore,
            verification: {
                verified: true,
                source: "TheSportsDB API",
                verifiedAt: new Date().toISOString(),
                method: "API_LOOKUP",
                confidence: "high",
                actualResult: `${result.homeScore} - ${result.awayScore}`
            }
        };
    }

    console.log(`⚠️ [SportsDB API] Could not find result for: ${homeTeam} vs ${awayTeam}`);
    return null;
}

/**
 * Resolve a CHOICE bet using the API
 * For winner-based choice bets (1x2 or 2-way winner)
 */
async function resolveChoiceBetWithAPI(bet: any): Promise<any | null> {
    // Extract match info from question or matchDetails
    let homeTeam = bet.matchDetails?.homeTeam;
    let awayTeam = bet.matchDetails?.awayTeam;

    // Try to parse from question if not in matchDetails (e.g., "Team A vs Team B")
    if (!homeTeam || !awayTeam) {
        const vsMatch = bet.question?.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);
        if (vsMatch) {
            homeTeam = vsMatch[1].trim();
            awayTeam = vsMatch[2].trim();
        }
    }

    if (!homeTeam || !awayTeam) {
        console.warn(`⚠️ [SportsDB API] Cannot parse teams from bet: ${bet.question}`);
        return null;
    }

    // Parse event date
    let eventDate: Date | null = null;
    if (bet.eventDate) {
        if (bet.eventDate.toDate) {
            eventDate = bet.eventDate.toDate();
        } else if (typeof bet.eventDate === 'string') {
            eventDate = new Date(bet.eventDate);
        } else if (bet.eventDate.seconds) {
            eventDate = new Date(bet.eventDate.seconds * 1000);
        }
    }

    if (!eventDate) {
        console.warn(`⚠️ [SportsDB API] Missing event date for bet`);
        return null;
    }

    const result = await findGameResult(homeTeam, awayTeam, eventDate);

    if (result.found && result.homeScore !== null && result.awayScore !== null) {
        // Determine winner
        let winner: string;
        if (result.homeScore > result.awayScore) {
            winner = homeTeam;
        } else if (result.awayScore > result.homeScore) {
            winner = awayTeam;
        } else {
            winner = "Draw";
        }

        // Find matching option index
        const options = bet.options || [];
        let optionIndex = -1;

        for (let i = 0; i < options.length; i++) {
            const optionText = options[i].text || options[i];
            if (normalizeTeamName(optionText) === normalizeTeamName(winner) ||
                optionText.toLowerCase() === "draw" && winner === "Draw") {
                optionIndex = i;
                break;
            }
        }

        if (optionIndex === -1) {
            console.warn(`⚠️ [SportsDB API] Could not match winner "${winner}" to options`);
            return null;
        }

        return {
            type: "CHOICE",
            optionIndex,
            verification: {
                verified: true,
                source: "TheSportsDB API",
                verifiedAt: new Date().toISOString(),
                method: "API_LOOKUP",
                confidence: "high",
                actualResult: winner,
                score: `${result.homeScore} - ${result.awayScore}`
            }
        };
    }

    return null;
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

// ============================================
// SMART ROUTING: EVENT MATCHING
// ============================================

interface SportsDbMatchResult {
    found: boolean;
    eventId?: string;
    leagueId?: string;
    teamId?: string;
    eventName?: string;
}

/**
 * Try to find a matching SportsDB event for a bet
 * Used during bet creation to determine if API-based tracking is possible
 */
export async function findSportsDbEvent(
    homeTeam: string,
    awayTeam: string,
    eventDate: Date
): Promise<SportsDbMatchResult> {
    try {
        console.log(`🔍 [SportsDB] Finding event: ${homeTeam} vs ${awayTeam} on ${eventDate.toLocaleDateString()}`);

        // Find the home team first
        const homeTeamData = await findTeamByName(homeTeam);
        if (!homeTeamData) {
            console.log(`⚠️ [SportsDB] Could not find team: ${homeTeam}`);
            return { found: false };
        }

        console.log(`✅ [SportsDB] Found team: ${homeTeamData.strTeam} (ID: ${homeTeamData.idTeam})`);

        // Get upcoming events for this team
        const upcomingEvents = await getTeamNextEvents(homeTeamData.idTeam);
        const pastEvents = await getTeamPastEvents(homeTeamData.idTeam, 10);
        const allEvents = [...upcomingEvents, ...pastEvents];

        const targetDate = eventDate.toISOString().split('T')[0];

        for (const event of allEvents) {
            const eventDateStr = event.dateEvent;
            const isHomeMatch = normalizeTeamName(event.strHomeTeam) === normalizeTeamName(homeTeam);
            const isAwayMatch = normalizeTeamName(event.strAwayTeam) === normalizeTeamName(awayTeam);

            // Check within +/- 1 day tolerance
            const eventDateObj = new Date(eventDateStr);
            const dayDiff = Math.abs((eventDateObj.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
            const isWithinTolerance = dayDiff <= 1;

            if (isWithinTolerance && isHomeMatch && isAwayMatch) {
                console.log(`🎯 [SportsDB] Matched event: ${event.strEvent} (ID: ${event.idEvent})`);
                return {
                    found: true,
                    eventId: event.idEvent,
                    leagueId: event.idLeague,
                    teamId: homeTeamData.idTeam,
                    eventName: event.strEvent
                };
            }
        }

        console.log(`⚠️ [SportsDB] No matching event found`);
        return { found: false };

    } catch (error) {
        console.error("Error finding SportsDB event:", error);
        return { found: false };
    }
}

// ============================================
// LIVE SCORE TRACKING
// ============================================

interface LiveScoreResult {
    found: boolean;
    homeScore?: number;
    awayScore?: number;
    matchTime?: string;
    matchStatus?: "NOT_STARTED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED";
    eventId?: string;
}

/**
 * Get live score for a specific event by ID
 */
export async function getLiveScoreByEventId(eventId: string): Promise<LiveScoreResult> {
    try {
        const url = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_API_KEY}/lookupevent.php?id=${eventId}`;

        const response = await fetch(url);
        if (!response.ok) {
            return { found: false };
        }

        const data = await response.json();
        if (!data.events || data.events.length === 0) {
            return { found: false };
        }

        const event = data.events[0];
        const homeScore = event.intHomeScore ? parseInt(event.intHomeScore) : undefined;
        const awayScore = event.intAwayScore ? parseInt(event.intAwayScore) : undefined;

        // Determine match status
        let matchStatus: LiveScoreResult["matchStatus"] = "NOT_STARTED";
        const status = (event.strStatus || "").toLowerCase();

        if (status.includes("ft") || status.includes("finished") || status.includes("final")) {
            matchStatus = "FINISHED";
        } else if (status.includes("ht") || status.includes("halftime") || status.includes("half time")) {
            matchStatus = "HALFTIME";
        } else if (status.includes("live") || status.includes("'") || /^\d+$/.test(status)) {
            matchStatus = "LIVE";
        } else if (status.includes("postponed") || status.includes("cancelled")) {
            matchStatus = "POSTPONED";
        } else if (homeScore !== undefined || awayScore !== undefined) {
            // If we have scores but no clear status, assume it's live or finished
            matchStatus = homeScore !== undefined && awayScore !== undefined ? "LIVE" : "NOT_STARTED";
        }

        return {
            found: true,
            homeScore,
            awayScore,
            matchTime: event.strProgress || event.strStatus || "",
            matchStatus,
            eventId: event.idEvent
        };

    } catch (error) {
        console.error("Error fetching live score:", error);
        return { found: false };
    }
}

/**
 * Get live score by looking up team and matching event
 * Fallback when we don't have eventId stored
 */
export async function getLiveScoreByTeams(
    homeTeam: string,
    awayTeam: string,
    eventDate: Date
): Promise<LiveScoreResult> {
    try {
        // First find the team
        const homeTeamData = await findTeamByName(homeTeam);
        if (!homeTeamData) {
            return { found: false };
        }

        // Check past events (for finished games)
        const pastEvents = await getTeamPastEvents(homeTeamData.idTeam, 5);
        // Check upcoming/live events
        const upcomingEvents = await getTeamNextEvents(homeTeamData.idTeam, 5);

        const allEvents = [...pastEvents, ...upcomingEvents];
        const targetDate = eventDate.toISOString().split('T')[0];

        for (const event of allEvents) {
            const eventDateStr = event.dateEvent;
            const isHomeMatch = normalizeTeamName(event.strHomeTeam) === normalizeTeamName(homeTeam);
            const isAwayMatch = normalizeTeamName(event.strAwayTeam) === normalizeTeamName(awayTeam);

            const eventDateObj = new Date(eventDateStr);
            const dayDiff = Math.abs((eventDateObj.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
            const isWithinTolerance = dayDiff <= 1;

            if (isWithinTolerance && isHomeMatch && isAwayMatch) {
                // Found matching event, get its live score
                return await getLiveScoreByEventId(event.idEvent);
            }
        }

        return { found: false };

    } catch (error) {
        console.error("Error getting live score by teams:", error);
        return { found: false };
    }
}

/**
 * Batch get live scores for multiple events
 * More efficient for the cloud function updating many bets
 */
export async function batchGetLiveScores(
    bets: Array<{
        betId: string;
        sportsDbEventId?: string;
        homeTeam?: string;
        awayTeam?: string;
        eventDate?: Date;
    }>
): Promise<Map<string, LiveScoreResult>> {
    const results = new Map<string, LiveScoreResult>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks: typeof bets[] = [];

    for (let i = 0; i < bets.length; i += concurrencyLimit) {
        chunks.push(bets.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(async (bet) => {
            let result: LiveScoreResult;

            if (bet.sportsDbEventId) {
                // Fast path: direct event lookup
                result = await getLiveScoreByEventId(bet.sportsDbEventId);
            } else if (bet.homeTeam && bet.awayTeam && bet.eventDate) {
                // Slow path: search by team names
                result = await getLiveScoreByTeams(bet.homeTeam, bet.awayTeam, bet.eventDate);
            } else {
                result = { found: false };
            }

            results.set(bet.betId, result);
        });

        await Promise.all(promises);

        // Small delay between batches to respect rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    return results;
}
