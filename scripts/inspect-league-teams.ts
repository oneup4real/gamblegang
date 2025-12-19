
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase (Assuming implicit auth or env vars are set up, similar to previous scripts)
// If previous scripts used 'firebase-admin', I'll follow that pattern.
// Checking previous usage... `functions/src/index.ts` uses `firebase-admin`.
// `scripts/update-team-logos.js` didn't use firebase. 
// I'll assume we can use the default creds or I might need to ask the user to run it with credentials.
// However, the user ran `npx tsx scripts/test-xhaka-stats.ts` earlier which used `src/app/actions/ai-bet-actions.ts`.
// For direct DB access, I need admin privileges. 

// Let's try to stick to reading the JSON file first, and accessing DB via `dotenv` + `firebase-admin` pattern if possible.
// Or I can just write a script that assumes `GOOGLE_APPLICATION_CREDENTIALS` or similar is available, 
// OR I can use the existing `admin` setup if there's a utility for it. 
// I'll check `src/lib/firebase/admin.ts` if it exists.

// Actually, I'll just write a standalone script like `debug-ai-resolve.ts` but for fetching league bets.
// I'll use standard firebase-admin with applicationDefault() if possible, or try to reuse config.

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

try {
    initializeApp();
} catch (e: any) {
    if (e.code !== 'app/duplicate-app') {
        console.error("Firebase Init Error:", e);
    }
}

const db = getFirestore();

const LEAGUE_ID = "qiImzBTNoMKdjjgso7eM";
const LOGO_FILE_PATH = path.join(process.cwd(), "src/lib/data/team-logos.json");

async function checkTeams() {
    console.log(`Fetching bets for league: ${LEAGUE_ID}...`);
    try {
        const betsSnap = await db.collection("leagues").doc(LEAGUE_ID).collection("bets").get();
        console.log(`Found ${betsSnap.size} bets.`);

        // Load Logos
        const logosRaw = fs.readFileSync(LOGO_FILE_PATH, "utf-8");
        const logoDb = JSON.parse(logosRaw);
        const logoKeys = new Set(Object.keys(logoDb));

        const missing = new Set();
        const found = new Set();

        const typeCounts: Record<string, number> = {};

        betsSnap.docs.forEach(doc => {
            const bet = doc.data();
            typeCounts[bet.type] = (typeCounts[bet.type] || 0) + 1;

            console.log(`[${bet.type}] ${bet.question} (ID: ${doc.id})`);

            if (bet.type === "MATCH" && bet.matchDetails) {
                const home = bet.matchDetails.homeTeam?.trim();
                const away = bet.matchDetails.awayTeam?.trim();

                if (home) {
                    if (logoKeys.has(home.toLowerCase())) found.add(home);
                    else missing.add(home);
                }
                if (away) {
                    if (logoKeys.has(away.toLowerCase())) found.add(away);
                    else missing.add(away);
                }
            }
        });

        console.log("\n--- BET TYPES ---");
        console.table(typeCounts);

        console.log("\n--- TEAM NAME ANALYSIS ---");
        console.log(`✅ MATCHED: ${found.size} teams`);
        console.log(`❌ MISSING: ${missing.size} teams`);

        if (missing.size > 0) {
            console.log("\nThe following team names in the database do NOT have a logo match:");
            missing.forEach(name => console.log(` - "${name}"`));
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

checkTeams();
