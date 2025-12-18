
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
            prompt = `Determine the winner for: "${bet.question}". Options: ${bet.options?.map((o, i) => `${i}: ${o.text}`).join(", ")}. Return JSON: { "status": "FOUND", "optionIndex": number } or { "status": "UNKNOWN" }`;
        } else if (bet.type === "RANGE") {
            prompt = `Determine the value for: "${bet.question}". Return JSON: { "status": "FOUND", "value": number } or { "status": "UNKNOWN" }`;
        }

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(text);

        if (parsed.status === "FOUND") {
            return {
                type: bet.type,
                optionIndex: parsed.optionIndex,
                value: parsed.value,
                verification: {
                    verified: true,
                    source: "AI Knowledge",
                    verifiedAt: new Date().toISOString(),
                    method: "AI_REASONING"
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

            // Check Delay
            const eventDate = bet.eventDate?.toDate ? bet.eventDate.toDate() : new Date(bet.eventDate);
            if (!eventDate) continue;

            const delayMs = (bet.autoConfirmDelay || 120) * 60 * 1000; // Default 120 min
            if (now < eventDate.getTime() + delayMs) continue; // Too early

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
                        disputeDeadline.setHours(disputeDeadline.getHours() + 12);

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
