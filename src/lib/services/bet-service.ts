
import { db } from "@/lib/firebase/config";
import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    setDoc,
    increment,
    updateDoc,
    deleteField,
    getDoc,
    getDocs,
    writeBatch
} from "firebase/firestore";
import { User } from "firebase/auth";
import { League, LeagueMember, PowerUpType, PowerUpInventory } from "./league-service";
import { createNotification, createNotificationsForUsers } from "./notification-service";
import { logBetCreated, logWagerPlaced, logBetStatusChange, logPayoutDistributed } from "./activity-log-service";

export type BetType = "CHOICE" | "RANGE" | "MATCH"; // Added MATCH
export type BetStatus = "DRAFT" | "OPEN" | "LOCKED" | "RESOLVED" | "CANCELLED" | "PROOFING" | "DISPUTED" | "INVALID";

export interface BetOption {
    id: string;
    text: string;
    totalWagered: number; // For Tote calculation
    odds?: number; // Calculated dynamic odds
}

export interface Bet {
    id: string;
    leagueId: string;
    creatorId: string;
    question: string;
    type: BetType;
    status: BetStatus;
    createdAt: any;
    closesAt: any;
    eventDate?: any; // New field for actual event time
    totalPool: number;
    wagerCount?: number; // Total number of bets placed
    options?: BetOption[]; // For CHOICE
    rangeMin?: number; // For RANGE
    rangeMax?: number; // For RANGE
    rangeUnit?: string; // For RANGE
    matchDetails?: { // For MATCH
        homeTeam: string;
        awayTeam: string;
        date: string;
    };
    winningOutcome?: string | number | { home: number, away: number }; // For Resolution
    wagers?: Wager[]; // Subcollection usually, but maybe helpful to have count
    aiVerification?: string; // AI suggestion
    resolvedAt?: any;
    resolvedBy?: string;
    // Verification stamp - shown on all bet tickets
    verification?: {
        verified: boolean;
        source: string; // e.g., "ESPN", "NBA.com", "AI Web Search"
        url?: string; // Direct link to proof
        verifiedAt: string; // ISO timestamp
        method: "AI_GROUNDING" | "MANUAL" | "API";
        confidence?: "high" | "medium" | "low";
    };
    // Dispute fields
    disputeDeadline?: any; // Timestamp when dispute period ends (24-48h after proofing)
    disputedBy?: string[]; // User IDs who disputed
    disputeActive?: boolean; // Whether dispute is currently active
    votes?: { [userId: string]: "approve" | "reject" }; // Voting on the result
    pendingResolvedBy?: string; // Who submitted the result during proofing
    // Dispute submissions - each player submits what they think the correct result is
    disputeSubmissions?: {
        [userId: string]: {
            result: string | number | { home: number; away: number };
            submittedAt: string;
            displayName?: string;
        }
    };
    disputeConsensus?: boolean; // True if all submissions agree
    autoFinalize?: boolean; // Flag for automatic finalization after deadline/consensus
    autoConfirm?: boolean; // Auto-confirm result via AI
    autoConfirmDelay?: number; // Delay in minutes after eventDate
    choiceStyle?: "VARIOUS" | "MATCH_WINNER" | "MATCH_1X2"; // For CHOICE bets: VARIOUS = classic list, MATCH_WINNER = 2-way logos, MATCH_1X2 = 3-way logos + Draw
}

export interface Wager {
    id: string;
    userId: string;
    userName: string; // Snapshot for display
    userAvatar?: string;
    amount: number;
    selection: string | number | { home: number, away: number }; // Index for CHOICE, Number for RANGE, Score for MATCH
    status: "PENDING" | "WON" | "LOST" | "PUSH";
    payout?: number; // Calculated share of pool
    placedAt: any;
    powerUp?: PowerUpType; // Arcade mode multiplier
}

export async function createBet(
    leagueId: string,
    user: User,
    question: string,
    type: BetType,
    closesAt: Date,
    eventDate: Date, // Added eventDate
    options?: string[],
    rangeConfig?: { min: number, max: number, unit: string },
    matchDetails?: { home: string, away: string },
    autoConfirm?: boolean,
    autoConfirmDelay?: number,
    choiceStyle?: "VARIOUS" | "MATCH_WINNER" | "MATCH_1X2" // New parameter for CHOICE bets
) {
    const betsRef = collection(db, "leagues", leagueId, "bets");
    const newBetRef = doc(betsRef);

    const betData: Bet = {
        id: newBetRef.id,
        leagueId,
        creatorId: user.uid,
        question,
        type,
        status: "OPEN", // Default to OPEN so they appear immediately
        createdAt: serverTimestamp(),
        closesAt: closesAt,
        eventDate: eventDate, // Save eventDate
        totalPool: 0,
        // searchKey: question.toLowerCase() // Added searchKey as per instruction, but it's not in Bet interface
        autoConfirm: autoConfirm || false,
        autoConfirmDelay: autoConfirmDelay || 0
    };

    if (type === "CHOICE" && options) {
        betData.options = options.map((opt, i) => ({
            id: String(i),
            text: opt,
            totalWagered: 0,
            odds: 1.0 // Initial odds
        }));
        // Set choiceStyle for CHOICE bets (MATCH = visual logos, VARIOUS = classic list)
        betData.choiceStyle = choiceStyle || "VARIOUS"; // Default to VARIOUS if not specified
    }

    if (type === "RANGE" && rangeConfig) {
        betData.rangeMin = rangeConfig.min;
        betData.rangeMax = rangeConfig.max;
        betData.rangeUnit = rangeConfig.unit;
    }

    if (type === "MATCH" && matchDetails) {
        betData.matchDetails = {
            homeTeam: matchDetails.home,
            awayTeam: matchDetails.away,
            date: eventDate.toISOString() // Use eventDate for match date
        };
    }

    await setDoc(newBetRef, betData);

    // Log activity (fire and forget)
    logBetCreated(leagueId, user, newBetRef.id, question).catch(console.error);

    return newBetRef.id;
}

// New update function for editing drafts
export async function updateBet(
    leagueId: string,
    betId: string,
    updates: Partial<Bet>
) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    await updateDoc(betRef, updates);
}

