/**
 * Test Gemini 2.5 with Google Search Grounding
 * This tests if the AI can search for real-time sports scores
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAIGrounding() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found!");
        return;
    }

    console.log("✅ API Key found\n");
    console.log("🏀 Testing Gemini 2.5 with Google Search Grounding");
    console.log("=".repeat(60));

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const homeTeam = "New York Knicks";
        const awayTeam = "Brooklyn Nets";
        const gameDate = new Date("2024-11-15");
        const formattedDate = gameDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        console.log("\n📋 Test Parameters:");
        console.log(`   Home Team: ${homeTeam}`);
        console.log(`   Away Team: ${awayTeam}`);
        console.log(`   Game Date: ${formattedDate}`);
        console.log("\n" + "=".repeat(60));

        const prompt = `Search Google for the final score of this basketball game:
        
${homeTeam} vs ${awayTeam}
Game Date: ${formattedDate}

I need you to find the actual final score from a reliable sports source (ESPN, NBA.com, etc.).

Current time: ${new Date().toISOString()}

If you find the final score, return it in this EXACT JSON format:
{ "status": "FOUND", "home": <number>, "away": <number> }

For example: { "status": "FOUND", "home": 124, "away": 122 }

If you cannot find the result or the game hasn't been played yet, return:
{ "status": "UNKNOWN", "home": null, "away": null }

Return ONLY the JSON, no other text or markdown.`;

        console.log("\n🔍 Sending request with Google Search grounding...\n");

        // Test with grounding
        console.log("📡 Making API call with { googleSearch: {} } tool...");
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
            console.log("\n📊 Grounding Metadata:");
            console.log(`   Search Queries: ${metadata.searchEntryPoint?.renderedContent || 'N/A'}`);
            console.log(`   Grounding Chunks: ${metadata.groundingChunks?.length || 0}`);
            console.log(`   Grounding Supports: ${metadata.groundingSupports?.length || 0}`);

            if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
                console.log("\n🔗 Sources:");
                metadata.groundingChunks.slice(0, 3).forEach((chunk, i) => {
                    if (chunk.web?.uri) {
                        console.log(`   ${i + 1}. ${chunk.web.uri}`);
                        console.log(`      Title: ${chunk.web.title || 'N/A'}`);
                    }
                });
            }
        } else {
            console.log("\n⚠️  No grounding metadata found");
            console.log("   This might mean:");
            console.log("   1. Grounding feature is not available in your API tier");
            console.log("   2. The AI didn't need to search");
            console.log("   3. Grounding is not enabled for this model/region");
        }

        // Parse the response
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("\n" + "=".repeat(60));
        console.log("🧹 Cleaned Response:");
        console.log(cleanText);
        console.log("=".repeat(60));

        try {
            const parsed = JSON.parse(cleanText);
            console.log("\n✅ Parsed JSON:");
            console.log(JSON.stringify(parsed, null, 2));

            if (parsed.status === "FOUND") {
                console.log("\n🎉 SUCCESS!");
                console.log(`   ${homeTeam}: ${parsed.home}`);
                console.log(`   ${awayTeam}: ${parsed.away}`);

                if (parsed.home === 124 && parsed.away === 122) {
                    console.log("\n🎯 CORRECT! Matches actual game result!");
                }
            } else {
                console.log("\n⚠️  Status: UNKNOWN");
                console.log("   AI could not find the result");
            }

        } catch (parseError) {
            console.error("\n❌ Failed to parse JSON:");
            console.error(parseError.message);
        }

    } catch (error) {
        console.error("\n❌ Error:");
        console.error(error.message || error);

        if (error.message?.includes('googleSearch')) {
            console.log("\n💡 Tip: The googleSearch tool might not be available in your API tier or region.");
            console.log("   Try checking Google AI Studio for grounding availability.");
        }
    }

    console.log("\n");
}

console.log("\n");
testAIGrounding();
