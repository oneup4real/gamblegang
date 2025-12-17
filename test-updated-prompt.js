const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testUpdatedPrompt() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found!");
        return;
    }

    console.log("✅ API Key found\n");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Test data matching the actual code structure
        const bet = {
            question: "New York Knicks vs Brooklyn Nets",
            type: "MATCH",
            matchDetails: {
                homeTeam: "New York Knicks",
                awayTeam: "Brooklyn Nets",
                date: "2024-11-15T19:00:00.000Z"
            },
            eventDate: "2024-11-15T19:00:00.000Z"
        };

        const dateStr = bet.matchDetails?.date || bet.eventDate;
        const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown';

        const prompt = `
            I need to find the final score for this sports match. Please use your knowledge or search capabilities to find this information.
            
            Match Details:
            - Question: "${bet.question}"
            - Home Team: ${bet.matchDetails?.homeTeam || "Unknown"}
            - Away Team: ${bet.matchDetails?.awayTeam || "Unknown"}
            - Game Date: ${formattedDate}
            - Raw Date: ${dateStr}
            
            Current Time: ${new Date().toISOString()}
            
            Instructions:
            1. If this game has already been played and you can find or know the final score, return the score
            2. Search your knowledge base for "${bet.matchDetails?.homeTeam} vs ${bet.matchDetails?.awayTeam} ${formattedDate}" 
            3. Look for official NBA scores, ESPN results, or other reliable sports data
            4. If you cannot find the result or are uncertain, return UNKNOWN
            
            Response Format (JSON ONLY, no markdown):
            - If score found: { "status": "FOUND", "home": <number>, "away": <number> }
            - If not found: { "status": "UNKNOWN", "home": null, "away": null }
            
            Example successful response: { "status": "FOUND", "home": 124, "away": 122 }
        `;

        console.log("📝 Testing Updated Prompt\n");
        console.log("Game:", bet.question);
        console.log("Date:", formattedDate);
        console.log("\n" + "=".repeat(60) + "\n");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("🤖 AI Response:");
        console.log(text);
        console.log("\n" + "=".repeat(60) + "\n");

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const parsed = JSON.parse(cleanText);
            console.log("✅ Parsed Result:");
            console.log(JSON.stringify(parsed, null, 2));

            if (parsed.status === "UNKNOWN") {
                console.log("\n⚠️  AI Status: UNKNOWN");
                console.log("    Reason: AI could not find or verify the game result");
                console.log("\n📋 This means:");
                console.log("   - The AI doesn't have access to this game in its knowledge base");
                console.log("   - The current model doesn't support real-time search grounding");
                console.log("   - The game date may be beyond the AI's knowledge cutoff");
                return null;
            }

            console.log("\n✅ SUCCESS! Result Found:");
            console.log(`   ${bet.matchDetails.homeTeam}: ${parsed.home}`);
            console.log(`   ${bet.matchDetails.awayTeam}: ${parsed.away}`);

            if (parsed.home === 124 && parsed.away === 122) {
                console.log("\n🎯 CORRECT! This matches the actual game result!");
            }

            return { type: bet.type, ...parsed };
        } catch (e) {
            console.error("\n❌ JSON Parse Error:");
            console.error(e.message);
            return null;
        }
    } catch (error) {
        console.error("\n❌ Error:");
        console.error(error.message || error);
        return null;
    }
}

console.log("🏀 Testing Updated AI Prompt for Knicks vs Nets");
console.log("   (Nov 15, 2024: Actual score was Knicks 124 - Nets 122)\n");
console.log("=".repeat(60) + "\n");

testUpdatedPrompt().then(result => {
    console.log("\n" + "=".repeat(60));
    if (result && result.status === "FOUND") {
        console.log("\n✅ FINAL RESULT: AI successfully found the score!");
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log("\n❌ FINAL RESULT: AI returned UNKNOWN");
        console.log("\n💡 RECOMMENDATION:");
        console.log("   The Gemini API needs Google Search grounding enabled OR");
        console.log("   you should integrate a dedicated sports API for reliable results.");
        console.log("\n   See: AI_RESOLUTION_INVESTIGATION.md for detailed solutions");
    }
    console.log("\n");
});