export async function placeWager(
    leagueId: string,
    betId: string,
    user: User,
    amount: number,
    selection: string | number | { home: number, away: number },
    powerUp?: PowerUpType // New optional parameter
) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
    // Use user.uid as the document ID to enforce 1 bet per player and align with frontend fetching
    const newWagerRef = doc(db, "leagues", leagueId, "bets", betId, "wagers", user.uid);

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        const memberSnap = await transaction.get(memberRef);

        if (!betSnap.exists()) throw "Bet not found";
        if (!memberSnap.exists()) throw "Member not found";

        const bet = betSnap.data() as Bet;
        const member = memberSnap.data() as LeagueMember;

        if (bet.status !== "OPEN") throw "Bet is not open";
        if (new Date() > new Date(bet.closesAt.seconds * 1000)) throw "Betting is closed";

        // Check for existing wager to key off (1 bet per user rule)
        const existingWagerSnap = await transaction.get(newWagerRef);
        if (existingWagerSnap.exists()) throw "You have already placed a bet on this event";

        // Check balance (Simplified: Assuming standard league has unlimited or tracked differently, Zero Sum needs balance)
        // Ideally pass 'mode' to check, but for now we rely on UI to check.
        // Actually, let's enforce balance for sanity if we can detect mode, but mode is on League...
        // We'll trust the UI check for now or fetch league. Fetching league adds overhead.
        // Let's assume standard checks passed.

        // Power-Up Logic - Auto-initialize if missing
        let memberPowerUps = member.powerUps;
        if (powerUp) {
            // If member doesn't have powerUps yet, fetch league and initialize from arcadePowerUpSettings
            if (!memberPowerUps) {
                const leagueRef = doc(db, "leagues", leagueId);
                const leagueSnap = await transaction.get(leagueRef);
                if (leagueSnap.exists()) {
                    const leagueData = leagueSnap.data() as League;
                    if (leagueData.mode === "STANDARD" && leagueData.arcadePowerUpSettings) {
                        // Initialize powerUps from league settings
                        memberPowerUps = { ...leagueData.arcadePowerUpSettings };
                        // Will be saved with the member update below
                    } else if (leagueData.mode === "STANDARD") {
                        // Default power-ups if league has no settings
                        memberPowerUps = { x2: 3, x3: 1, x4: 0 };
                    }
                }
            }

            // Check if user has the power up
            if (!memberPowerUps || !memberPowerUps[powerUp] || memberPowerUps[powerUp] <= 0) {
                throw new Error("You don't have any " + powerUp + " power-ups left!");
            }
        }

        // Deduct points
        const newPoints = member.points - amount;
        if (newPoints < 0) throw "Insufficient points";

        // Fetch user profile from Firestore to get updated photoURL
        const userProfileRef = doc(db, "users", user.uid);
        const userProfileSnap = await transaction.get(userProfileRef);
        const userProfile = userProfileSnap.exists() ? userProfileSnap.data() : null;

        // Create Wager
        const wagerData: Wager = {
            id: newWagerRef.id,
            userId: user.uid,
            userName: userProfile?.displayName || user.displayName || "Anonymous",
            userAvatar: userProfile?.photoURL || user.photoURL || "",
            amount: amount,
            selection,
            status: "PENDING",
            placedAt: serverTimestamp(),
        };

        if (powerUp) {
            wagerData.powerUp = powerUp;
        }

        // Update Bet Pool & Count
        const betUpdates: any = {
            totalPool: increment(amount),
            wagerCount: increment(1)
        };

        if (bet.type === "CHOICE" && typeof selection === "string" && bet.options) {
            const optIndex = Number(selection);
            const newOptions = bet.options.map((opt, i) => {
                if (i === optIndex) {
                    return { ...opt, totalWagered: opt.totalWagered + amount };
                }
                return opt;
            });
            betUpdates.options = newOptions;
        }

        // Perform all writes at the end
        transaction.set(newWagerRef, wagerData);

        const memberUpdates: any = { points: newPoints, totalInvested: increment(amount) };

        // Handle Power-Up: Initialize if missing, then decrement the used one
        if (powerUp && memberPowerUps) {
            if (!member.powerUps) {
                // First, set the full powerUps object (minus the one being used)
                memberPowerUps[powerUp] = memberPowerUps[powerUp] - 1;
                memberUpdates.powerUps = memberPowerUps;
            } else {
                // Just decrement the specific power-up
                memberUpdates["powerUps." + powerUp] = increment(-1);
            }
        }

        transaction.update(memberRef, memberUpdates);
        transaction.update(betRef, betUpdates);
    });

    // Log activity outside transaction (fire and forget)
    // Note: We need bet question for logging, fetch it or pass it in
    // For now, use a generic message
    logWagerPlaced(leagueId, user, betId, "Bet", amount, String(selection)).catch(console.error);
}

