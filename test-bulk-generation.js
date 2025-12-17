/**
 * Test Bulk Bet Generation with Google Search Grounding
 * Verifies that only REAL, scheduled matches are generated
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testBulkGeneration() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found!");
        return;
    }

    console.log("✅ API Key found\n");
    console.log("🏀 Testing Bulk Bet Generation with Grounding");
    console.log("=".repeat(60));

    const topic = "NBA";
    const timeframe = "this week";
    const type = "MATCH";

    console.log("\n📋 Test Parameters:");
    console.log(`   Topic: ${topic}`);
    console.log(`   Timeframe: ${timeframe}`);
    console.log(`   Type: ${type}`);
    console.log("\n" + "=".repeat(60));

    try {
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

Return ONLY matches you can VERIFY exist.

For MATCH type, generate Match Prediction bets (Exact Score predictions).

Return ONLY a valid JSON array in this EXACT format:
[
    {
        "question": "HomeTeam vs AwayTeam",
        "type": "${type}",
        "matchHome": "Full Home Team Name",
        "matchAway": "Full Away Team Name",
        "date": "ISO8601 Date String with time (e.g. 2024-12-20T19:00:00.000Z)",
        "verified": true,
        "source": "Where you found this (e.g. ESPN, NBA.com)"
    }
]

IMPORTANT:
- Provide 5-10 verified matches if available
- Use accurate dates and times for the timeframe
- Include the source where you verified each match
- Do NOT include markdown formatting
- Return ONLY the JSON array

If you cannot find any verified matches, return an empty array: []`;

        console.log("\n🔍 Searching for REAL NBA games...\n");
        console.log("📡 Making API call with Google Search grounding...");

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
        });

        const response = result.response;
        const text = response.text();

        console.log("\n" + "=".repeat(60));
        console.log("🤖 AI Response:");
        console.log(text);
        console.log("=".repeat(60));

        // Check for grounding metadata
        if (result.response.candidates && result.response.candidates[0]?.groundingMetadata) {
            console.log("\n✅ GROUNDING DETECTED!");
            const metadata = result.response.candidates[0].groundingMetadata;
            console.log(`   Grounding Chunks: ${metadata.groundingChunks?.length || 0}`);
            console.log(`   Grounding Supports: ${metadata.groundingSupports?.length || 0}`);

            if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
                console.log("\n🔗 Sources:");
                metadata.groundingChunks.slice(0, 5).forEach((chunk, i) => {
                    if (chunk.web?.uri) {
                        console.log(`   ${i + 1}. ${chunk.web.uri}`);
                    }
                });
            }
        }

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("\n" + "=".repeat(60));
        console.log("🧹 Cleaned Response:");
        console.log(cleanText);
        console.log("=".repeat(60));

        try {
            const matches = JSON.parse(cleanText);

            if (!Array.isArray(matches)) {
                console.log("\n⚠️  Response is not an array");
                return;
            }

            console.log(`\n✅ Generated ${matches.length} matches:\n`);

            matches.forEach((match, i) => {
                console.log(`${i + 1}. ${match.question || 'N/A'}`);
                console.log(`   Date: ${match.date || 'N/A'}`);
                console.log(`   Home: ${match.matchHome || 'N/A'}`);
                console.log(`   Away: ${match.matchAway || 'N/A'}`);
                console.log(`   Verified: ${match.verified ? '✅' : '❌'}`);
                console.log(`   Source: ${match.source || 'N/A'}`);
                console.log("");
            });

            // Validation
            const allVerified = matches.every(m => m.verified === true);
            const allHaveDates = matches.every(m => m.date && m.date.length > 0);
            const allHaveTeams = matches.every(m => m.matchHome && m.matchAway);
            const allHaveSources = matches.every(m => m.source && m.source.length > 0);

            console.log("=".repeat(60));
            console.log("📊 Validation:");
            console.log(`   All Verified: ${allVerified ? '✅' : '❌'}`);
            console.log(`   All Have Dates: ${allHaveDates ? '✅' : '❌'}`);
            console.log(`   All Have Teams: ${allHaveTeams ? '✅' : '❌'}`);
            console.log(`   All Have Sources: ${allHaveSources ? '✅' : '❌'}`);

            if (allVerified && allHaveDates && allHaveTeams && allHaveSources) {
                console.log("\n🎉 SUCCESS! All matches are verified and complete!");
            } else {
                console.log("\n⚠️  Some matches are missing required fields");
            }

        } catch (parseError) {
            console.error("\n❌ Failed to parse JSON:");
            console.error(parseError.message);
        }

    } catch (error) {
        console.error("\n❌ Error:");
        console.error(error.message || error);
    }

    console.log("\n");
}

console.log("\n");
testBulkGeneration();
