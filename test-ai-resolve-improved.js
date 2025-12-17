const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAIResolveImproved() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found!");
        return;
    }

    console.log("✅ API Key found");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        // Test data for Knicks vs Nets - most recent game on Nov 15, 2024
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

        // Improved prompt with grounding and search capabilities
        const prompt = `
            I need you to find the final score for this NBA basketball game:
            
            Game: ${bet.matchDetails.homeTeam} vs ${bet.matchDetails.awayTeam}
            Date: ${new Date(bet.matchDetails.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}
            
            Current date and time: ${new Date().toISOString()}
            
            Please search for and provide the final score of this game. The game was played on November 15, 2024.
            
            If you can find the result, return it in this exact JSON format:
            { "status": "FOUND", "home": <score>, "away": <score> }
            
            For example, if the Knicks scored 124 and the Nets scored 122, return:
            { "status": "FOUND", "home": 124, "away": 122 }
            
            If you cannot find reliable information about this game or if it hasn't been played yet, return:
            { "status": "UNKNOWN", "home": null, "away": null }
            
            Return ONLY the JSON, no other text or markdown formatting.
        `;

        console.log("\n📝 Sending IMPROVED request to AI...\n");
        console.log("Question:", bet.question);
        console.log("Home Team:", bet.matchDetails.homeTeam);
        console.log("Away Team:", bet.matchDetails.awayTeam);
        console.log("Date:", new Date(bet.matchDetails.date).toLocaleDateString());
        console.log("\n");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("🤖 Raw AI Response:");
        console.log(text);
        console.log("\n");

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("🧹 Cleaned Response:");
        console.log(cleanText);
        console.log("\n");

        try {
            const parsed = JSON.parse(cleanText);
            console.log("✅ Parsed JSON:");
            console.log(JSON.stringify(parsed, null, 2));

            if (parsed.status === "UNKNOWN") {
                console.log("\n⚠️ Result: AI couldn't determine the result (status: UNKNOWN)");
                console.log("\n💡 Possible reasons:");
                console.log("   1. The AI model doesn't have access to recent sports scores");
                console.log("   2. The game date might be incorrect");
                console.log("   3. The AI's knowledge cutoff doesn't include this game");
                console.log("   4. Grounding/search features may not be enabled");
                return null;
            }

            console.log("\n✅ Result Found!");
            console.log(`${bet.matchDetails.homeTeam}: ${parsed.home}`);
            console.log(`${bet.matchDetails.awayTeam}: ${parsed.away}`);

            return { type: bet.type, ...parsed };
        } catch (e) {
            console.error("\n❌ Failed to parse AI response as JSON:");
            console.error(e.message);
            return null;
        }
    } catch (error) {
        console.error("\n❌ AI Auto-Resolve Error:");
        console.error(error);
        return null;
    }
}

// Run the test
console.log("🏀 Testing IMPROVED AI Resolution for Knicks vs Nets\n");
console.log("=".repeat(60));
testAIResolveImproved().then(result => {
    console.log("\n" + "=".repeat(60));
    if (result) {
        console.log("\n✅ Final Result:");
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log("\n❌ AI couldn't determine the result. Please enter manually.");
    }
    console.log("\n");
});