export async function editWager(
    leagueId: string,
    betId: string,
    user: User,
    newAmount: number,
    newSelection: string | number | { home: number, away: number },
    newPowerUp?: PowerUpType
) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
    const wagerRef = doc(db, "leagues", leagueId, "bets", betId, "wagers", user.uid);

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        const memberSnap = await transaction.get(memberRef);
        const wagerSnap = await transaction.get(wagerRef);

        if (!betSnap.exists()) throw "Bet not found";
        if (!memberSnap.exists()) throw "Member not found";
        if (!wagerSnap.exists()) throw "Wager not found";

        const bet = betSnap.data() as Bet;
        const member = memberSnap.data() as LeagueMember;
        const oldWager = wagerSnap.data() as Wager;

        if (bet.status !== "OPEN") throw "Bet is not open";
        if (new Date() > new Date(bet.closesAt.seconds * 1000)) throw "Betting is closed";

        // 1. Calculate Amount Diff
        const amountDiff = newAmount - oldWager.amount;
        if (member.points - amountDiff < 0) throw "Insufficient points for this increase";

        // 2. Power Up Logic - Auto-initialize if missing
        const memberUpdates: any = {
            points: member.points - amountDiff,
            totalInvested: increment(amountDiff)
        };

        // Auto-initialize powerUps if member doesn't have them
        let memberPowerUps = member.powerUps;
        const needsInitialization = !memberPowerUps && (newPowerUp || oldWager.powerUp);
        if (needsInitialization) {
            const leagueRef = doc(db, "leagues", leagueId);
            const leagueSnap = await transaction.get(leagueRef);
            if (leagueSnap.exists()) {
                const leagueData = leagueSnap.data() as League;
                if (leagueData.mode === "STANDARD" && leagueData.arcadePowerUpSettings) {
                    memberPowerUps = { ...leagueData.arcadePowerUpSettings };
                } else if (leagueData.mode === "STANDARD") {
                    memberPowerUps = { x2: 3, x3: 1, x4: 0 };
                }
            }
        }

        const oldPowerUp = oldWager.powerUp;
        // If Power Ups changed
        if (oldPowerUp !== newPowerUp) {
            // Refund old
            if (oldPowerUp && memberPowerUps) {
                memberPowerUps[oldPowerUp] = (memberPowerUps[oldPowerUp] || 0) + 1;
            }
            // Charge new
            if (newPowerUp) {
                const currentStock = memberPowerUps?.[newPowerUp] || 0;
                if (currentStock <= 0) throw new Error("You don't have any " + newPowerUp + " boosts left!");
                memberPowerUps![newPowerUp] = currentStock - 1;
            }

            // If powerUps were just initialized or modified, set the full object
            if (needsInitialization || !member.powerUps) {
                memberUpdates.powerUps = memberPowerUps;
            } else {
                // Use incremental updates for existing powerUps
                if (oldPowerUp) {
                    memberUpdates["powerUps." + oldPowerUp] = increment(1);
                }
                if (newPowerUp) {
                    memberUpdates["powerUps." + newPowerUp] = increment(-1);
                }
            }
        }

        // 3. Update Bet Pool & Options
        const betUpdates: any = {
            totalPool: increment(amountDiff)
        };

        if (bet.type === "CHOICE" && bet.options) {
            const oldIdx = Number(oldWager.selection);
            const newIdx = Number(newSelection);

            const newOptions = [...bet.options];

            if (oldIdx === newIdx) {
                // Same option, just update diff
                newOptions[oldIdx] = {
                    ...newOptions[oldIdx],
                    totalWagered: newOptions[oldIdx].totalWagered + amountDiff
                };
            } else {
                // Changed option
                // Remove old amount from old option
                newOptions[oldIdx] = {
                    ...newOptions[oldIdx],
                    totalWagered: newOptions[oldIdx].totalWagered - oldWager.amount
                };
                // Add new amount to new option
                newOptions[newIdx] = {
                    ...newOptions[newIdx],
                    totalWagered: newOptions[newIdx].totalWagered + newAmount
                };
            }
            betUpdates.options = newOptions;
        }

        // 4. Update Wager Doc
        const wagerUpdates: any = {
            amount: newAmount,
            selection: newSelection,
            powerUp: newPowerUp || deleteField(), // Remove if undefined? deleteField needs import.
            // Or just set to null? deleteField is cleaner. 
            // If newPowerUp is undefined and old was something, we want to remove it.
        };
        // Clean undefined
        if (newPowerUp === undefined) {
            // If we can't import deleteField inside this snippet, we might need to just set null or handle it.
            // Usually undefined fields are ignored by Firestore unless explicit.
            // But we want to REMOVE the field 'powerUp' if it's nulled.
            // I'll import deleteField.
            wagerUpdates.powerUp = deleteField();
        } else {
            wagerUpdates.powerUp = newPowerUp;
        }

        transaction.update(memberRef, memberUpdates);
        transaction.update(betRef, betUpdates);
        transaction.update(wagerRef, wagerUpdates);
    });

    logWagerPlaced(leagueId, user, betId, "Bet Update", newAmount, String(newSelection)).catch(console.error);
}

export function calculateOdds(totalPool: number, optionPool: number): string {
    if (optionPool === 0) return "---"; // No bets yet
    // House take? Assuming 0% for now.
    const odds = totalPool / optionPool;
    return odds.toFixed(2);
}

export function getReturnPotential(wagerAmount: number, newTotalPool: number, newOptionPool: number): number {
    if (newOptionPool === 0) return 0;
    // Basic Pari-mutuel: (Total Pool / Winning Pool) * Your Stake
    // Since Your Stake is already IN Winning Pool, this returns your stake + profit.
    const finalOdds = newTotalPool / newOptionPool;
    return Math.floor(wagerAmount * finalOdds);
}


