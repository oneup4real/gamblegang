
// This file assumes functions/src/index.ts is where I should add the code.
// I will create a new function `autoFinalizeBets` which processes PROOFING -> RESOLVED.

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";


// Required Interfaces (Duplicated from client code effectively)
interface League {
    mode: "STANDARD" | "ZERO_SUM";
    matchSettings?: {
        exact: number;
        diff: number;
        winner: number;
        choice: number;
        range: number;
        excludeDrawDiff?: boolean;
    };
    disputeWindowHours?: number;
}

interface Bet {
    id: string;
    leagueId: string;
    type: "CHOICE" | "MATCH" | "RANGE";
    question: string;
    status: string;
    totalPool: number;
    winningOutcome?: any;
    disputeDeadline?: Timestamp;
    disputeActive?: boolean;
    autoFinalize?: boolean; // If specifically set
}

interface Wager {
    id: string;
    userId: string;
    amount: number;
    selection: any;
    powerUp?: string;
    status?: string;
    payout?: number;
}

interface LeagueMember {
    points: number;
    recentResults?: string[];
}

export const autoFinalizeBets = onSchedule("every 15 minutes", async () => {
    const db = getFirestore();
    logger.info("Starting Auto-Finalize Job (PROOFING -> RESOLVED)");
    const now = Timestamp.now();

    // Query Bets in PROOFING state with expired dispute deadline
    // Note: Requires Index on collectionGroup "bets": status (ASC) + disputeDeadline (ASC)
    const betsSnapshot = await db.collectionGroup("bets")
        .where("status", "==", "PROOFING")
        .where("disputeDeadline", "<", now)
        .get();

    if (betsSnapshot.empty) {
        logger.info("No bets ready for finalization.");
        return;
    }

    logger.info(`Found ${betsSnapshot.size} bets to finalize.`);

    const updates: Promise<any>[] = [];

    for (const doc of betsSnapshot.docs) {
        const bet = { id: doc.id, ...doc.data() } as Bet;
        const leagueId = doc.ref.parent.parent?.id;

        if (!leagueId) continue;
        if (bet.disputeActive) {
            logger.info(`Skipping Bet ${bet.id} - Dispute is active.`);
            continue;
        }

        updates.push((async () => {
            try {
                // Fetch League for Settings
                const leagueDoc = await db.collection("leagues").doc(leagueId).get();
                if (!leagueDoc.exists) {
                    logger.error(`League ${leagueId} not found for bet ${bet.id}`);
                    return;
                }
                const league = leagueDoc.data() as League;

                // Fetch Wagers
                const wagersSnapshot = await db.collection("leagues").doc(leagueId).collection("bets").doc(bet.id).collection("wagers").get();
                const wagers = wagersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Wager));

                // Batch for updates
                const batch = db.batch();

                // 1. Calculate Payouts
                const outcome = bet.winningOutcome;
                let zeroSumOdds = 1;
                let isZeroSumRefund = false;

                if (league.mode === "ZERO_SUM") {
                    const winningWagers = wagers.filter(w => {
                        if (typeof outcome === 'object' && typeof w.selection === 'object') {
                            return outcome.home === w.selection.home && outcome.away === w.selection.away;
                        }
                        return String(w.selection) === String(outcome);
                    });

                    const winningPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);

                    if (winningPool > 0) {
                        zeroSumOdds = bet.totalPool / winningPool;
                    } else {
                        isZeroSumRefund = true;
                    }
                }

                // Calculate Winners & Payouts
                for (const wager of wagers) {
                    let isWinner = false;
                    let payout = 0;

                    // Check if won (Generic Check)
                    if (typeof outcome === 'object' && typeof wager.selection === 'object') {
                        if (outcome.home === wager.selection.home && outcome.away === wager.selection.away) {
                            isWinner = true;
                        }
                    } else {
                        if (String(wager.selection) === String(outcome)) {
                            isWinner = true;
                        }
                    }

                    // ARCADE MODE LOGIC
                    if (league.mode === "STANDARD") {
                        const settings = league.matchSettings || { exact: 3, diff: 2, winner: 1, choice: 1, range: 1 };

                        let powerUpMult = 1;
                        if (wager.powerUp === 'x2') powerUpMult = 2;
                        else if (wager.powerUp === 'x3') powerUpMult = 3;
                        else if (wager.powerUp === 'x4') powerUpMult = 4;

                        if (typeof outcome === 'object' && typeof wager.selection === 'object') {
                            // MATCH BET logic
                            const oH = outcome.home;
                            const oA = outcome.away;
                            const pH = wager.selection.home;
                            const pA = wager.selection.away;

                            let points = 0;

                            // 1. Exact Result
                            if (oH === pH && oA === pA) {
                                points = Math.max(points, settings.exact);
                                isWinner = true;
                            }

                            // 2. Correct Difference
                            const diff = oH - oA;
                            if (diff === (pH - pA)) {
                                const isDraw = diff === 0;
                                if (isDraw && settings.excludeDrawDiff) {
                                    // Skip
                                } else {
                                    points = Math.max(points, settings.diff);
                                    if (settings.diff > 0) isWinner = true;
                                }
                            }

                            // 3. Correct Winner
                            const outcomeTendency = oH > oA ? 'H' : (oH < oA ? 'A' : 'D');
                            const predTendency = pH > pA ? 'H' : (pH < pA ? 'A' : 'D');

                            if (outcomeTendency === predTendency) {
                                points = Math.max(points, settings.winner);
                                if (settings.winner > 0) isWinner = true;
                            }

                            payout = points * powerUpMult;

                        } else {
                            // Simple Choice/Range
                            if (isWinner) {
                                let base = settings.choice || 1;
                                if (bet.type === 'RANGE') base = settings.range || 1;
                                payout = base * powerUpMult;
                            }
                        }
                    } else {
                        // ZERO SUM
                        if (isZeroSumRefund) {
                            payout = wager.amount; // Refund
                        } else if (isWinner) {
                            // Floor to integer for simplicity in points
                            payout = Math.floor(wager.amount * zeroSumOdds);
                        }
                    }

                    // Determine Result Char
                    let resultChar: 'W' | 'L' | 'P' = 'L';
                    if (isZeroSumRefund) resultChar = 'P';
                    else if (payout > 0) resultChar = 'W';

                    // Update Member History & Points
                    const memberRef = db.collection("leagues").doc(leagueId).collection("members").doc(wager.userId);
                    // Note: We're doing a blind write here for points. Ideally transaction, but batch is atomic.
                    // We need to fetch current recentResults to prepend. 
                    // To avoid N reads, we could just use arrayUnion? No, order matters (recent 10).
                    // We'll read the member.
                    const memberSnap = await memberRef.get();
                    if (memberSnap.exists) {
                        const mData = memberSnap.data() as LeagueMember;
                        const oldHistory = mData.recentResults || [];
                        const newHistory = [resultChar, ...oldHistory].slice(0, 10);

                        const memberUpdates: any = { recentResults: newHistory };
                        if (payout > 0) {
                            memberUpdates.points = FieldValue.increment(payout);
                        }
                        batch.update(memberRef, memberUpdates);
                    }

                    // Update Wager
                    batch.update(doc.ref.collection("wagers").doc(wager.id), {
                        status: isZeroSumRefund ? "PUSH" : (payout > 0 ? "WON" : "LOST"),
                        payout
                    });
                }

                // Update Bet Status
                batch.update(doc.ref, {
                    status: "RESOLVED",
                    resolvedAt: Timestamp.now(),
                    resolvedBy: "auto-scheduler",
                    lastUpdatedBy: "finalize-scheduler"
                });

                // Log Activity
                const activityRef = db.collection("leagues").doc(leagueId).collection("activityLog");
                batch.create(activityRef.doc(), {
                    timestamp: Timestamp.now(),
                    type: "BET_RESOLVED",
                    actorId: "auto-scheduler",
                    actorName: "Auto-Finalizer",
                    targetId: bet.id,
                    targetName: bet.question,
                    message: `Bet "${bet.question}" auto-finalized. Payouts distributed.`
                });

                await batch.commit();
                logger.info(`Successfully finalized bet ${bet.id}`);

            } catch (err) {
                logger.error(`Error finalizing bet ${bet.id}:`, err);
            }
        })());
    }

    await Promise.all(updates);
    logger.info("Auto-Finalize Job Complete");
});
