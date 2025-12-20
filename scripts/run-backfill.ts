/**
 * Runner script for backfill
 * Run with: npx tsx scripts/run-backfill.ts
 */

import { backfillSportsDbEventIds } from "../src/lib/services/backfill-sportsdb";

async function main() {
    console.log("🚀 Starting SportsDB backfill...");

    try {
        const result = await backfillSportsDbEventIds();

        console.log("\n========================================");
        console.log("✅ BACKFILL COMPLETE");
        console.log("========================================");
        console.log(`Total bets processed: ${result.totalBets}`);
        console.log(`API matched: ${result.apiMatched}`);
        console.log(`AI assigned: ${result.aiAssigned}`);
        console.log(`Errors: ${result.errors}`);
        console.log("========================================\n");

        if (result.details.length > 0) {
            console.log("Details:");
            result.details.forEach(d => {
                console.log(`  - [${d.dataSource}] ${d.question.substring(0, 50)}...`);
            });
        }

    } catch (error) {
        console.error("❌ Backfill failed:", error);
        process.exit(1);
    }
}

main();