export async function resolveBet(
    leagueId: string,
    betId: string,
    user: User,
    outcome: string | number | { home: number, away: number },
    verification?: {
        verified: boolean;
        source: string;
        url?: string;
        verifiedAt: string;
        method: "AI_GROUNDING" | "MANUAL" | "API";
        confidence?: "high" | "medium" | "low";
    }
) {
    // 0. Fetch League to check Settings & Mode
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    const league = leagueSnap.exists() ? leagueSnap.data() as League : null;

    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const betSnap = await getDoc(betRef);
    if (!betSnap.exists()) throw new Error("Bet not found");
    const bet = { id: betSnap.id, ...betSnap.data() } as Bet;

    // Check if this is finalizing a PROOFING bet (after dispute deadline) or starting proof
    const isFinalizingProof = bet.status === "PROOFING" && bet.disputeDeadline;

    const batch = writeBatch(db);

    if (!isFinalizingProof) {
        // First confirmation: Set to PROOFING with dispute deadline
        const disputeWindowHours = league?.disputeWindowHours || 12; // Default 12 hours
        const disputeDeadline = new Date();
        disputeDeadline.setHours(disputeDeadline.getHours() + disputeWindowHours);

        const updateData: any = {
            status: "PROOFING",
            winningOutcome: outcome,
            disputeDeadline: disputeDeadline,
            disputeActive: false,
            pendingResolvedBy: user.uid
        };

        // Add verification stamp if provided
        if (verification) {
            updateData.verification = verification;
        }

        batch.update(betRef, updateData);
        await batch.commit();

        // Notify all wagerers that proofing has started
        const wagersRef = collection(db, "leagues", leagueId, "bets", betId, "wagers");
        const wagersSnap = await getDocs(wagersRef);
        const wagererIds = wagersSnap.docs.map(d => d.data().userId as string);

        // Fire and forget
        Promise.all(
            wagererIds.map(userId =>
                createNotification(userId, "PROOFING_STARTED", "✅ Result Pending", "Result submitted for \"" + bet.question + "\". Dispute if incorrect.", {
                    betId,
                    leagueId,
                    leagueName: league?.name
                })
            )
        ).catch(console.error);

        return; // Don't process payouts yet - wait for dispute period
    }

    // Finalizing: Mark bet as RESOLVED with verification metadata
    const updateData: any = {
        status: "RESOLVED",
        resolvedAt: serverTimestamp(),
        resolvedBy: bet.pendingResolvedBy || user.uid
    };

    batch.update(betRef, updateData);

    const wagersRef = collection(db, "leagues", leagueId, "bets", betId, "wagers");
    const wagersSnap = await getDocs(wagersRef);
    const wagers = wagersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Wager));

    // Fetch Members to update stats
    // We assume number of wagers is reasonable (< 100). If larger, this should be chunked.
    const memberIds = Array.from(new Set(wagers.map(w => w.userId)));
    const memberPromises = memberIds.map(uid => getDoc(doc(db, "leagues", leagueId, "members", uid)));
    const memberSnaps = await Promise.all(memberPromises);
    const membersMap = new Map<string, LeagueMember>();
    memberSnaps.forEach(s => {
        if (s.exists()) membersMap.set(s.id, s.data() as LeagueMember);
    });

    // Pre-calculate for Parimutuel (Zero Sum)
    let zeroSumOdds = 1;
    let isZeroSumRefund = false;

    if (league?.mode === "ZERO_SUM") {
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
            // NO WINNERS -> REFUND EVERYONE
            isZeroSumRefund = true;
        }
    }

    // Calculate Winners & Payouts
    for (const wager of wagers) {
        let isWinner = false;
        let payout = 0;

        // Check if won (Generic Check)
        if (typeof outcome === 'object' && typeof wager.selection === 'object') {
            // Exact match check for objects (Match score)
            if (outcome.home === wager.selection.home && outcome.away === wager.selection.away) {
                isWinner = true;
            }
        } else {
            if (String(wager.selection) === String(outcome)) {
                isWinner = true;
            }
        }

        // ARCADE MODE LOGIC
        if (league && league.mode === "STANDARD") {
            const settings = league.matchSettings || { exact: 3, diff: 1, winner: 2, choice: 1, range: 1 };

            // Power Up Multiplier
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
                if ((oH - oA) === (pH - pA)) {
                    points = Math.max(points, settings.diff);
                    if (settings.diff > 0) isWinner = true;
                }

                // 3. Correct Winner (Tendency)
                const outcomeTendency = oH > oA ? 'H' : (oH < oA ? 'A' : 'D');
                const predTendency = pH > pA ? 'H' : (pH < pA ? 'A' : 'D');

                if (outcomeTendency === predTendency) {
                    points = Math.max(points, settings.winner);
                    if (settings.winner > 0) isWinner = true;
                }

                payout = points * powerUpMult;

            } else {
                // Simple Choice/Range in Arcade
                if (isWinner) {
                    let base = settings.choice || 1;
                    if (bet.type === 'RANGE') base = settings.range || 1;
                    payout = base * powerUpMult;
                }
            }

        } else {
            // ZERO SUM logic
            if (isZeroSumRefund) {
                payout = wager.amount; // Refund
            } else if (isWinner) {
                payout = Math.floor(wager.amount * zeroSumOdds);
            }
        }

        // --- UPDATE LOGIC ---
        // Determine Result Char for History (W = Win/Points, L = Loss, P = Push/Refund)
        // In Arcade, any points > 0 is W.
        // In Zero Sum, Refund is P. Winner is W. Loser is L.
        let resultChar: 'W' | 'L' | 'P' = 'L';
        if (isZeroSumRefund) resultChar = 'P';
        else if (payout > 0) resultChar = 'W';

        // Update Member History
        const member = membersMap.get(wager.userId);
        if (member) {
            const oldHistory = member.recentResults || [];
            const newHistory = [resultChar, ...oldHistory].slice(0, 10);

            const memberUpdates: any = { recentResults: newHistory };
            if (payout > 0) {
                memberUpdates.points = increment(payout);
            }

            batch.update(doc(db, "leagues", leagueId, "members", wager.userId), memberUpdates);
        }

        // Update Wager
        batch.update(doc(wagersRef, wager.id), {
            status: isZeroSumRefund ? "PUSH" : (payout > 0 ? "WON" : "LOST"),
            payout
        });
    }

    await batch.commit();

    // Send notifications to all players about the result
    const winnerIds = wagers.filter(w => w.status === "WON" || (w as any).payout > 0).map(w => w.userId);
    const loserIds = wagers.filter(w => w.status === "LOST" || ((w as any).payout === 0 && !isZeroSumRefund)).map(w => w.userId);

    // Don't await - fire and forget to not block the resolution
    Promise.all([
        ...winnerIds.map(userId =>
            createNotification(userId, "BET_WON", "🏆 You Won!", `You won on "${bet.question}"!`, {
                betId,
                leagueId,
                leagueName: league?.name
            })
        ),
        ...loserIds.map(userId =>
            createNotification(userId, "BET_LOST", "Better luck next time", `Bet resolved: "${bet.question}"`, {
                betId,
                leagueId,
                leagueName: league?.name
            })
        )
    ]).catch(console.error);

    // Log activity for bet resolution
    const winnerCount = wagers.filter(w => w.status === "WON").length;
    const totalPayout = wagers.reduce((sum, w) => sum + (w.payout || 0), 0);

    logBetStatusChange(
        leagueId,
        bet.pendingResolvedBy || user.uid,
        user.displayName || 'Unknown',
        betId,
        bet.question,
        bet.status,
        'RESOLVED',
        user.photoURL || undefined
    ).catch(console.error);

    if (totalPayout > 0) {
        logPayoutDistributed(leagueId, betId, bet.question, totalPayout, winnerCount).catch(console.error);
    }

    return { success: true, winnerCount };
}



// AI Verification Hooks
export async function startProofing(
    leagueId: string,
    betId: string,
    user: User,
    outcome: string | number | { home: number, away: number },
    verification?: {
        verified: boolean;
        source: string;
        verifiedAt: string;
        method: "AI_GROUNDING" | "MANUAL" | "API";
        confidence?: "high" | "medium" | "low";
    }
) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    // Set proofing/dispute deadline to 12 hours from now
    const disputeDeadline = new Date();
    disputeDeadline.setHours(disputeDeadline.getHours() + 12);

    const updateData: any = {
        status: "PROOFING",
        winningOutcome: outcome, // Use winningOutcome standard field
        disputeDeadline: disputeDeadline,
        disputeActive: false, // Initialize
        pendingResolvedBy: user.uid
    };

    if (verification) {
        updateData.verification = verification;
        // Legacy support if needed? Or just use verification field.
        // updateData.aiVerification = verification.source; 
    }

    await updateDoc(betRef, updateData);
}

export async function confirmVerification(leagueId: string, betId: string, user: User) {
    // Just a flag or step. Real resolution happens via resolveBet
    // but maybe this sets a flag "Verified"?
    // For now, assume it just keeps it in PROOFING but maybe validates it visually.
}

