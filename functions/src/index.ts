
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

initializeApp();
const db = getFirestore();

// --- SECRETS ---
const googleApiKey = defineSecret("GOOGLE_API_KEY");

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
        { "status": "FOUND", "home": number, "away": number, "source": "string", "confidence": "high"|"medium"|"low" }
        OR
        { "status": "UNKNOWN" }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }] as any,
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(text);

        if (parsed.status === "FOUND") {
            return {
                type: "MATCH",
                home: parsed.home,
                away: parsed.away,
                verification: {
                    verified: true,
                    source: parsed.source || "AI Search",
                    verifiedAt: new Date().toISOString(),
                    method: "AI_GROUNDING",
                    confidence: parsed.confidence || "high"
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
                    confidence: parsed.confidence || "high"
                }
            };
        }
        return null;

    } catch (e) {
        logger.error("AI Generic Resolution Error", e);
        return null;
    }
}


// --- SCHEDULED FUNCTION ---

export const autoResolveBets = onSchedule(
    { schedule: "every 15 minutes", secrets: [googleApiKey] },
    async () => {
        const apiKey = googleApiKey.value();
        logger.info("Starting Auto-Resolution Job");

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
            // Optimization: Could cache this if processing many bets from same league, but for 15min interval fetching is acceptable.
            const leagueDoc = await db.collection("leagues").doc(leagueId).get();
            const leagueData = leagueDoc.data();
            const disputeWindowHours = leagueData?.disputeWindow || 12;

            // Check Delay
            const eventDate = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);
            if (!eventDate || isNaN(eventDate.getTime())) {
                logger.warn(`Skipping Bet ${doc.id} - Invalid Event Date: ${bet.eventDate}`);
                continue;
            }

            const delayMinutes = bet.autoConfirmDelay || 120;
            const delayMs = delayMinutes * 60 * 1000;
            const resolveTime = eventDate.getTime() + delayMs;

            if (now < resolveTime) {
                const waitMin = Math.ceil((resolveTime - now) / 60000);
                logger.info(`Skipping Bet ${doc.id} - Waiting for delay buffer. Game started: ${eventDate.toISOString()}, Delay: ${delayMinutes}m. Ready in ${waitMin} mins.`);
                continue;
            }

            // Resolve
            updates.push((async () => {
                logger.info(`Resolving Bet ${doc.id} (${bet.question})`);
                let result = null;

                if (bet.type === "MATCH") result = await resolveMatchWithAI(bet, apiKey);
                else result = await resolveGenericWithAI(bet, apiKey);

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
                        await activityRef.add({
                            timestamp: Timestamp.now(),
                            type: "AI_AUTO_RESOLVE",
                            actorId: "ai-scheduler",
                            actorName: "AI Auto-Resolver",
                            targetId: doc.id,
                            targetName: bet.question,
                            details: {
                                aiResult: outcome,
                                source: result.verification?.source || "AI",
                                confidence: result.verification?.confidence || "unknown",
                                method: result.verification?.method || "AI_GROUNDING"
                            },
                            message: `AI auto-resolved bet "${bet.question}" - Result: ${JSON.stringify(outcome)} (Source: ${result.verification?.source || 'AI'})`
                        });

                        logger.info(`✅ Bet ${doc.id} resolved successfully`);
                    }
                } else {
                    logger.info(`Skipping Bet ${doc.id} - AI returned unknown`);
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
export const lockBets = onSchedule("every 15 minutes", async () => {
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
