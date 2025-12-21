/**
 * Cleanup script to delete orphaned bets, wagers, and notifications
 * from leagues that no longer exist.
 * 
 * In Firestore, when a parent document is deleted, its subcollections
 * remain as "orphaned" data. This script finds and cleans them up.
 * 
 * Run with: npx tsx scripts/cleanup-orphaned-data.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
try {
    const serviceAccount = require('../service-account.json');
    if (getApps().length === 0) {
        initializeApp({ credential: cert(serviceAccount) });
    }
} catch (e) {
    if (getApps().length === 0) {
        initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth
    }
}

const db = getFirestore();

async function cleanupOrphanedData() {
    console.log('Starting cleanup of orphaned data...\n');

    // Get all existing league IDs
    const leaguesSnapshot = await db.collection('leagues').get();
    const existingLeagueIds = new Set(leaguesSnapshot.docs.map(doc => doc.id));
    console.log(`Found ${existingLeagueIds.size} existing leagues: ${Array.from(existingLeagueIds).join(', ')}\n`);

    // The problem: Firestore doesn't let us easily find orphaned subcollections
    // We need to know what league IDs USED to exist but were deleted
    // 
    // Strategy: Check a sample of bet documents to find leagueIds that no longer exist
    // But since bets are subcollections, we can't query them directly...
    //
    // Alternative: Use collectionGroup queries if we have indexes, or list all possible paths.
    // For now, let's check notifications which ARE a top-level collection

    // 1. Clean up orphaned notifications (top-level collection)
    console.log('Checking notifications...');
    const notificationsSnapshot = await db.collection('notifications').get();
    let orphanedNotifications = 0;

    for (const notifDoc of notificationsSnapshot.docs) {
        const leagueId = notifDoc.data().leagueId;
        if (leagueId && !existingLeagueIds.has(leagueId)) {
            await notifDoc.ref.delete();
            orphanedNotifications++;
            console.log(`  - Deleted orphaned notification: ${notifDoc.id} (league: ${leagueId})`);
        }
    }

    if (orphanedNotifications > 0) {
        console.log(`  Deleted ${orphanedNotifications} orphaned notifications.\n`);
    } else {
        console.log('  No orphaned notifications found.\n');
    }

    // 2. For subcollections (bets, wagers), we need to use collectionGroup query
    // This requires a Firestore index. Let's try it:
    console.log('Checking bets (via collectionGroup query)...');
    let orphanedBets = 0;
    let orphanedWagers = 0;

    try {
        // Query all bets across all leagues
        const allBetsSnapshot = await db.collectionGroup('bets').get();
        console.log(`  Found ${allBetsSnapshot.size} total bets across all leagues.`);

        for (const betDoc of allBetsSnapshot.docs) {
            // Extract leagueId from the path: leagues/{leagueId}/bets/{betId}
            const pathParts = betDoc.ref.path.split('/');
            const leagueId = pathParts[1];

            if (!existingLeagueIds.has(leagueId)) {
                // This bet belongs to a deleted league - delete its wagers first
                const wagersSnapshot = await betDoc.ref.collection('wagers').get();
                for (const wagerDoc of wagersSnapshot.docs) {
                    await wagerDoc.ref.delete();
                    orphanedWagers++;
                }

                // Delete the bet
                await betDoc.ref.delete();
                orphanedBets++;
                console.log(`  - Deleted orphaned bet: ${betDoc.id} (league: ${leagueId}, ${wagersSnapshot.size} wagers)`);
            }
        }
    } catch (error: any) {
        if (error.code === 9 /* FAILED_PRECONDITION */) {
            console.log('  ⚠️ CollectionGroup query requires an index. Please create it in Firebase Console.');
            console.log('  Skipping orphaned bets cleanup...\n');
        } else {
            throw error;
        }
    }

    if (orphanedBets > 0 || orphanedWagers > 0) {
        console.log(`  Deleted ${orphanedBets} orphaned bets and ${orphanedWagers} orphaned wagers.\n`);
    }

    // 3. Also clean up orphaned chat, activityLog, etc.
    console.log('Checking other subcollections (chat, activityLog, etc.)...');
    const subcollectionNames = ['chat', 'activityLog', 'announcements', 'members'];
    let orphanedSubDocs = 0;

    for (const subcollection of subcollectionNames) {
        try {
            const snapshot = await db.collectionGroup(subcollection).get();

            for (const subDoc of snapshot.docs) {
                const pathParts = subDoc.ref.path.split('/');
                const leagueId = pathParts[1];

                if (!existingLeagueIds.has(leagueId)) {
                    await subDoc.ref.delete();
                    orphanedSubDocs++;
                    console.log(`  - Deleted orphaned ${subcollection}: ${subDoc.id} (league: ${leagueId})`);
                }
            }
        } catch (error: any) {
            if (error.code === 9) {
                console.log(`  ⚠️ CollectionGroup query for "${subcollection}" requires an index. Skipping...`);
            }
        }
    }

    if (orphanedSubDocs > 0) {
        console.log(`  Deleted ${orphanedSubDocs} orphaned subcollection documents.\n`);
    } else {
        console.log('  No orphaned subcollection documents found.\n');
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`Summary: ${orphanedNotifications} notifications, ${orphanedBets} bets, ${orphanedWagers} wagers, ${orphanedSubDocs} other docs deleted.`);
}

cleanupOrphanedData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error during cleanup:', error);
        process.exit(1);
    });