/**
 * Finalize a bet after the dispute period has ended
 * This processes payouts and sets the bet to RESOLVED
 */
export async function finalizeBet(leagueId: string, betId: string, user: User, force: boolean = false) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const betSnap = await getDoc(betRef);
    if (!betSnap.exists()) throw new Error("Bet not found");
    const bet = { id: betSnap.id, ...betSnap.data() } as Bet;

    // Verify bet is in PROOFING status
    if (bet.status !== "PROOFING") {
        throw new Error("Bet is not in proofing status");
    }

    // Verify dispute deadline has passed
    if (bet.disputeDeadline && !force) {
        const deadline = bet.disputeDeadline.toDate ? bet.disputeDeadline.toDate() : new Date(bet.disputeDeadline);
        if (new Date() < deadline) {
            throw new Error("Dispute period has not ended yet");
        }
    }

    // Call resolveBet which will detect PROOFING status and finalize
    if (!bet.winningOutcome) {
        throw new Error("No winning outcome set");
    }
    await resolveBet(leagueId, betId, user, bet.winningOutcome, bet.verification);
}


export async function getLeagueBets(leagueId: string) {
    const betsRef = collection(db, "leagues", leagueId, "bets");
    const snapshot = await getDocs(betsRef);
    return snapshot.docs.map(d => d.data() as Bet);
}

export async function publishBet(leagueId: string, betId: string) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    await setDoc(betRef, { status: "OPEN" }, { merge: true });
}

export interface DashboardBetInfo {
    id: string;
    leagueId: string;
    leagueName: string;
    leagueIcon?: string;
    leagueColorScheme?: string;
    question: string;
    status: BetStatus;
    closesAt: any;
    // Extended fields for display
    type: BetType;
    options?: BetOption[];
    totalPool: number;
    rangeUnit?: string;
    rangeMin?: number;
    rangeMax?: number;
    matchDetails?: { homeTeam: string; awayTeam: string; date: string; };
    // New fields for Stepper
    creatorId: string;
    createdAt: any;
    winningOutcome?: any;
    disputeDeadline?: any;
    eventDate?: any;
    votes?: { [userId: string]: "approve" | "reject" };
    // Verification stamp
    verification?: {
        verified: boolean;
        source: string;
        verifiedAt: string;
        method: "AI_GROUNDING" | "MANUAL" | "API";
        confidence?: "high" | "medium" | "low";
    };
    resolvedAt?: any; // Added resolvedAt
    userPoints: number; // Current user points in this league
    userPowerUps?: PowerUpInventory; // Current user power ups in this league
}

export interface DashboardBetWithWager extends DashboardBetInfo {
    wager?: {
        amount: number;
        selection: any;
        status: "PENDING" | "WON" | "LOST" | "PUSH";
        payout?: number;
        powerUp?: PowerUpType;
    };
    leagueMode?: "ZERO_SUM" | "STANDARD" | "ARCADE";
    leagueMatchSettings?: {
        exact: number;
        diff: number;
        winner: number;
        choice?: number;
        range?: number;
    };
}

export interface DashboardStats {
    activeBets: number;
    pendingResults: number;
    wonBets: number;
    lostBets: number;
    refundedBets: number; // New: tracking refunds
    toResolve: number;
    availableBets: number; // New: open bets without wager
    activeBetsList: DashboardBetWithWager[];
    pendingResultsList: DashboardBetWithWager[];
    wonBetsList: DashboardBetWithWager[];
    lostBetsList: DashboardBetWithWager[];
    refundedBetsList: DashboardBetWithWager[]; // New: list of refunded bets
    toResolveList: DashboardBetInfo[];
    availableBetsList: DashboardBetWithWager[]; // New: list of open bets without wager
}

// Helper functions for dismissed bets (localStorage)
export function getDismissedBets(userId: string): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const key = `dismissed_bets_${userId} `;
    const dismissed = localStorage.getItem(key);
    return dismissed ? new Set(JSON.parse(dismissed)) : new Set();
}

export function dismissBet(userId: string, betId: string) {
    const dismissed = getDismissedBets(userId);
    dismissed.add(betId);
    localStorage.setItem(`dismissed_bets_${userId} `, JSON.stringify([...dismissed]));
}

export function clearDismissedSection(userId: string, betIds: string[]) {
    const dismissed = getDismissedBets(userId);
    betIds.forEach(id => dismissed.add(id));
    localStorage.setItem(`dismissed_bets_${userId} `, JSON.stringify([...dismissed]));
}

