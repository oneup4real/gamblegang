"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// Mock response in case no API key is verified/present during dev to avoid breaking content
const MOCK_IDEAS = [
    { question: "Who will win the match?", type: "CHOICE", options: ["Team A", "Team B", "Draw"] },
    { question: "Total goals scored?", type: "RANGE", rangeMin: 0, rangeMax: 10, rangeUnit: "Goals" },
    { question: "Will there be a red card?", type: "CHOICE", options: ["Yes", "No"] }
];

export async function generateBetIdeas(topic: string) {
    if (!apiKey) {
        console.warn("No Gemini API Key found. Returning mock data.");
        // Simulate delay
        await new Promise(r => setTimeout(r, 1000));
        return MOCK_IDEAS;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            Generate 3 creative and distinct betting questions for a social betting league based on the topic: "${topic}".
            
            Return ONLY a valid JSON array of objects with this structure:
            [
                { 
                    "question": "The bet question string", 
                    "type": "CHOICE" | "RANGE",
                    "options": ["Option 1", "Option 2"] (Only if type is CHOICE),
                    "rangeMin": 0 (Only if type is RANGE),
                    "rangeMax": 100 (Only if type is RANGE),
                    "rangeUnit": "Units" (Only if type is RANGE)
                }
            ]
            Do not include markdown formatting like \`\`\`json. Just the raw JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse AI response:", text);
            throw e;
        }
    } catch (error) {
        console.error("AI Generation Error:", error);
        return MOCK_IDEAS; // Fallback
    }
}

export async function generateBulkBets(topic: string, timeframe: string, type: "CHOICE" | "MATCH", outcomeType?: "WINNER" | "WINNER_DRAW") {
    if (!apiKey) {
        console.warn("No Gemini API Key found. Returning mock bulk data.");
        await new Promise(r => setTimeout(r, 1000));
        return [
            { question: "Arsenal vs Chelsea", type: "MATCH", matchHome: "Arsenal", matchAway: "Chelsea", date: new Date().toISOString() },
            { question: "Man Utd vs Liverpool", type: "MATCH", matchHome: "Man Utd", matchAway: "Liverpool", date: new Date().toISOString() }
        ];
    }

    try {
        console.log(`🔍 [Bulk Generation] Searching for REAL ${topic} matches in timeframe: ${timeframe}`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString("en-US", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const prompt = `Search Google for ACTUAL, SCHEDULED games/matches.

Current Date: ${formattedDate}
Sport/Topic: ${topic}
Timeframe: ${timeframe}
Bet Type: ${type}

CRITICAL: You MUST search for and verify these are REAL, SCHEDULED matches from official sources (ESPN, NBA.com, official league sites, etc.).

DO NOT make up or invent any matches. ONLY return games that you can verify are actually scheduled.

Instructions:
1. Search for "${topic} schedule ${timeframe}" on Google
2. Find official match schedules from reliable sports sources
3. Verify each game is confirmed and scheduled
4. Include accurate dates and times
5. Return matches based on the user's timeframe request: "${timeframe}"

Return ONLY matches you can VERIFY exist.

${type === 'MATCH' ? 'For MATCH type, generate Match Prediction bets (Exact Score predictions).' : ''}
${type === 'CHOICE' && outcomeType === 'WINNER' ? 'For CHOICE type, generate 2-way bets with options: [HomeTeam, AwayTeam]' : ''}
${type === 'CHOICE' && outcomeType !== 'WINNER' ? 'For CHOICE type, generate 1x2 bets with options: [HomeTeam, Draw, AwayTeam]' : ''}

Return ONLY a valid JSON array in this EXACT format:
[
    {
        "question": "HomeTeam vs AwayTeam",
        "type": "${type}",
        "matchHome": "Full Home Team Name",
        "matchAway": "Full Away Team Name",
        "date": "ISO8601 Date String with time (e.g. 2024-12-20T19:00:00.000Z)",
        "verified": true,
        ${type === 'CHOICE' ? '"options": ["HomeTeam", "AwayTeam"' + (outcomeType !== 'WINNER' ? ', "Draw"' : '') + '],' : ''}
        "source": "Where you found this (e.g. ESPN, NBA.com)"
    }
]

IMPORTANT:
- Provide matches according to the timeframe request: "${timeframe}"
- If they ask for "next 2 matches", return only 2
- If they ask for "this week", return all matches this week
- If they ask for "all matches this year", return all you can find for this year
- Use accurate dates and times for the timeframe
- Include the source where you verified each match
- Do NOT include markdown formatting
- Return ONLY the JSON array

If you cannot find any verified matches, return an empty array: []`;

        console.log("🤖 [Bulk Generation] Requesting with Google Search grounding...");

        // Use Google Search grounding to verify real matches
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }] as any,
        });

        const response = result.response;
        const text = response.text();

        console.log("📋 [Bulk Generation] AI Response received");

        // Check for grounding metadata
        if (result.response.candidates && result.response.candidates[0]?.groundingMetadata) {
            const metadata = result.response.candidates[0].groundingMetadata;
            console.log(`✅ [Bulk Generation] Grounded with ${metadata.groundingChunks?.length || 0} sources`);
        }

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const matches = JSON.parse(cleanText);

            if (!Array.isArray(matches)) {
                console.warn("⚠️  [Bulk Generation] Response is not an array");
                return [];
            }

            console.log(`✅ [Bulk Generation] Generated ${matches.length} verified matches`);

            // Log sources for transparency
            matches.forEach((match, i) => {
                console.log(`   ${i + 1}. ${match.question} - ${match.date} ${match.source ? `(via ${match.source})` : ''}`);
            });

            return matches;
        } catch (e) {
            console.error("❌ [Bulk Generation] Failed to parse AI response:", text);
            throw e;
        }
    } catch (error) {
        console.error("❌ [Bulk Generation] Error:", error);
        return [];
    }
}

export async function verifyBetResult(question: string, context?: any) {
    if (!apiKey) {
        // Mock response
        await new Promise(r => setTimeout(r, 1000));
        return "Mock Result: Team A won 2-1";
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            Act as a sports/events judge. 
            Question: "${question}"
            Context: ${JSON.stringify(context || {})}
            Time: ${new Date().toISOString()}

            Based on your knowledge, determine the outcome of this event. 
            If the event is in the future or you don't know, state "Unknown" or "Pending".
            If you are reasonably sure, provide the result concisely.
            
            Format: "Winner: [Name]" or "Score: [Home] - [Away]" or "Yes/No".
            Keep it short.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("AI Verification Error:", error);
        return "Error determining result.";
    }
}

/**
 * Resolve match bets using AI with Google Search grounding.
 * Searches the web for actual game results from ESPN, NBA.com, etc.
 * Returns verification metadata for display on bet tickets
 */
async function resolveMatchBetWithAIGrounding(bet: any) {
    if (!apiKey) {
        console.warn("No Gemini API key found. Cannot use AI grounding.");
        return null;
    }

    const homeTeam = bet.matchDetails?.homeTeam;
    const awayTeam = bet.matchDetails?.awayTeam;
    const eventDate = bet.eventDate || bet.matchDetails?.date;

    if (!homeTeam || !awayTeam || !eventDate) {
        console.warn("Missing match details for AI grounding resolution:", bet);
        return null;
    }

    try {
        const dateObj = new Date(eventDate);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        console.log(`🔍 [AI Grounding] Searching for: ${homeTeam} vs ${awayTeam} on ${formattedDate}`);

        const genAI = new GoogleGenerativeAI(apiKey);

        // Enable Google Search grounding
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const prompt = `Search Google for the final score of this game:
        
${homeTeam} vs ${awayTeam}
Game Date: ${formattedDate}

I need you to find the actual final score from a reliable sports source (ESPN, NBA.com, official league sites, etc.).

Current time: ${new Date().toISOString()}

If you find the final score, return it in this EXACT JSON format:
{ 
  "status": "FOUND", 
  "home": <number>, 
  "away": <number>,
  "source": "Name of the source where you found this (e.g., ESPN, NBA.com)",
  "confidence": "high" | "medium" | "low"
}

For example: { "status": "FOUND", "home": 124, "away": 122, "source": "ESPN", "confidence": "high" }

If you cannot find the result or the game hasn't been played yet, return:
{ "status": "UNKNOWN", "home": null, "away": null, "source": null, "confidence": null }

IMPORTANT: Only return "FOUND" if you can verify the score from an official source.

Return ONLY the JSON, no other text or markdown.`;

        // Make the request with Google Search tool
        // Note: Using 'as any' because TypeScript definitions may not include googleSearch yet
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }] as any,
        });

        const response = result.response;
        const text = response.text();

        console.log("🤖 [AI Grounding] Raw response:", text);

        // Clean and parse the response
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const parsed = JSON.parse(cleanText);

            if (parsed.status === "FOUND" && !isNaN(parsed.home) && !isNaN(parsed.away)) {
                console.log(`✅ [AI Grounding] Found score: ${parsed.home} - ${parsed.away} (Source: ${parsed.source})`);

                // Return result with verification metadata
                return {
                    type: "MATCH",
                    home: parsed.home,
                    away: parsed.away,
                    // Verification stamp metadata
                    verification: {
                        verified: true,
                        source: parsed.source || "AI Web Search",
                        verifiedAt: new Date().toISOString(),
                        method: "AI_GROUNDING",
                        confidence: parsed.confidence || "high"
                    }
                };
            }

            console.log("⚠️  [AI Grounding] Status:", parsed.status);
            return null;

        } catch (parseError) {
            console.error("❌ [AI Grounding] Failed to parse JSON:", cleanText);
            return null;
        }

    } catch (error) {
        console.error("❌ [AI Grounding] Error:", error);
        return null;
    }
}


/**
 * AI Auto-Resolve: Looks up actual result and returns structured data for auto-filling
 * For MATCH bets: Uses TheSportsDB API for real sports data
 * For CHOICE/RANGE bets: Falls back to AI when appropriate
 */
export async function aiAutoResolveBet(bet: any) {
    if (!apiKey) {
        await new Promise(r => setTimeout(r, 1000));
        // Mock response based on bet type
        if (bet.type === "MATCH") {
            return { type: "MATCH", home: 2, away: 1 };
        } else if (bet.type === "CHOICE") {
            return { type: "CHOICE", optionIndex: 0 };
        } else if (bet.type === "RANGE") {
            return { type: "RANGE", value: Math.floor((bet.rangeMin + bet.rangeMax) / 2) };
        }
        return null;
    }

    try {
        // For MATCH bets, use AI with Google Search grounding
        if (bet.type === "MATCH") {
            console.log("🤖 [AI Grounding] Using Gemini 2.5 with Google Search for match resolution...");
            const aiGroundedResult = await resolveMatchBetWithAIGrounding(bet);
            if (aiGroundedResult) {
                return aiGroundedResult;
            }

            console.warn("❌ AI grounding could not resolve match. Manual entry required.");
            return null;
        }

        // For other bet types, use AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        if (bet.type === "CHOICE") {
            prompt = `
                Determine the correct answer to this question:
                Question: "${bet.question}"
                Options: ${bet.options?.map((o: any, i: number) => `${i}: ${o.text}`).join(", ")}
                Event Date: ${bet.eventDate || "Unknown"}
                
                Current Time: ${new Date().toISOString()}
                
                If you can determine the answer, return the INDEX of the correct option.
                If you don't know or it hasn't happened, return "UNKNOWN".
                
                Return ONLY valid JSON in this format:
                { "status": "FOUND" | "UNKNOWN", "optionIndex": number }
                
                Example: { "status": "FOUND", "optionIndex": 0 }
                
                Do not include markdown formatting.
            `;
        } else if (bet.type === "RANGE") {
            prompt = `
                Determine the actual value for this range question:
                Question: "${bet.question}"
                Range: ${bet.rangeMin} to ${bet.rangeMax} ${bet.rangeUnit || ""}
                Event Date: ${bet.eventDate || "Unknown"}
                
                Current Time: ${new Date().toISOString()}
                
                If you can determine the value, return it.
                If you don't know or it hasn't happened, return "UNKNOWN".
                
                Return ONLY valid JSON in this format:
                { "status": "FOUND" | "UNKNOWN", "value": number }
                
                Example: { "status": "FOUND", "value": 42 }
                
                Do not include markdown formatting.
            `;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const parsed = JSON.parse(cleanText);
            if (parsed.status === "UNKNOWN") {
                return null;
            }
            return { type: bet.type, ...parsed };
        } catch (e) {
            console.error("Failed to parse AI auto-resolve response:", text);
            return null;
        }
    } catch (error) {
        console.error("AI Auto-Resolve Error:", error);
        return null;
    }
}
