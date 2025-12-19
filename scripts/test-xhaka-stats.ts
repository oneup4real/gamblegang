
import { aiAutoResolveBet } from "../src/app/actions/ai-bet-actions";

async function run() {
    console.log("Testing AI Auto Resolve for Player Stats (Granit Xhaka)...");

    // Test 1: Goals Scored (Premier League, Sunderland vs Newcastle, Dec 14 2025)
    // Based on search, he plays for Sunderland now in this timeline.
    const betGoals = {
        id: "test-xhaka-goals",
        type: "RANGE",
        question: "How many goals did Granit Xhaka score vs Newcastle?",
        rangeMin: 0,
        rangeMax: 3,
        rangeUnit: "Goals",
        eventDate: "2025-12-14T15:00:00.000Z", // The actual match date
        matchDetails: {
            homeTeam: "Sunderland",
            awayTeam: "Newcastle",
            date: "2025-12-14T15:00:00.000Z"
        }
    };

    console.log("\n--- TEST 1: GOALS (Target Date: Dec 14, 2025) ---");
    try {
        const result = await aiAutoResolveBet(betGoals);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Test 1 Failed:", e);
    }

    // Test 2: Passes Completed
    const betPasses = {
        id: "test-xhaka-passes",
        type: "RANGE",
        question: "How many passes did Granit Xhaka complete vs Newcastle?",
        rangeMin: 0,
        rangeMax: 100,
        rangeUnit: "Passes",
        eventDate: "2025-12-14T15:00:00.000Z",
        matchDetails: {
            homeTeam: "Sunderland",
            awayTeam: "Newcastle",
            date: "2025-12-14T15:00:00.000Z"
        }
    };

    console.log("\n--- TEST 2: PASSES (Target Date: Dec 14, 2025) ---");
    try {
        const result = await aiAutoResolveBet(betPasses);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Test 2 Failed:", e);
    }
}

// Check API Key
if (!process.env.GOOGLE_API_KEY) {
    console.warn("⚠️  GOOGLE_API_KEY missing. Tests will use mock/fallback.");
}

run();