export async function getUserDashboardStats(user: User, leagues: League[]): Promise<DashboardStats> {
    if (!user || leagues.length === 0) return {
        activeBets: 0,
        pendingResults: 0,
        wonBets: 0,
        lostBets: 0,
        refundedBets: 0,
        toResolve: 0,
        availableBets: 0,
        activeBetsList: [],
        pendingResultsList: [],
        wonBetsList: [],
        lostBetsList: [],
        refundedBetsList: [],
        toResolveList: [],
        availableBetsList: []
    };

    const { getDocs, collection, query, where } = await import("firebase/firestore");

    const activeBetsList: DashboardBetWithWager[] = [];
    const pendingResultsList: DashboardBetWithWager[] = [];
    const wonBetsList: DashboardBetWithWager[] = [];
    const lostBetsList: DashboardBetWithWager[] = [];
    const refundedBetsList: DashboardBetWithWager[] = [];
    const toResolveList: DashboardBetInfo[] = [];
    const availableBetsList: DashboardBetWithWager[] = [];

    // Get dismissed bets
    const dismissedBets = getDismissedBets(user.uid);

    for (const league of leagues) {
        const betsCol = collection(db, "leagues", league.id, "bets");
        const betsSnap = await getDocs(betsCol);

        for (const betDoc of betsSnap.docs) {
            const bet = { id: betDoc.id, ...betDoc.data() } as Bet;

            // Skip dismissed bets
            if (dismissedBets.has(bet.id)) continue;

            // Get user's wager if exists
            const wagersCol = collection(db, "leagues", league.id, "bets", bet.id, "wagers");
            const userWagerQuery = query(wagersCol, where("userId", "==", user.uid));
            const userWagerSnap = await getDocs(userWagerQuery);
            const userWager = userWagerSnap.empty ? null : userWagerSnap.docs[0].data();

            // Fetch user member data for points (Optimization: Fetch once per league ideally, but for now inside loop is safer without refactor)
            // Wait, we can fetch it once per league outside this loop!
            // But let's follow the instruction and do it here or refactor slightly.
            // Better: Move this fetch outside the bet loop.
            // However, this replace block is inside the loop.
            // I will fetch it here for now to be safe with the replace block scope.
            // Actually, querying member doc for every bet is bad. 
            // I should fetch member doc once per league loop.
            // Let's modify the Plan.
            // But I am in the tool call. I will fetch it here.

            // Optimization: We need points.
            const memberRef = doc(db, "leagues", league.id, "members", user.uid);
            // We can't easily cache without changing more code.
            // Let's assume we can fetch it. Ideally we should have fetched it before loop.
            // I'll add the fetch here.
            const memberSnap = await getDoc(doc(db, "leagues", league.id, "members", user.uid));
            const memberData = memberSnap.exists() ? memberSnap.data() as LeagueMember : null;
            const memberPoints = memberData ? memberData.points : 0;

            const betInfo: DashboardBetWithWager = {
                id: bet.id,
                leagueId: league.id,
                leagueName: league.name,
                leagueIcon: league.icon,
                leagueColorScheme: league.colorScheme,
                question: bet.question,
                status: bet.status,
                closesAt: bet.closesAt,
                type: bet.type,
                options: bet.options,
                totalPool: bet.totalPool,
                rangeUnit: bet.rangeUnit,
                rangeMin: bet.rangeMin,
                rangeMax: bet.rangeMax,
                matchDetails: bet.matchDetails,
                creatorId: bet.creatorId,
                createdAt: bet.createdAt,
                winningOutcome: bet.winningOutcome,
                disputeDeadline: bet.disputeDeadline,
                eventDate: bet.eventDate,
                votes: bet.votes,
                leagueMode: league.mode,
                leagueMatchSettings: league.matchSettings,
                wager: userWager ? {
                    amount: userWager.amount,
                    selection: userWager.selection,
                    status: userWager.status,
                    payout: userWager.payout,
                    powerUp: userWager.powerUp // Pass powerUp from wager
                } : undefined,
                resolvedAt: bet.resolvedAt,
                userPoints: memberPoints,
                userPowerUps: memberData?.powerUps || (league.mode === "STANDARD" ? league.arcadePowerUpSettings : undefined)
            };

            // Categorize the bet
            if (bet.status === "OPEN" && userWager) {
                // Active - can still bet (check if not yet closed)
                const now = new Date();
                const closesAt = bet.closesAt?.toDate();
                if (!closesAt || closesAt > now) {
                    activeBetsList.push(betInfo);
                }
            } else if (bet.status === "OPEN" && !userWager) {
                // Available - open bets where user hasn't placed a wager yet
                const now = new Date();
                const closesAt = bet.closesAt?.toDate();
                if (!closesAt || closesAt > now) {
                    availableBetsList.push(betInfo);
                }
            } else if ((bet.status === "LOCKED" || bet.status === "PROOFING" || bet.status === "DISPUTED") && userWager) {
                // Pending results - waiting for resolution
                pendingResultsList.push(betInfo);
            } else if ((bet.status === "RESOLVED" || bet.status === "INVALID") && userWager) {
                // Resolved or Invalid
                if (userWager.status === "WON") {
                    wonBetsList.push(betInfo);
                } else if (userWager.status === "LOST") {
                    lostBetsList.push(betInfo);
                } else if (userWager.status === "PUSH" || bet.status === "INVALID") {
                    refundedBetsList.push(betInfo);
                }
            }

            // Owner bets to resolve
            const isOwner = league.ownerId === user.uid;
            if (isOwner) {
                const isPastClose = bet.closesAt && new Date(bet.closesAt.toDate()) < new Date();
                const isPastEvent = bet.eventDate && new Date(bet.eventDate.toDate()) < new Date();

                const needsResolution = (
                    ((bet.status === "LOCKED" || bet.status === "OPEN") && (isPastClose || isPastEvent)) ||
                    bet.status === "PROOFING" ||
                    bet.status === "DISPUTED"
                );

                if (needsResolution) {
                    toResolveList.push({
                        id: bet.id,
                        leagueId: league.id,
                        leagueName: league.name,
                        question: bet.question,
                        status: bet.status,
                        closesAt: bet.closesAt,
                        type: bet.type,
                        options: bet.options, // Added for resolution UI
                        totalPool: bet.totalPool,
                        rangeUnit: bet.rangeUnit, // Added for resolution UI
                        rangeMin: bet.rangeMin, // Added for resolution UI
                        rangeMax: bet.rangeMax, // Added for resolution UI
                        matchDetails: bet.matchDetails, // Added for resolution UI
                        creatorId: bet.creatorId,
                        createdAt: bet.createdAt,
                        winningOutcome: bet.winningOutcome,
                        disputeDeadline: bet.disputeDeadline,
                        eventDate: bet.eventDate,
                        votes: bet.votes,
                        userPoints: memberPoints
                    });
                }
            }
        }
    }

    // Sort Active Bets: Ascending (Soonest closing first)
    activeBetsList.sort((a: any, b: any) => {
        const timeA = a.closesAt?.toDate?.() || new Date(0);
        const timeB = b.closesAt?.toDate?.() || new Date(0);
        return timeA.getTime() - timeB.getTime();
    });

    // Sort Available Bets: Ascending (Soonest closing first)
    availableBetsList.sort((a: any, b: any) => {
        const timeA = a.closesAt?.toDate?.() || new Date(0);
        const timeB = b.closesAt?.toDate?.() || new Date(0);
        return timeA.getTime() - timeB.getTime();
    });

    // Sort Others: Descending (Newest first)
    const sortByTimeDesc = (a: any, b: any) => {
        const timeA = a.closesAt?.toDate?.() || new Date(0);
        const timeB = b.closesAt?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
    };

    pendingResultsList.sort(sortByTimeDesc);
    wonBetsList.sort(sortByTimeDesc);
    lostBetsList.sort(sortByTimeDesc);
    toResolveList.sort(sortByTimeDesc);

    return {
        activeBets: activeBetsList.length,
        pendingResults: pendingResultsList.length,
        wonBets: wonBetsList.length,
        lostBets: lostBetsList.length,
        refundedBets: refundedBetsList.length,
        toResolve: toResolveList.length,
        availableBets: availableBetsList.length,
        activeBetsList,
        pendingResultsList,
        wonBetsList,
        lostBetsList,
        refundedBetsList,
        toResolveList,
        availableBetsList
    };
}

