
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Attempt to initialize. 
// If service-account.json exists, use it. Otherwise try Application Default Credentials.
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

async function auditLockedBets() {
    console.log("🔍 Scanning for LOCKED bets...");
    console.log("🔍 Scanning for OPEN bets to check if they should be locked...");

    console.log("🔍 Scanning for LOCKED bets to check AutoConfirm status...");
    try {
        // Now that we hope for the right project, we can try specific league again or scan sample
        // Let's scan specific league to be safe on indexes

        const leagueId = "qiImzBTNoMKdjjgso7eM";
        console.log(`Scanning bets in league: ${leagueId}`);
        const snapshot = await db.collection("leagues").doc(leagueId).collection("bets")
            .where("status", "==", "LOCKED")
            .get();

        if (snapshot.empty) {
            console.log("No LOCKED bets found in this league.");
        } else {
            console.log(`\nFound ${snapshot.size} LOCKED bets.`);
            let autoConfirmCount = 0;
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.autoConfirm) autoConfirmCount++;
                console.log(`[${doc.id}] ${data.question} | AutoConfirm: ${!!data.autoConfirm}`);
            });
            console.log(`\nSummary: ${autoConfirmCount}/${snapshot.size} have autoConfirm: true`);
        }

        // Also check OPEN bets that look expired
        console.log("\n--- Checking for Expired OPEN Bets ---");
        const openSnapshot = await db.collection("leagues").doc(leagueId).collection("bets")
            .where("status", "==", "OPEN")
            .get();

        const now = new Date();
        let expiredCount = 0;
        openSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const closesAt = data.closesAt?.toDate ? data.closesAt.toDate() : new Date(data.closesAt);
            const isExpired = closesAt < now;

            if (isExpired) expiredCount++;

            // Log first 10 or expired ones
            if (index < 10 || isExpired) {
                console.log(`[${index + 1}] ID: ${doc.id}`);
                console.log(`    Question: ${data.question}`);
                console.log(`    Closes At: ${closesAt.toISOString()}`);
                console.log(`    Status: ${data.status}`);
                console.log(`    AutoConfirm: ${!!data.autoConfirm}`);
                console.log(`    Should be LOCKED? ${isExpired ? "YES ⚠️" : "No"}`);
                console.log("");
            }
        });

        console.log("--- Summary ---");
        console.log(`Total OPEN: ${openSnapshot.size}`);
        console.log(`Should be LOCKED (Expired): ${expiredCount}`);

    } catch (error) {
        console.error("Error querying bets:", error);
        console.log("\n⚠️ NOTE: If you got a 'Missing credentials' error, run: 'gcloud auth application-default login'");
    }
}


/*
// UNCOMMENT TO FIX MISSING FLAGS
async function fixMissingFlags(leagueId: string) {
    const snapshot = await db.collection("leagues").doc(leagueId).collection("bets").get();
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        if (!doc.data().autoConfirm) {
            batch.update(doc.ref, { autoConfirm: true, autoConfirmDelay: 120 });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Updated ${count} bets to have autoConfirm: true`);
    } else {
        console.log("No bets needed update.");
    }
}
fixMissingFlags("qiImzBTNoMKdjjgso7eM");
*/

auditLockedBets();
