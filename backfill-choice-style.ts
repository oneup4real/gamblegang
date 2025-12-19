/**
 * Backfill script to add choiceStyle = "MATCH_1X2" to CHOICE bets
 * that are missing this field.
 * 
 * Run with: npx tsx backfill-choice-style.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
try {
    const serviceAccount = require('./service-account.json');
    if (getApps().length === 0) {
        initializeApp({ credential: cert(serviceAccount) });
    }
} catch (e) {
    if (getApps().length === 0) {
        initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth
    }
}

const db = getFirestore();

const LEAGUE_ID = "m4AQASnaB9nEkTnNUo33";

async function backfillChoiceStyle() {
    console.log(`\n🔧 Backfilling choiceStyle for league: ${LEAGUE_ID}\n`);

    // Get all bets in the league
    const betsRef = db.collection("leagues").doc(LEAGUE_ID).collection("bets");
    const betsSnap = await betsRef.get();

    console.log(`📊 Found ${betsSnap.size} bets in league\n`);

    let updated = 0;
    let skipped = 0;

    for (const doc of betsSnap.docs) {
        const bet = doc.data();

        // Only update CHOICE bets
        if (bet.type === "CHOICE") {
            const isMatchBet = bet.question.toLowerCase().includes(" vs ");
            const needsUpdate = !bet.choiceStyle || (bet.choiceStyle === "VARIOUS" && isMatchBet);

            if (needsUpdate) {
                console.log(`✏️  Updating: "${bet.question}" (${doc.id})`);
                console.log(`   Current choiceStyle: ${bet.choiceStyle || "not set"}`);
                console.log(`   Options: ${bet.options?.map((o: any) => o.text).join(", ")}`);

                // Also try to backfill matchDetails from question if missing
                let matchDetails = bet.matchDetails;
                if (!matchDetails && isMatchBet) {
                    const parts = bet.question.split(/ vs /i);
                    if (parts.length === 2) {
                        matchDetails = {
                            homeTeam: parts[0].trim(),
                            awayTeam: parts[1].trim(),
                            date: bet.eventDate?.toDate?.()?.toISOString() || new Date().toISOString()
                        };
                    }
                }

                await betsRef.doc(doc.id).update({
                    choiceStyle: "MATCH_1X2",
                    ...(matchDetails && !bet.matchDetails ? { matchDetails } : {})
                });

                console.log(`   → Changed to: MATCH_1X2\n`);
                updated++;
            } else {
                console.log(`⏭️  Skipping: "${bet.question}" - choiceStyle: ${bet.choiceStyle}, not a match bet`);
                skipped++;
            }
        } else {
            console.log(`⏭️  Skipping: "${bet.question}" - type is ${bet.type}, not CHOICE`);
            skipped++;
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
}

backfillChoiceStyle().catch(console.error);