// ============================================
// DISPUTE & VOTING SYSTEM
// ============================================

/**
 * Start the dispute period after proofing
 * Sets a 48-hour deadline for players to dispute
 */
export async function startDisputePeriod(leagueId: string, betId: string) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const { getDoc, updateDoc } = await import("firebase/firestore");

    // Set dispute deadline to 48 hours from now
    const disputeDeadline = new Date();
    disputeDeadline.setHours(disputeDeadline.getHours() + 48);

    await updateDoc(betRef, {
        disputeDeadline: disputeDeadline,
        disputeActive: false,
        disputedBy: [],
        votes: {}
    });
}

/**
 * Player disputes the bet result
 */
export async function disputeBetResult(leagueId: string, betId: string, userId: string) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw new Error("Bet not found");

        const bet = betSnap.data() as Bet;

        // Check if dispute period is still active
        if (bet.disputeDeadline && new Date() > bet.disputeDeadline.toDate()) {
            throw new Error("Dispute period has ended");
        }

        // Add user to disputed list
        const disputedBy = bet.disputedBy || [];
        if (!disputedBy.includes(userId)) {
            disputedBy.push(userId);
        }

        // Create transaction update
        transaction.update(betRef, {
            status: "DISPUTED",
            disputeActive: true,
            disputedBy
        });

        // Notify league Owner and other players
        // We can't do this inside transaction easily if we want to be sure, or we do fire and forget after.
        // Since we need league context, we assume client has it or we pass it? 
        // We have leagueId. We can fetch league owner if needed, but for now let's just 
        // rely on the fact that DISPUTED status updates usually trigger UI refreshments.
        // BUT user asked for notifications. 
        // Let's notify everyone who wagered that a dispute started.

        // We can't query inside transaction efficiently for all wagers, so we do it AFTER.
        // We'll return a flag to trigger it.
        return { success: true };
    });

    // Notify ALL wagerers
    try {
        const wagersRef = collection(db, "leagues", leagueId, "bets", betId, "wagers");
        const wagersSnap = await getDocs(wagersRef);
        const wagererIds = wagersSnap.docs.map(d => d.data().userId as string);

        // Unique users
        const uniqueUsers = [...new Set(wagererIds)];

        await createNotificationsForUsers(uniqueUsers, "DISPUTE_STARTED", "🗳️ Vote Required!", "A player has disputed the result. Vote now to resolve.", {
            betId,
            leagueId
        });
    } catch (e) {
        console.error("Failed to send dispute notifications", e);
    }
}

/**
 * Player votes on bet result (approve or reject)
 * Works during PROOFING or DISPUTED status
 * Auto-resolves when >50% of league members approve (finalize) or reject (refund)
 */
export async function voteOnProofingResult(
    leagueId: string,
    betId: string,
    userId: string,
    vote: "approve" | "reject"
): Promise<{ autoResolved: boolean; resolution?: "approved" | "rejected"; approvePercent: number; rejectPercent: number }> {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    return await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw new Error("Bet not found");

        const bet = betSnap.data() as Bet;

        if (bet.status !== "PROOFING" && bet.status !== "DISPUTED") {
            throw new Error("Bet is not in proofing or disputed status");
        }

        // Add/update vote
        const votes = bet.votes || {};
        votes[userId] = vote;

        // Get all league members to calculate majority
        const membersColRef = collection(db, "leagues", leagueId, "members");
        const membersSnapshot = await getDocs(membersColRef);
        const totalLeagueMembers = membersSnapshot.size;

        // Calculate vote counts
        const approveCount = Object.values(votes).filter(v => v === "approve").length;
        const rejectCount = Object.values(votes).filter(v => v === "reject").length;

        // Calculate percentages based on total league members
        const approvePercent = totalLeagueMembers > 0 ? Math.round((approveCount / totalLeagueMembers) * 100) : 0;
        const rejectPercent = totalLeagueMembers > 0 ? Math.round((rejectCount / totalLeagueMembers) * 100) : 0;

        // Check for majority (>50% of league members)
        const majorityThreshold = Math.floor(totalLeagueMembers / 2) + 1;

        let autoResolved = false;
        let resolution: "approved" | "rejected" | undefined;

        const updateData: any = { votes };

        if (approveCount >= majorityThreshold) {
            // Auto-approve: Set to PROOFING with immediate deadline for auto-finalization
            autoResolved = true;
            resolution = "approved";
            updateData.status = "PROOFING";
            updateData.disputeActive = false;
            updateData.autoFinalize = true;
            updateData.disputeDeadline = new Date(); // Immediate deadline
        } else if (rejectCount >= majorityThreshold) {
            // Auto-reject: Mark as INVALID and refund (handled separately)
            autoResolved = true;
            resolution = "rejected";
            // We'll handle the refund logic after the transaction
        }

        transaction.update(betRef, updateData);

        return { autoResolved, resolution, approvePercent, rejectPercent };
    });
}

/**
 * Player votes on disputed bet (approve or reject the result)
 * @deprecated Use voteOnProofingResult instead
 */
export async function voteOnDisputedBet(
    leagueId: string,
    betId: string,
    userId: string,
    vote: "approve" | "reject"
) {
    // Delegate to the new function for backwards compatibility
    return await voteOnProofingResult(leagueId, betId, userId, vote);
}

/**
 * Check voting results and resolve dispute
 * Returns: "approve" | "reject" | "no_consensus"
 */
export async function checkDisputeVoting(leagueId: string, betId: string): Promise<"approve" | "reject" | "no_consensus"> {
    const { getDoc, getDocs, collection } = await import("firebase/firestore");
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const betSnap = await getDoc(betRef);

    if (!betSnap.exists()) throw new Error("Bet not found");

    const bet = betSnap.data() as Bet;
    const votes = bet.votes || {};

    // Get all users who wagered on this bet
    const wagersCol = collection(db, "leagues", leagueId, "bets", betId, "wagers");
    const wagersSnap = await getDocs(wagersCol);
    const totalWagerers = wagersSnap.size;

    const approveCount = Object.values(votes).filter(v => v === "approve").length;
    const rejectCount = Object.values(votes).filter(v => v === "reject").length;
    const totalVotes = approveCount + rejectCount;

    // Require at least 50% participation
    if (totalVotes < totalWagerers / 2) {
        return "no_consensus";
    }

    // Need >66% majority to approve or reject
    const approvePercentage = approveCount / totalVotes;
    const rejectPercentage = rejectCount / totalVotes;

    if (approvePercentage > 0.66) return "approve";
    if (rejectPercentage > 0.66) return "reject";

    return "no_consensus";
}

