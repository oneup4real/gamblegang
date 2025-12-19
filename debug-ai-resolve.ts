
import { aiAutoResolveBet } from "./src/app/actions/ai-bet-actions";

// Mock env if needed (but will run with --env-file)

async function run() {
    console.log("Testing AI Auto Resolve...");

    // Nov 30 2025 match, Arsenal vs Chelsea (1-1 Draw)
    // We use a string date to verify the parsing logic
    const mockBet = {
        id: "debug-bet-1",
        type: "MATCH",
        question: "Arsenal vs Chelsea",
        matchDetails: {
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            date: "2025-11-30T15:00:00.000Z"
        },
        eventDate: "2025-11-30T15:00:00.000Z"
    };

    console.log("Input Bet:", JSON.stringify(mockBet, null, 2));

    // Force Node to recognize the env var if loaded correctly
    if (!process.env.GOOGLE_API_KEY) {
        console.error("❌ GOOGLE_API_KEY is not set in environment!");
    } else {
        console.log("✅ GOOGLE_API_KEY is set.");
    }

    try {
        const result = await aiAutoResolveBet(mockBet);

        console.log("---------------------------------------------------");
        console.log("AI Result:", JSON.stringify(result, null, 2));
        console.log("---------------------------------------------------");

        if (result && (result.home !== undefined || result.value !== undefined || result.optionIndex !== undefined)) {
            console.log("SUCCESS: Result Found");
        } else {
            console.log("FAILURE: Result Not Found");
        }
    } catch (e) {
        console.error("CRITICAL ERROR during execution:", e);
    }
}

run().catch(console.error);
