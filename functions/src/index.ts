
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { autoFinalizeBets } from "./auto-finalize";

initializeApp();
const db = getFirestore();

// --- SECRETS ---
const googleApiKey = defineSecret("GOOGLE_API_KEY");
const sportsDbApiKey = defineSecret("SPORTS_DB_API_KEY");

// --- SPORTSDB API ---
// V1 API (legacy, key in URL)
// V2 API (modern, key in headers) - for gradual migration
const SPORTS_DB_V2_URL = "https://www.thesportsdb.com/api/v2/json";
let SPORTS_DB_API_KEY = "3"; // Default free tier, will be set from secret in scheduled function

/**
 * Helper for V2 API calls with proper header authentication.
 */
async function sportsDbV2Fetch(endpoint: string): Promise<any> {
    const url = `${SPORTS_DB_V2_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: { 'X-API-KEY': SPORTS_DB_API_KEY }
    });
    if (!response.ok) {
        throw new Error(`SportsDB V2 error: ${response.status}`);
    }
    return response.json();
}

// --- TYPES ---
interface Bet {
    id: string;
    leagueId: string;
    question: string;
    type: "CHOICE" | "MATCH" | "RANGE";
    options?: { id: string, text: string }[];
    rangeMin?: number;
    rangeMax?: number;
    rangeUnit?: string;
    matchDetails?: { homeTeam: string, awayTeam: string, date?: string };
    eventDate: any; // Timestamp
    autoConfirm?: boolean;
    autoConfirmDelay?: number;
    status: string;
    // Smart Routing fields
    dataSource?: "API" | "AI";
    sportsDbEventId?: string;
    sportsDbLeagueId?: string;
    sportsDbTeamId?: string;
    liveScore?: {
        homeScore: number;
        awayScore: number;
        matchTime: string;
        matchStatus: "NOT_STARTED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED";
        lastUpdated: any;
    };
}

async function resolveMatchWithAI(bet: Bet, apiKey: string): Promise<any | null> {
    if (!apiKey) {
        logger.warn("No API Key configured for AI");
        return null;
    }

    const homeTeam = bet.matchDetails?.homeTeam;
    const awayTeam = bet.matchDetails?.awayTeam;
    const eventDate = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);

    if (!homeTeam || !awayTeam) return null;

    try {
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Search Google for the final score of this game:
        ${homeTeam} vs ${awayTeam}
        Date: ${formattedDate}

        If the game was played on a different date recently (within 24 hours), please provide that result instead.
        
        Return ONLY valid JSON:
        { 
            "status": "FOUND", 
            "home": number, 
            "away": number, 
            "source": "Site Name (e.g. ESPN, BBC)",
            "sourceUrl": "Direct URL to the report/score", 
            "confidence": "high"|"medium"|"low" 
        }
        OR
        { "status": "UNKNOWN" }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }] as any,
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        const parsed = JSON.parse(jsonString);

        if (parsed.status === "FOUND") {
            let finalSource = parsed.source;
            if ((!finalSource || finalSource.includes("AI")) && parsed.sourceUrl) {
                try {
                    const domain = new URL(parsed.sourceUrl).hostname.replace('www.', '');
                    finalSource = domain;
                } catch (e) {
                    finalSource = "Web Search";
                }
            }

            return {
                type: "MATCH",
                home: parsed.home,
                away: parsed.away,
                verification: {
                    verified: true,
                    source: finalSource || "AI Search",
                    url: parsed.sourceUrl || undefined,
                    verifiedAt: new Date().toISOString(),
                    method: "AI_GROUNDING",
                    confidence: parsed.confidence || "high",
                    actualResult: `${parsed.home} - ${parsed.away}` // Store the actual score
                }
            };
        }
        return null;

    } catch (e) {
        logger.error("AI Match Resolution Error", e);
        return null;
    }
}

async function resolveGenericWithAI(bet: Bet, apiKey: string): Promise<any | null> {
    if (!apiKey) return null;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";
        if (bet.type === "CHOICE") {
            const d = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);
            const dateStr = d.toISOString().split('T')[0];
            const yesterday = new Date(d);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterDateStr = yesterday.toISOString().split('T')[0];

            prompt = `
                Search for the result of the "${bet.question}" event.
                
                Target Date: ${dateStr}
                Possible Previous Date (Late Night Game): ${yesterDateStr}
                
                Search Queries to run:
                1. "${bet.question} score ${dateStr}"
                2. "${bet.question} score ${yesterDateStr}"
                
                Strict Rules for Result Selection:
                1. Look for a game/event that completely finished on ${dateStr} or ${yesterDateStr}.
                2. Match the TEAMS and the DATE.
                3. IGNORE games from previous weeks/months.
                
                Options: ${bet.options?.map((o, i) => `${i}: ${o.text}`).join(", ")}
                
                Return ONLY valid JSON:
                { 
                    "status": "FOUND", 
                    "optionIndex": number,
                    "source": "Site Name (e.g. NBA.com)",
                    "sourceUrl": "Direct URL",
                    "confidence": "high"|"medium"|"low" 
                }
                OR
                { "status": "UNKNOWN" }
            `;
        } else if (bet.type === "RANGE") {
            const d = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);
            const dateStr = d.toISOString().split('T')[0];
            const yesterday = new Date(d);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterDateStr = yesterday.toISOString().split('T')[0];

            // --- STATISTICAL / RANGE PROMPT IMPROVEMENT ---
            const isPlayerStat = bet.question.toLowerCase().match(/(goals|passes|tackles|shots|assists|points|rebounds|steals|yards|touchdowns)/);

            prompt = `
                Search for the official statistics/result for this question:
                "${bet.question}"
                
                Target Date: ${dateStr} (or late night ${yesterDateStr})
                
                Search Strategy:
                ${isPlayerStat ? `
                1. Search for "box score ${bet.question} ${dateStr}"
                2. Search for "player stats ${bet.question} ${dateStr}"
                3. Look for official post-match statistical summaries.
                ` : `
                1. "${bet.question} result ${dateStr}"
                2. "${bet.question} result ${yesterDateStr}"
                `}
                
                Strict Rules:
                1. Verify the date matches ${dateStr} or ${yesterDateStr}.
                2. IGNORE stats from season averages or previous games.
                3. For "passes", "tackles", or specific player stats, look for deep box score data on sites like Whoscored, Sofascore, ESPN, or official league sites.
                
                Return ONLY valid JSON:
                { 
                    "status": "FOUND", 
                    "value": number,
                    "source": "Site Name",
                    "sourceUrl": "Direct URL",
                    "confidence": "high"|"medium"|"low" 
                }
                OR
                { "status": "UNKNOWN" }
            `;
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }] as any,
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        // Find the JSON block first
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;

        const parsed = JSON.parse(jsonString);

        if (parsed.status === "FOUND") {
            // For CHOICE bets, get the actual answer text if available
            let actualResult = parsed.value !== undefined ? String(parsed.value) : undefined;
            if (bet.type === "CHOICE" && bet.options && parsed.optionIndex !== undefined) {
                const selectedOption = bet.options[parsed.optionIndex];
                actualResult = selectedOption?.text || actualResult;
            }

            return {
                type: bet.type,
                optionIndex: parsed.optionIndex,
                value: parsed.value,
                verification: {
                    verified: true,
                    source: parsed.source || "AI Grounding (Auto)",
                    url: parsed.sourceUrl || undefined,
                    verifiedAt: new Date().toISOString(),
                    method: "AI_GROUNDING",
                    confidence: parsed.confidence || "high",
                    actualResult: actualResult, // Store the actual answer
                    actualValue: parsed.value // Store the raw numerical value if applicable
                }
            };
        }
        return null;

    } catch (e) {
        logger.error("AI Generic Resolution Error", e);
        return null;
    }
}

// ============================================
// API-BASED RESOLUTION (TheSportsDB)
// ============================================

function normalizeTeamName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, '')
        .replace(/'/g, '')
        .trim();
}

async function findTeamByName(teamName: string): Promise<any | null> {
    try {
        // V2: /search/team/{name} with underscores for spaces
        const encodedTeam = teamName.toLowerCase().replace(/\s+/g, '_');
        const data = await sportsDbV2Fetch(`/search/team/${encodedTeam}`);

        if (data.teams && data.teams.length > 0) {
            return data.teams[0];
        }
        return null;
    } catch (error) {
        logger.error("Error searching for team:", error);
        return null;
    }
}

async function getTeamPastEvents(teamId: string): Promise<any[]> {
    try {
        // V2: /schedule/previous/team/{id}
        const data = await sportsDbV2Fetch(`/schedule/previous/team/${teamId}`);
        return data.schedule || data.results || [];
    } catch (error) {
        logger.error("Error fetching team events:", error);
        return [];
    }
}

async function getEventById(eventId: string): Promise<any | null> {
    try {
        // V2: /lookup/event/{id}
        const data = await sportsDbV2Fetch(`/lookup/event/${eventId}`);

        if (data.events && Array.isArray(data.events) && data.events.length > 0) return data.events[0];
        if (data.lookup && Array.isArray(data.lookup) && data.lookup.length > 0) return data.lookup[0];
        if (data.event) return data.event;
        if (data.idEvent) return data;

        return null;
    } catch (error) {
        logger.error(`Error looking up event ${eventId}:`, error);
        return null;
    }
}

async function resolveMatchWithAPI(bet: Bet): Promise<any | null> {
    const homeTeam = bet.matchDetails?.homeTeam;
    const awayTeam = bet.matchDetails?.awayTeam;
    const eventDate = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);

    // 1. PRIORITIZE ID LOOKUP
    if (bet.sportsDbEventId) {
        logger.info(`🏟️ [SportsDB API] resolving via ID: ${bet.sportsDbEventId}`);
        const event = await getEventById(bet.sportsDbEventId);
        if (event) {
            const parseScore = (val: any) => {
                if (val === null || val === undefined || val === "") return null;
                return parseInt(String(val));
            };

            const homeScore = parseScore(event.intHomeScore) ?? parseScore(event.homeScore) ?? parseScore(event.strHomeScore);
            const awayScore = parseScore(event.intAwayScore) ?? parseScore(event.awayScore) ?? parseScore(event.strAwayScore);

            if (homeScore !== null && awayScore !== null) {
                logger.info(`✅ [SportsDB API] Found score via ID: ${homeScore} - ${awayScore}`);
                return {
                    type: "MATCH",
                    home: homeScore,
                    away: awayScore,
                    verification: {
                        verified: true,
                        source: "TheSportsDB API",
                        verifiedAt: new Date().toISOString(),
                        method: "API_LOOKUP",
                        confidence: "high",
                        actualResult: `${homeScore} - ${awayScore}`
                    }
                };
            } else {
                logger.warn(`⚠️ [SportsDB API] Event ${bet.sportsDbEventId} found but no scores yet.`);
            }
        }
    }

    if (!homeTeam || !awayTeam) return null;

    logger.info(`🏟️ [SportsDB API] fallback to Search Name: ${homeTeam} vs ${awayTeam}`);

    try {
        // Find home team
        // Find home team
        const homeTeamData = await findTeamByName(homeTeam);
        if (!homeTeamData) {
            logger.warn(`Could not find team: ${homeTeam}`);
            return null;
        }

        // Get past events
        const events = await getTeamPastEvents(homeTeamData.idTeam);

        // Find matching game
        const targetDate = eventDate.toISOString().split('T')[0];

        for (const event of events) {
            const eventDateStr = event.dateEvent;
            const isDateMatch = eventDateStr === targetDate;
            const isHomeMatch = normalizeTeamName(event.strHomeTeam) === normalizeTeamName(homeTeam);
            const isAwayMatch = normalizeTeamName(event.strAwayTeam) === normalizeTeamName(awayTeam);

            // Check within +/- 1 day tolerance
            const eventDateObj = new Date(eventDateStr);
            const dayDiff = Math.abs((eventDateObj.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
            const isWithinTolerance = dayDiff <= 1;

            if ((isDateMatch || isWithinTolerance) && isHomeMatch && isAwayMatch) {
                const homeScore = event.intHomeScore ? parseInt(event.intHomeScore) : null;
                const awayScore = event.intAwayScore ? parseInt(event.intAwayScore) : null;

                if (homeScore !== null && awayScore !== null) {
                    logger.info(`✅ [SportsDB API] Found score: ${homeScore} - ${awayScore}`);
                    return {
                        type: "MATCH",
                        home: homeScore,
                        away: awayScore,
                        verification: {
                            verified: true,
                            source: "TheSportsDB API",
                            verifiedAt: new Date().toISOString(),
                            method: "API_LOOKUP",
                            confidence: "high",
                            actualResult: `${homeScore} - ${awayScore}`
                        }
                    };
                }
            }
        }

        return null;
    } catch (error) {
        logger.error("API Match Resolution Error", error);
        return null;
    }
}

async function resolveChoiceWithAPI(bet: Bet): Promise<any | null> {
    // Extract match info
    let homeTeam = bet.matchDetails?.homeTeam;
    let awayTeam = bet.matchDetails?.awayTeam;

    // Try parsing from question
    if (!homeTeam || !awayTeam) {
        const vsMatch = bet.question?.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);
        if (vsMatch) {
            homeTeam = vsMatch[1].trim();
            awayTeam = vsMatch[2].trim();
        }
    }

    if (!homeTeam || !awayTeam) return null;

    // Find the game result first (the bet already has eventDate)
    const matchResult = await resolveMatchWithAPI({
        ...bet,
        matchDetails: { homeTeam, awayTeam }
    } as Bet);

    if (matchResult && matchResult.home !== undefined && matchResult.away !== undefined) {
        // Determine winner
        let winner: string;
        if (matchResult.home > matchResult.away) {
            winner = homeTeam;
        } else if (matchResult.away > matchResult.home) {
            winner = awayTeam;
        } else {
            winner = "Draw";
        }

        // Find matching option index
        const options = bet.options || [];
        let optionIndex = -1;

        for (let i = 0; i < options.length; i++) {
            const optionText = options[i].text || options[i];
            if (normalizeTeamName(String(optionText)) === normalizeTeamName(winner) ||
                String(optionText).toLowerCase() === "draw" && winner === "Draw") {
                optionIndex = i;
                break;
            }
        }

        if (optionIndex !== -1) {
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
                    score: `${matchResult.home} - ${matchResult.away}`
                }
            };
        }
    }

    return null;
}

// --- SCHEDULED FUNCTION ---

export const autoResolveBets = onSchedule(
    { schedule: "every 15 minutes", secrets: [googleApiKey, sportsDbApiKey] },
    async () => {
        const apiKey = googleApiKey.value();

        // Set the SportsDB API key from secret
        SPORTS_DB_API_KEY = sportsDbApiKey.value() || "3";
        logger.info(`SportsDB API Key configured: ${SPORTS_DB_API_KEY ? "Premium" : "Free tier"}`);

        logger.info("Starting Auto-Resolution Job (Smart Routing enabled)");

        const now = Date.now();

        // Query Pending Bets
        const betsSnapshot = await db.collectionGroup("bets")
            .where("autoConfirm", "==", true)
            .where("status", "in", ["OPEN", "LOCKED"])
            .get();

        logger.info(`Found ${betsSnapshot.size} potential bets`);

        const updates: Promise<any>[] = [];

        for (const doc of betsSnapshot.docs) {
            const bet = doc.data() as Bet;
            const leagueId = doc.ref.parent.parent?.id;

            if (!leagueId) continue;

            // Fetch League Settings to respect custom Dispute Window
            const leagueDoc = await db.collection("leagues").doc(leagueId).get();
            const leagueData = leagueDoc.data();
            const disputeWindowHours = leagueData?.disputeWindowHours || 12;

            // Check Delay
            const eventDate = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);
            if (!eventDate || isNaN(eventDate.getTime())) {
                logger.warn(`Skipping Bet ${doc.id} - Invalid Event Date: ${bet.eventDate}`);
                continue;
            }

            // SMART ROUTING: Determine resolution approach based on per-bet dataSource
            const betDataSource = bet.dataSource || "AI"; // Default to AI if not set

            // For API bets: Check if game is FINISHED (from liveScore), no delay needed
            // For AI bets: Use the traditional delay buffer
            if (betDataSource === "API") {
                const hoursSinceStart = (now - eventDate.getTime()) / (1000 * 60 * 60);

                // API mode:
                // 1. If Live Score says FINISHED -> Resolve immediately
                // 2. If > 5 hours since start (missed live window) -> Attempt force resolution
                const isFinished = bet.liveScore?.matchStatus === "FINISHED";
                const isStale = hoursSinceStart > 5;

                if (!isFinished && !isStale) {
                    logger.info(`Skipping API Bet ${doc.id} - Game not finished yet and within 5h window (Status: ${bet.liveScore?.matchStatus || "NO_DATA"})`);
                    continue;
                }
                logger.info(`✅ API Bet ${doc.id} - Ready for resolution (Finished: ${isFinished}, Stale: ${isStale})`);
            } else {
                // AI mode: Use traditional delay buffer
                const delayMinutes = bet.autoConfirmDelay || 120;
                const delayMs = delayMinutes * 60 * 1000;
                const resolveTime = eventDate.getTime() + delayMs;

                if (now < resolveTime) {
                    const waitMin = Math.ceil((resolveTime - now) / 60000);
                    logger.info(`Skipping AI Bet ${doc.id} - Waiting for delay buffer. Game started: ${eventDate.toISOString()}, Delay: ${delayMinutes}m. Ready in ${waitMin} mins.`);
                    continue;
                }
            }

            // Resolve
            updates.push((async () => {
                logger.info(`Resolving Bet ${doc.id} (${bet.question}) using ${betDataSource} mode`);
                let result = null;

                // SMART ROUTING: Use per-bet dataSource instead of global mode
                if (betDataSource === "API" && bet.sportsDbEventId) {
                    logger.info(`🏟️ [API Mode] Attempting API resolution for bet ${doc.id}`);

                    // If we have liveScore with FINISHED status, we can use that directly!
                    if (bet.liveScore && bet.liveScore.matchStatus === "FINISHED") {
                        logger.info(`📊 Using cached liveScore data for resolution`);

                        const homeScore = bet.liveScore.homeScore;
                        const awayScore = bet.liveScore.awayScore;

                        if (bet.type === "MATCH") {
                            // For MATCH bets, return home/away scores directly
                            result = {
                                type: "MATCH",
                                home: homeScore,
                                away: awayScore,
                                verification: {
                                    verified: true,
                                    source: "TheSportsDB API",
                                    verifiedAt: new Date().toISOString(),
                                    method: "API_LOOKUP",
                                    confidence: "high",
                                    actualResult: `${homeScore} - ${awayScore}`
                                }
                            };
                        } else if (bet.type === "CHOICE" && bet.options) {
                            // For CHOICE bets (1x2), determine winner and find matching option
                            let winner: string;

                            // Get team names from matchDetails or parse from question
                            let homeTeam = bet.matchDetails?.homeTeam;
                            let awayTeam = bet.matchDetails?.awayTeam;

                            if (!homeTeam || !awayTeam) {
                                // Try parsing from question
                                const vsMatch = bet.question?.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);
                                if (vsMatch) {
                                    homeTeam = vsMatch[1].trim();
                                    awayTeam = vsMatch[2].trim();
                                }
                            }

                            if (homeScore > awayScore) {
                                winner = homeTeam || "Home";
                            } else if (awayScore > homeScore) {
                                winner = awayTeam || "Away";
                            } else {
                                winner = "Draw";
                            }

                            // Find matching option index
                            let optionIndex = -1;
                            for (let i = 0; i < bet.options.length; i++) {
                                const optionText = String(bet.options[i].text || bet.options[i]).toLowerCase();
                                const winnerLower = winner.toLowerCase();

                                // Check for draw/tie
                                if ((optionText === "draw" || optionText === "tie" || optionText === "x" || optionText === "unentschieden") && winner === "Draw") {
                                    optionIndex = i;
                                    break;
                                }
                                // Check for team name match
                                if (normalizeTeamName(optionText) === normalizeTeamName(winnerLower) ||
                                    optionText.includes(normalizeTeamName(winnerLower)) ||
                                    normalizeTeamName(winnerLower).includes(optionText)) {
                                    optionIndex = i;
                                    break;
                                }
                            }

                            if (optionIndex !== -1) {
                                result = {
                                    type: "CHOICE",
                                    optionIndex,
                                    verification: {
                                        verified: true,
                                        source: "TheSportsDB API",
                                        verifiedAt: new Date().toISOString(),
                                        method: "API_LOOKUP",
                                        confidence: "high",
                                        actualResult: winner,
                                        score: `${homeScore} - ${awayScore}`
                                    }
                                };
                                logger.info(`✅ CHOICE bet resolved: Winner = ${winner} (option ${optionIndex})`);
                            } else {
                                logger.warn(`⚠️ Could not match winner "${winner}" to any option`);
                            }
                        }
                    } else {
                        // Fallback: Query API directly
                        if (bet.type === "MATCH") {
                            result = await resolveMatchWithAPI(bet);
                        } else if (bet.type === "CHOICE") {
                            result = await resolveChoiceWithAPI(bet);
                        }
                    }

                    if (!result) {
                        logger.warn(`⚠️ [API Mode] Could not resolve bet ${doc.id}, falling back to AI...`);
                    }
                }

                // Use AI if dataSource is AI or if API mode failed
                if (!result) {
                    logger.info(`🤖 [AI Mode] Using AI resolution for bet ${doc.id}`);
                    if (bet.type === "MATCH") {
                        result = await resolveMatchWithAI(bet, apiKey);
                    } else {
                        result = await resolveGenericWithAI(bet, apiKey);
                    }
                }

                if (result) {
                    let outcome: any;
                    if (result.type === "MATCH") outcome = { home: result.home, away: result.away };
                    else if (result.type === "CHOICE") outcome = String(result.optionIndex);
                    else if (result.type === "RANGE") outcome = result.value;

                    if (outcome !== undefined) {
                        const disputeDeadline = new Date();
                        disputeDeadline.setHours(disputeDeadline.getHours() + disputeWindowHours);

                        await doc.ref.update({
                            status: "PROOFING",
                            winningOutcome: outcome,
                            verification: result.verification,
                            disputeDeadline: Timestamp.fromDate(disputeDeadline),
                            disputeActive: false,
                            pendingResolvedBy: "auto-scheduler",
                            lastUpdatedBy: "firebase-scheduler"
                        });

                        // Log activity to the league's activity log
                        const activityRef = db.collection("leagues").doc(leagueId).collection("activityLog");
                        const sourceType = betDataSource === "API" && result.verification?.method === "API_LOOKUP" ? "API" : "AI";
                        await activityRef.add({
                            timestamp: Timestamp.now(),
                            type: betDataSource === "API" ? "API_AUTO_RESOLVE" : "AI_AUTO_RESOLVE",
                            actorId: betDataSource === "API" ? "api-scheduler" : "ai-scheduler",
                            actorName: betDataSource === "API" ? "TheSportsDB Auto-Resolver" : "AI Auto-Resolver",
                            targetId: doc.id,
                            targetName: bet.question,
                            details: {
                                aiResult: outcome,
                                source: result.verification?.source || sourceType,
                                confidence: result.verification?.confidence || "unknown",
                                method: result.verification?.method || (betDataSource === "API" ? "API_LOOKUP" : "AI_GROUNDING"),
                                dataSource: betDataSource
                            },
                            message: `${sourceType} auto-resolved bet "${bet.question}" - Result: ${JSON.stringify(outcome)} (Source: ${result.verification?.source || sourceType})`
                        });

                        logger.info(`✅ Bet ${doc.id} resolved successfully via ${result.verification?.method || betDataSource}`);
                    }
                } else {
                    logger.info(`Skipping Bet ${doc.id} - Could not resolve with ${betDataSource} mode`);
                }
            })());
        }

        await Promise.all(updates);
        logger.info("Job Complete");
    });

/**
 * Scheduled job to lock bets that have passed their closing time.
 * Runs every 15 minutes.
 */
export const lockBets = onSchedule("every 1 minutes", async () => {
    logger.info("Starting Bet Locking Job");
    const now = Timestamp.now();

    // Note: This query might require a composite index on (status, closesAt)
    // If it fails, check logs for the index creation link.
    const snapshot = await db.collectionGroup("bets")
        .where("status", "==", "OPEN")
        .where("closesAt", "<", now)
        .get();

    if (snapshot.empty) {
        logger.info("No bets to lock.");
        return;
    }

    logger.info(`Found ${snapshot.size} expired bets to lock.`);

    const batch = db.batch();
    let counter = 0;

    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            status: "LOCKED",
            lastUpdatedBy: "lock-scheduler"
        });
        counter++;
    });

    await batch.commit();
    logger.info(`Successfully locked ${counter} bets.`);
});

// ============================================
// LIVE SCORE UPDATES (Every 2 minutes)
// ============================================

/**
 * Get live score for an event by ID from TheSportsDB
 */
async function getLiveScoreByEventId(eventId: string): Promise<{
    found: boolean;
    homeScore?: number;
    awayScore?: number;
    matchTime?: string;
    matchStatus?: "NOT_STARTED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED";
}> {
    try {
        // V2: /lookup/event/{id}
        const data = await sportsDbV2Fetch(`/lookup/event/${eventId}`);

        // DEBUG: Log the full response to debug V2 migration issues
        logger.info(`🔍 [API V2] Lookup for ${eventId} returned keys: ${Object.keys(data).join(', ')}`);
        logger.info(`🔍 [API V2] Raw Response: ${JSON.stringify(data).substring(0, 500)}`);

        let event: any = null;
        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
            event = data.events[0];
        } else if (data.lookup && Array.isArray(data.lookup) && data.lookup.length > 0) {
            // V2 Format often returns "lookup" array
            event = data.lookup[0];
        } else if (data.event) {
            event = data.event;
        } else if (data.idEvent) {
            event = data;
        }

        if (!event) {
            logger.warn(`⚠️ [API V2] Could not resolve 'event' object from response for ${eventId}`);
            return { found: false };
        }

        // Parse scores (Handle V1 'intHomeScore' and V2 'homeScore'/'intHomeScore')
        const parseScore = (val: any) => {
            if (val === null || val === undefined || val === "") return undefined;
            return parseInt(String(val));
        };

        const homeScore = parseScore(event.intHomeScore) ?? parseScore(event.homeScore) ?? parseScore(event.strHomeScore);
        const awayScore = parseScore(event.intAwayScore) ?? parseScore(event.awayScore) ?? parseScore(event.strAwayScore);

        // Determine match status
        let matchStatus: "NOT_STARTED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED" = "NOT_STARTED";
        const status = String(event.strStatus || event.status || "").toLowerCase();

        // 1. FINISHED
        if (status.includes("ft") || status.includes("finished") || status.includes("final") || status.includes("aet")) {
            matchStatus = "FINISHED";
        }
        // 2. HALFTIME
        else if (status.includes("ht") || status.includes("halftime") || status.includes("half time") || status.includes("break")) {
            matchStatus = "HALFTIME";
        }
        // 3. LIVE (Expanded Logic)
        else if (
            status.includes("live") ||
            status.includes("'") ||
            /^\d+$/.test(status) ||           // "35"
            /\d+h/.test(status) ||            // "1H", "2H"
            /\d+(st|nd|rd|th)/.test(status) || // "1st", "2nd"
            status.includes("q") ||           // "Q1", "4th Q"
            status.includes("period") ||
            status.includes("inning")
        ) {
            matchStatus = "LIVE";
        }
        // 4. POSTPONED
        else if (status.includes("postponed") || status.includes("cancelled") || status.includes("abandoned")) {
            matchStatus = "POSTPONED";
        }
        // 5. NOT STARTED (Explicit)
        else if (status.match(/^\d{1,2}:\d{2}$/) || status === "ns" || status.includes("not started")) {
            matchStatus = "NOT_STARTED";
        }
        // 6. FALLBACK: Scores exist -> Assume LIVE (Safer than FINISHED)
        else if (homeScore !== undefined && awayScore !== undefined) {
            matchStatus = "LIVE";
        }

        return {
            found: true,
            homeScore,
            awayScore,
            matchTime: event.strProgress || event.strStatus || "",
            matchStatus
        };

    } catch (error) {
        logger.error("Error fetching live score:", error);
        return { found: false };
    }
}

/**
 * Scheduled job to update live scores for all active bets with API data source.
 * Runs every 2 minutes for real-time updates.
 */
export const updateLiveScores = onSchedule(
    { schedule: "every 2 minutes", secrets: [sportsDbApiKey] },
    async () => {
        // Set the SportsDB API key from secret
        SPORTS_DB_API_KEY = sportsDbApiKey.value() || "3";

        logger.info("🔴 Starting Live Score Update Job");

        const now = Date.now();
        const fourHoursAgo = now - (4 * 60 * 60 * 1000);
        const fourHoursFromNow = now + (4 * 60 * 60 * 1000);

        // Query bets that:
        // 1. Have dataSource === "API" (linked to SportsDB)
        // 2. Are LOCKED status (game in progress)
        // 3. Have an eventDate within the live window (+/- 4 hours)
        const betsSnapshot = await db.collectionGroup("bets")
            .where("dataSource", "==", "API")
            .where("status", "==", "LOCKED")
            .get();

        if (betsSnapshot.empty) {
            logger.info("No API-linked locked bets to update.");
            return;
        }

        // Filter by event date window
        const eligibleBets = betsSnapshot.docs.filter(doc => {
            const bet = doc.data();
            if (!bet.eventDate) return false;

            const eventTime = bet.eventDate.toDate ? bet.eventDate.toDate().getTime() : new Date(bet.eventDate).getTime();

            // Check if event is within the live window
            return eventTime >= fourHoursAgo && eventTime <= fourHoursFromNow;
        });

        logger.info(`Found ${eligibleBets.length} bets to update live scores`);

        let updatedCount = 0;
        let finishedCount = 0;

        // Process bets in batches
        const batchSize = 10;
        for (let i = 0; i < eligibleBets.length; i += batchSize) {
            const chunk = eligibleBets.slice(i, i + batchSize);
            const batch = db.batch();

            for (const betDoc of chunk) {
                const bet = betDoc.data();
                const eventId = bet.sportsDbEventId;

                if (!eventId) {
                    logger.warn(`Bet ${betDoc.id} has dataSource: API but no sportsDbEventId`);
                    continue;
                }

                try {
                    const liveScore = await getLiveScoreByEventId(eventId);

                    if (liveScore.found) {
                        // Update the bet with live score
                        batch.update(betDoc.ref, {
                            liveScore: {
                                homeScore: liveScore.homeScore ?? 0,
                                awayScore: liveScore.awayScore ?? 0,
                                matchTime: liveScore.matchTime || "",
                                matchStatus: liveScore.matchStatus || "NOT_STARTED",
                                lastUpdated: Timestamp.now()
                            }
                        });

                        updatedCount++;
                        logger.info(`✅ Updated ${bet.question}: ${liveScore.homeScore} - ${liveScore.awayScore} (${liveScore.matchStatus})`);

                        // If game is finished, it will be auto-resolved by autoResolveBets function
                        if (liveScore.matchStatus === "FINISHED") {
                            finishedCount++;
                            logger.info(`🏁 Game finished: ${bet.question}`);
                        }
                    }

                } catch (error) {
                    logger.error(`Error updating live score for bet ${betDoc.id}:`, error);
                }
            }

            await batch.commit();

            // Small delay between batches to respect rate limits
            if (i + batchSize < eligibleBets.length) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        logger.info(`🔴 Live Score Update Complete: ${updatedCount} updated, ${finishedCount} finished`);
    }
);

export { autoFinalizeBets };
