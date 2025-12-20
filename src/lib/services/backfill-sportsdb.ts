"use server";

/**
 * Backfill Script: Add SportsDB Event IDs to Existing Bets
 * 
 * This script:
 * 1. Queries all existing bets across all leagues
 * 2. For each bet, tries to match it to a SportsDB event
 * 3. If found: sets dataSource to "API" and stores eventId
 * 4. If not found: sets dataSource to "AI"
 * 
 * Run this script once after implementing the live tracking feature
 */

import { db } from "@/lib/firebase/config";
import {
    collectionGroup,
    getDocs,
    doc,
    updateDoc,
    writeBatch
} from "firebase/firestore";
import { findSportsDbEvent } from "./sports-data-service";

interface BackfillResult {
    totalBets: number;
    apiMatched: number;
    aiAssigned: number;
    errors: number;
    details: Array<{
        betId: string;
        leagueId: string;
        question: string;
        dataSource: "API" | "AI";
        eventId?: string;
    }>;
}

/**
 * Backfill all existing bets with SportsDB event IDs
 */
export async function backfillSportsDbEventIds(): Promise<BackfillResult> {
    const result: BackfillResult = {
        totalBets: 0,
        apiMatched: 0,
        aiAssigned: 0,
        errors: 0,
        details: []
    };

    try {
        console.log("🔄 Starting backfill of SportsDB event IDs...");

        // Query all bets across all leagues
        const betsSnapshot = await getDocs(collectionGroup(db, "bets"));

        console.log(`📊 Found ${betsSnapshot.size} bets to process`);
        result.totalBets = betsSnapshot.size;

        // Process in batches
        const batchSize = 10;
        const batches: typeof betsSnapshot.docs[] = [];

        for (let i = 0; i < betsSnapshot.docs.length; i += batchSize) {
            batches.push(betsSnapshot.docs.slice(i, i + batchSize));
        }

        let processedCount = 0;

        for (const batch of batches) {
            const firestoreBatch = writeBatch(db);
            let batchHasUpdates = false;

            for (const betDoc of batch) {
                try {
                    const bet = betDoc.data();
                    const leagueId = betDoc.ref.parent.parent?.id;

                    if (!leagueId) {
                        console.warn(`⚠️ Skipping bet ${betDoc.id} - no league ID`);
                        continue;
                    }

                    // Skip if already has dataSource set
                    if (bet.dataSource) {
                        console.log(`⏭️ Skipping bet ${betDoc.id} - already has dataSource: ${bet.dataSource}`);
                        processedCount++;
                        continue;
                    }

                    // Extract team names
                    let homeTeam: string | undefined;
                    let awayTeam: string | undefined;
                    let eventDate: Date | undefined;

                    // From MATCH type bets
                    if (bet.matchDetails) {
                        homeTeam = bet.matchDetails.homeTeam;
                        awayTeam = bet.matchDetails.awayTeam;
                    }

                    // Try parsing from question for CHOICE bets (e.g., "Arsenal vs Chelsea")
                    if (!homeTeam || !awayTeam) {
                        const vsMatch = bet.question?.match(/(.+?)\s+(?:vs\.?|versus|v\.?)\s+(.+?)(?:\s*[-–—]\s*|\s*\?|$)/i);
                        if (vsMatch) {
                            homeTeam = vsMatch[1].trim();
                            awayTeam = vsMatch[2].trim();
                        }
                    }

                    // Get event date
                    if (bet.eventDate) {
                        if (bet.eventDate.toDate) {
                            eventDate = bet.eventDate.toDate();
                        } else if (bet.eventDate.seconds) {
                            eventDate = new Date(bet.eventDate.seconds * 1000);
                        } else {
                            eventDate = new Date(bet.eventDate);
                        }
                    }

                    // Prepare update data
                    const updateData: any = {};

                    // Try to find SportsDB event
                    if (homeTeam && awayTeam && eventDate) {
                        console.log(`🔍 Looking for: ${homeTeam} vs ${awayTeam} on ${eventDate.toLocaleDateString()}`);

                        const matchResult = await findSportsDbEvent(homeTeam, awayTeam, eventDate);

                        if (matchResult.found && matchResult.eventId) {
                            console.log(`✅ Matched! Event ID: ${matchResult.eventId}`);
                            updateData.dataSource = "API";
                            updateData.sportsDbEventId = matchResult.eventId;
                            updateData.sportsDbLeagueId = matchResult.leagueId;
                            updateData.sportsDbTeamId = matchResult.teamId;
                            result.apiMatched++;

                            result.details.push({
                                betId: betDoc.id,
                                leagueId,
                                question: bet.question || "Unknown",
                                dataSource: "API",
                                eventId: matchResult.eventId
                            });
                        } else {
                            console.log(`⚠️ No SportsDB match, using AI`);
                            updateData.dataSource = "AI";
                            result.aiAssigned++;

                            result.details.push({
                                betId: betDoc.id,
                                leagueId,
                                question: bet.question || "Unknown",
                                dataSource: "AI"
                            });
                        }
                    } else {
                        // No team/date info, default to AI
                        console.log(`⚠️ No team/date info for bet ${betDoc.id}, using AI`);
                        updateData.dataSource = "AI";
                        result.aiAssigned++;

                        result.details.push({
                            betId: betDoc.id,
                            leagueId,
                            question: bet.question || "Unknown",
                            dataSource: "AI"
                        });
                    }

                    // Add to batch
                    if (Object.keys(updateData).length > 0) {
                        firestoreBatch.update(betDoc.ref, updateData);
                        batchHasUpdates = true;
                    }

                    processedCount++;
                    console.log(`📊 Progress: ${processedCount}/${result.totalBets}`);

                } catch (error) {
                    console.error(`❌ Error processing bet ${betDoc.id}:`, error);
                    result.errors++;
                }
            }

            // Commit batch
            if (batchHasUpdates) {
                await firestoreBatch.commit();
                console.log(`💾 Batch committed`);
            }

            // Delay between batches to respect API rate limits
            await new Promise(r => setTimeout(r, 500));
        }

        console.log("✅ Backfill complete!");
        console.log(`📊 Summary: ${result.apiMatched} API, ${result.aiAssigned} AI, ${result.errors} errors`);

        return result;

    } catch (error) {
        console.error("❌ Backfill failed:", error);
        throw error;
    }
}

/**
 * Preview what would be backfilled (dry run)
 */
export async function previewBackfill(): Promise<{
    totalBets: number;
    withMatchDetails: number;
    withEventDate: number;
    alreadyHasDataSource: number;
}> {
    const preview = {
        totalBets: 0,
        withMatchDetails: 0,
        withEventDate: 0,
        alreadyHasDataSource: 0
    };

    try {
        const betsSnapshot = await getDocs(collectionGroup(db, "bets"));
        preview.totalBets = betsSnapshot.size;

        for (const betDoc of betsSnapshot.docs) {
            const bet = betDoc.data();

            if (bet.dataSource) {
                preview.alreadyHasDataSource++;
            }
            if (bet.matchDetails?.homeTeam && bet.matchDetails?.awayTeam) {
                preview.withMatchDetails++;
            }
            if (bet.eventDate) {
                preview.withEventDate++;
            }
        }

        return preview;

    } catch (error) {
        console.error("Preview failed:", error);
        throw error;
    }
}
