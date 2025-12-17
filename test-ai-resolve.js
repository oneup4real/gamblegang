const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAIResolve() {
    // Read from env directly - you need to export it before running this script
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found!");
        return;
    }

    console.log("✅ API Key found");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Test data for Knicks vs Nets - most recent game on Nov 15, 2024
        const bet = {
            question: "New York Knicks vs Brooklyn Nets",
            type: "MATCH",
            matchDetails: {
                homeTeam: "New York Knicks",
                awayTeam: "Brooklyn Nets",
                date: "2024-11-15T19:00:00.000Z" // Actual recent game date
            },
            eventDate: "2024-11-15T19:00:00.000Z"
        };

        const prompt = `
            Look up the actual final score for this match:
            Question: "${bet.question}"
            Home Team: ${bet.matchDetails.homeTeam}
            Away Team: ${bet.matchDetails.awayTeam}
            Date: ${bet.matchDetails.date}
            
            Current Time: ${new Date().toISOString()}
            
            If the match has finished, return the exact final score.
            If the match hasn't happened or you don't know, return "UNKNOWN".
            
            Return ONLY valid JSON in this format:
            { "status": "FOUND" | "UNKNOWN", "home": number, "away": number }
            
            Example: { "status": "FOUND", "home": 2, "away": 1 }
            
            Do not include markdown formatting.
        `;

        console.log("\n📝 Sending request to AI...\n");
        console.log("Question:", bet.question);
        console.log("Home Team:", bet.matchDetails.homeTeam);
        console.log("Away Team:", bet.matchDetails.awayTeam);
        console.log("Date:", bet.matchDetails.date);
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
console.log("🏀 Testing AI Resolution for Knicks vs Nets\n");
console.log("=".repeat(60));
testAIResolve().then(result => {
    console.log("\n" + "=".repeat(60));
    if (result) {
        console.log("\n✅ Final Result:");
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log("\n❌ AI couldn't determine the result. Please enter manually.");
    }
    console.log("\n");
});
