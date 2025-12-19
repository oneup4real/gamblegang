
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables with fallback
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("❌ GOOGLE_API_KEY not found in .env.local");
    process.exit(1);
}

// ------------------------------------------------------------------
// MOCK BET DATA (Reproducing the user's issue)
// ------------------------------------------------------------------
const mockBet = {
    id: '80FwGmLgYEWSq0MiKWJG',
    question: 'Atlanta Hawks vs Charlotte Hornets',
    type: 'CHOICE',
    options: [
        { text: 'Atlanta Hawks' },
        { text: 'Charlotte Hornets' }
    ],
    // The issue: "eventDate: ra" -> Sanitized into new Date() which is NOW
    // We simulate "NOW" as the eventDate because that's what the sanitized logic does
    eventDate: new Date().toISOString(),
    matchDetails: undefined
};

async function testResolution() {
    console.log("🔍 Testing AI Resolution for:", mockBet);
    console.log("📅 Event Date sent to AI:", mockBet.eventDate);

    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Reproducing the EXACT prompt logic from `ai-bet-actions.ts` 
    // (after our recent "fuzzy date" fix)

    // Logic for CHOICE
    // Date Setup
    const d = new Date(mockBet.eventDate);
    const dateStr = d.toISOString().split('T')[0];
    const yesterday = new Date(d);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterDateStr = yesterday.toISOString().split('T')[0];

    const prompt = `
        Search for the result of the "${mockBet.question}" event.
        
        Target Date: ${dateStr}
        Possible Previous Date (Late Night Game): ${yesterDateStr}
        
        Search Queries to run:
        1. "${mockBet.question} score ${dateStr}"
        2. "${mockBet.question} score ${yesterDateStr}"
        3. "${mockBet.question} last match result"
        
        Strict Rules for Result Selection:
        1. Look for a game/event that completely finished on ${dateStr} or ${yesterDateStr}.
        2. Match the TEAMS and the DATE.
        3. IGNORE games from previous weeks/months (e.g. ignore November if it's December).
        
        Options: ${mockBet.options.map((o, i) => `${i}: ${o.text}`).join(", ")}
        
        Return ONLY valid JSON:
        { "status": "FOUND", "optionIndex": number }
        OR
        { "status": "UNKNOWN" }
    `;

    console.log("\n🤖 Sending Prompt to Gemini...");

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }] as any,
        });

        const response = result.response;
        const text = response.text();
        console.log("\n📝 Raw AI Response:\n", text);

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);
        console.log("\n✅ Parsed JSON:", parsed);

        if (parsed.status === "FOUND") {
            const winner = mockBet.options[parsed.optionIndex].text;
            console.log(`\n🏆 CONCLUSION: AI chose Index ${parsed.optionIndex} -> "${winner}"`);
        } else {
            console.log("\n❌ CONCLUSION: AI returned UNKNOWN");
        }

    } catch (error) {
        console.error("❌ Error during test:", error);
    }
}

testResolution();