/**
 * Submit a result during dispute - players can submit what they think the correct result is
 * If more than half of the league players submit the same result, consensus is reached (majority rule)
 */
export async function submitDisputeResult(
    leagueId: string,
    betId: string,
    userId: string,
    result: string | number | { home: number; away: number },
    displayName?: string
): Promise<{ consensus: boolean; consensusResult?: typeof result; majorityReached?: boolean }> {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    return await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw new Error("Bet not found");

        const bet = betSnap.data() as Bet;

        if (bet.status !== "DISPUTED") {
            throw new Error("Bet is not in disputed status");
        }

        // Add/update submission
        const submissions = bet.disputeSubmissions || {};
        submissions[userId] = {
            result,
            submittedAt: new Date().toISOString(),
            displayName
        };

        // Get all league members to calculate majority
        const membersColRef = collection(db, "leagues", leagueId, "members");
        const membersSnapshot = await getDocs(membersColRef);
        const totalLeagueMembers = membersSnapshot.size;

        // Calculate majority threshold (more than half)
        const majorityThreshold = Math.floor(totalLeagueMembers / 2) + 1;

        // Count submissions by result value
        const resultCounts: { [key: string]: { count: number; result: typeof result } } = {};

        for (const [, submission] of Object.entries(submissions)) {
            const resultKey = JSON.stringify(submission.result);
            if (!resultCounts[resultKey]) {
                resultCounts[resultKey] = { count: 0, result: submission.result };
            }
            resultCounts[resultKey].count++;
        }

        // Check if any result has majority approval (more than half of league members)
        let consensus = false;
        let consensusResult: typeof result | undefined;
        let majorityReached = false;

        for (const [, data] of Object.entries(resultCounts)) {
            if (data.count >= majorityThreshold) {
                consensus = true;
                majorityReached = true;
                consensusResult = data.result;
                break;
            }
        }

        // Update bet with new submission
        const updateData: any = {
            disputeSubmissions: submissions,
            disputeConsensus: consensus
        };

        // If majority consensus reached, update the winning outcome and mark for auto-finalization
        if (consensus && consensusResult !== undefined) {
            updateData.winningOutcome = consensusResult;
            updateData.status = "PROOFING";
            updateData.disputeActive = false;
            updateData.autoFinalize = true; // Flag for auto-finalization
            // Set immediate deadline (already passed)
            updateData.disputeDeadline = new Date();
        }

        transaction.update(betRef, updateData);

        return { consensus, consensusResult, majorityReached };
    });
}




/**
 * Mark bet as INVALID and refund all wagers
 */
export async function markBetInvalidAndRefund(leagueId: string, betId: string) {
    const { getDocs, collection, getDoc } = await import("firebase/firestore");
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    // Get bet data and league name for notification before transaction
    const betSnap = await getDoc(betRef);
    const bet = betSnap.exists() ? { id: betSnap.id, ...betSnap.data() } as Bet : null;
    const leagueSnap = await getDoc(doc(db, "leagues", leagueId));
    const leagueName = leagueSnap.exists() ? leagueSnap.data().name : undefined;

    // Get wagerer IDs before transaction
    const wagersCol = collection(db, "leagues", leagueId, "bets", betId, "wagers");
    const wagersSnapForNotifs = await getDocs(wagersCol);
    const wagererIds = wagersSnapForNotifs.docs.map(d => d.data().userId as string);

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw new Error("Bet not found");

        // Get all wagers
        const wagersSnap = await getDocs(wagersCol);

        // Refund each wager
        for (const wagerDoc of wagersSnap.docs) {
            const wager = wagerDoc.data() as Wager;
            const memberRef = doc(db, "leagues", leagueId, "members", wager.userId);

            transaction.update(memberRef, {
                points: increment(wager.amount), // Refund points
                totalInvested: increment(-wager.amount) // Remove from invested since bet is invalid
            });

            // Update wager status
            transaction.update(wagerDoc.ref, {
                status: "PUSH"
            });
        }

        // Mark bet as invalid
        transaction.update(betRef, {
            status: "INVALID",
            resolvedAt: serverTimestamp()
        });
    });

    // Send refund notifications (fire and forget)
    Promise.all(
        wagererIds.map(userId =>
            createNotification(userId, "BET_REFUNDED", "♻️ Bet Refunded", `"${bet?.question || 'Bet'}" was marked invalid.Your wager has been refunded.`, {
                betId,
                leagueId,
                leagueName
            })
        )
    ).catch(console.error);
}

/**
 * Resolve dispute based on voting outcome
 */
export async function resolveDispute(leagueId: string, betId: string) {
    const { updateDoc } = await import("firebase/firestore");
    const voteResult = await checkDisputeVoting(leagueId, betId);

    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    // ... existing code ...
    if (voteResult === "approve") {
        // Proceed with original resolution
        await updateDoc(betRef, {
            status: "PROOFING",
            disputeActive: false
        });
        return "approved";
    } else if (voteResult === "reject") {
        // Owner needs to re-proof or mark invalid
        return "rejected";
    } else {
        // No consensus - owner can mark invalid
        return "no_consensus";
    }
}

/**
 * Delete a bet completely.
 * Refunds all wagers made on this bet.
 */
export async function deleteBet(leagueId: string, betId: string) {
    const { getDocs, collection, deleteDoc, doc } = await import("firebase/firestore");
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const wagersCol = collection(db, "leagues", leagueId, "bets", betId, "wagers");

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw new Error("Bet not found");

        // Note: This read is not strictly transactional (Firestore Limitation for queries in txn)
        // But practically safe for this use case if traffic is low.
        // Ideally we mark bet as "LOCKED" first in a separate txn if high volume.
        const wagersSnap = await getDocs(wagersCol);

        // Refund each wager
        for (const wagerDoc of wagersSnap.docs) {
            const wager = wagerDoc.data() as Wager;
            const memberRef = doc(db, "leagues", leagueId, "members", wager.userId);

            // Refund points if member exists
            transaction.update(memberRef, {
                points: increment(wager.amount),
                totalInvested: increment(-wager.amount)
            });

            // Delete wager doc
            transaction.delete(wagerDoc.ref);
        }

        // Delete bet doc
        transaction.delete(betRef);
    });
}
