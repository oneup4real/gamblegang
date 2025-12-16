
import { db } from "@/lib/firebase/config";
import { collection, doc, runTransaction, serverTimestamp, setDoc, increment, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { League, LeagueMember } from "./league-service";

export type BetType = "CHOICE" | "RANGE" | "MATCH"; // Added MATCH

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
    status: "DRAFT" | "OPEN" | "LOCKED" | "RESOLVED" | "CANCELLED" | "PROOFING" | "DISPUTED" | "INVALID";
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
    // Dispute fields
    disputeDeadline?: any; // Timestamp when dispute period ends (24-48h after proofing)
    disputedBy?: string[]; // User IDs who disputed
    disputeActive?: boolean; // Whether dispute is currently active
    votes?: { [userId: string]: "approve" | "reject" }; // Voting on the result
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
    matchDetails?: { home: string, away: string }
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
    };

    if (type === "CHOICE" && options) {
        betData.options = options.map((opt, i) => ({
            id: String(i),
            text: opt,
            totalWagered: 0,
            odds: 1.0 // Initial odds
        }));
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
    selection: string | number | { home: number, away: number }
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

        // Check balance (Simplified: Assuming standard league has unlimited or tracked differently, Zero Sum needs balance)
        // Ideally pass 'mode' to check, but for now we rely on UI to check.
        // Actually, let's enforce balance for sanity if we can detect mode, but mode is on League...
        // We'll trust the UI check for now or fetch league. Fetching league adds overhead.
        // Let's assume standard checks passed.

        // Deduct points
        const newPoints = member.points - amount;
        if (newPoints < 0) throw "Insufficient points";

        // Create Wager
        const wagerData: Wager = {
            id: newWagerRef.id,
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            userAvatar: user.photoURL || undefined,
            amount: amount,
            selection,
            status: "PENDING",
            placedAt: serverTimestamp()
        };

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
        transaction.update(memberRef, {
            points: newPoints,
            totalInvested: increment(amount)
        });
        transaction.update(betRef, betUpdates);
    });
}

export function calculateOdds(totalPool: number, optionPool: number): string {
    if (optionPool === 0) return "---"; // No bets yet
    // House take? Assuming 0% for now.
    const odds = totalPool / optionPool;
    return odds.toFixed(2);
}

export function getReturnPotential(wagerAmount: number, totalPool: number, optionPool: number): number {
    // Current Quote * Wager?
    // Start Quote = Total / Option
    // If I bet X, Total becomes T+X, Option becomes O+X
    // Final Quote = (T+X) / (O+X)
    // Return = Wager * Final Quote
    if (optionPool === 0) return 0;
    const finalOdds = totalPool / optionPool;
    return Math.floor(wagerAmount * finalOdds);
}


export async function resolveBet(leagueId: string, betId: string, user: User, outcome: string | number | { home: number, away: number }) {
    // 1. Mark bet as RESOLVED and set winning outcome
    // 2. Fetch all wagers
    // 3. For each winner, credit points
    // 4. Update member stats

    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    // We need to process this in a transaction or batch to ensure integrity
    // But for many wagers, batch might be too small (500 limit).
    // For MVP, we'll do it in a simpler way: Lock bet -> Process Wagers -> Unlock/Finish
    // Or just run it. If it fails halfway, we have partial resolution.
    // Better: Cloud Function. But here we do Client Side for MVP (Admin only).

    let winnerCount = 0;

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw "Bet not found";
        const bet = betSnap.data() as Bet;

    });

    // Fetch League to check Mode
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    const league = leagueSnap.data() as League;
    const isZeroSum = league?.mode === "ZERO_SUM";

    // Re-implementation with simple batching
    const wagersRef = collection(betRef, "wagers");
    const wagersSnap = await getDocs(wagersRef);
    const wagers = wagersSnap.docs.map(d => d.data() as Wager);

    const batch = writeBatch(db);

    // Update Bet
    batch.update(betRef, {
        status: "RESOLVED",
        winningOutcome: outcome,
        resolvedAt: serverTimestamp(),
        resolvedBy: user.uid
    });

    // We need to iterate twice.
    let totalWinningStake = 0;
    const winningWagers: Wager[] = [];

    for (const wager of wagers) {
        let isWinner = false;

        if (typeof outcome === "string") { // CHOICE (Index)
            isWinner = String(wager.selection) === outcome;
        } else if (typeof outcome === "number") { // RANGE
            isWinner = Number(wager.selection) === outcome;
        } else if (typeof outcome === "object") { // MATCH
            const sel = wager.selection as { home: number, away: number };
            isWinner = sel.home === outcome.home && sel.away === outcome.away;
        }

        if (isWinner) {
            winningWagers.push(wager);
            if (isZeroSum) {
                totalWinningStake += wager.amount;
            }
        } else {
            batch.update(doc(wagersRef, wager.id), { status: "LOST", payout: 0 });
        }
    }

    // Check Bet Pool for Zero Sum
    let totalPool = 0;
    if (isZeroSum) {
        const betSnap = await getDoc(betRef);
        const bet = betSnap.data() as Bet;
        totalPool = bet.totalPool;
    }

    for (const wager of winningWagers) {
        let payout = 0;

        if (isZeroSum) {
            // ZERO SUM: Parimutuel Share
            if (totalWinningStake > 0) {
                payout = Math.floor((wager.amount / totalWinningStake) * totalPool);
            }
        } else {
            // ARCADE: Fixed Reward for winning
            // For now, let's give a flat 100 points, or we could calculate based on odds.
            // Given "fixed numbers", let's award 100.
            payout = 100;
        }

        // Update Wager
        batch.update(doc(wagersRef, wager.id), { status: "WON", payout });

        // Update Member
        const memberRef = doc(db, "leagues", leagueId, "members", wager.userId);
        batch.update(memberRef, {
            points: increment(payout)
        });
    }

    await batch.commit();

    return { success: true, winnerCount: winningWagers.length };
}

// Helper needed for resolveBet - imports were missing
import { getDocs, writeBatch, getDoc } from "firebase/firestore";

// AI Verification Hooks
export async function startProofing(leagueId: string, betId: string, user: User, result: string) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    await updateDoc(betRef, {
        status: "PROOFING",
        aiVerification: result
    });
}

export async function confirmVerification(leagueId: string, betId: string, user: User) {
    // Just a flag or step. Real resolution happens via resolveBet
    // but maybe this sets a flag "Verified"?
    // For now, assume it just keeps it in PROOFING but maybe validates it visually.
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
    question: string;
    status: string;
    closesAt: any;
    // Extended fields for display
    type?: BetType;
    options?: BetOption[];
    totalPool?: number;
    rangeUnit?: string;
    rangeMin?: number;
    rangeMax?: number;
    matchDetails?: { homeTeam: string; awayTeam: string; date: string; };
}

export interface DashboardBetWithWager extends DashboardBetInfo {
    wager?: {
        amount: number;
        selection: any;
        status: "PENDING" | "WON" | "LOST" | "PUSH";
        payout?: number;
    };
}

export interface DashboardStats {
    activeBets: number;
    pendingResults: number;
    wonBets: number;
    lostBets: number;
    toResolve: number;
    activeBetsList: DashboardBetWithWager[];
    pendingResultsList: DashboardBetWithWager[];
    wonBetsList: DashboardBetWithWager[];
    lostBetsList: DashboardBetWithWager[];
    toResolveList: DashboardBetInfo[];
}

// Helper functions for dismissed bets (localStorage)
export function getDismissedBets(userId: string): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const key = `dismissed_bets_${userId}`;
    const dismissed = localStorage.getItem(key);
    return dismissed ? new Set(JSON.parse(dismissed)) : new Set();
}

export function dismissBet(userId: string, betId: string) {
    const dismissed = getDismissedBets(userId);
    dismissed.add(betId);
    localStorage.setItem(`dismissed_bets_${userId}`, JSON.stringify([...dismissed]));
}

export function clearDismissedSection(userId: string, betIds: string[]) {
    const dismissed = getDismissedBets(userId);
    betIds.forEach(id => dismissed.add(id));
    localStorage.setItem(`dismissed_bets_${userId}`, JSON.stringify([...dismissed]));
}

export async function getUserDashboardStats(user: User, leagues: League[]): Promise<DashboardStats> {
    if (!user || leagues.length === 0) return {
        activeBets: 0,
        pendingResults: 0,
        wonBets: 0,
        lostBets: 0,
        toResolve: 0,
        activeBetsList: [],
        pendingResultsList: [],
        wonBetsList: [],
        lostBetsList: [],
        toResolveList: []
    };

    const { getDocs, collection, query, where } = await import("firebase/firestore");

    const activeBetsList: DashboardBetWithWager[] = [];
    const pendingResultsList: DashboardBetWithWager[] = [];
    const wonBetsList: DashboardBetWithWager[] = [];
    const lostBetsList: DashboardBetWithWager[] = [];
    const toResolveList: DashboardBetInfo[] = [];

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

            const betInfo: DashboardBetWithWager = {
                id: bet.id,
                leagueId: league.id,
                leagueName: league.name,
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
                wager: userWager ? {
                    amount: userWager.amount,
                    selection: userWager.selection,
                    status: userWager.status,
                    payout: userWager.payout
                } : undefined
            };

            // Categorize the bet
            if (bet.status === "OPEN" && userWager) {
                // Active - can still bet (check if not yet closed)
                const now = new Date();
                const closesAt = bet.closesAt?.toDate();
                if (!closesAt || closesAt > now) {
                    activeBetsList.push(betInfo);
                }
            } else if ((bet.status === "LOCKED" || bet.status === "PROOFING" || bet.status === "DISPUTED") && userWager) {
                // Pending results - waiting for resolution
                pendingResultsList.push(betInfo);
            } else if (bet.status === "RESOLVED" && userWager) {
                // Resolved - check if won or lost
                if (userWager.status === "WON") {
                    wonBetsList.push(betInfo);
                } else if (userWager.status === "LOST") {
                    lostBetsList.push(betInfo);
                }
            }

            // Owner bets to resolve
            const isOwner = league.ownerId === user.uid;
            if (isOwner) {
                const isPastClose = bet.closesAt && new Date(bet.closesAt.toDate()) < new Date();
                const isPastEvent = bet.eventDate && new Date(bet.eventDate.toDate()) < new Date();

                const needsResolution = (
                    (bet.status === "LOCKED" && (isPastClose || isPastEvent)) ||
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
                        closesAt: bet.closesAt
                    });
                }
            }
        }
    }

    // Sort all lists by time (newest first)
    const sortByTime = (a: any, b: any) => {
        const timeA = a.closesAt?.toDate?.() || new Date(0);
        const timeB = b.closesAt?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
    };

    activeBetsList.sort(sortByTime);
    pendingResultsList.sort(sortByTime);
    wonBetsList.sort(sortByTime);
    lostBetsList.sort(sortByTime);
    toResolveList.sort(sortByTime);

    return {
        activeBets: activeBetsList.length,
        pendingResults: pendingResultsList.length,
        wonBets: wonBetsList.length,
        lostBets: lostBetsList.length,
        toResolve: toResolveList.length,
        activeBetsList,
        pendingResultsList,
        wonBetsList,
        lostBetsList,
        toResolveList
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

        transaction.update(betRef, {
            status: "DISPUTED",
            disputeActive: true,
            disputedBy
        });
    });
}

/**
 * Player votes on disputed bet (approve or reject the result)
 */
export async function voteOnDisputedBet(
    leagueId: string,
    betId: string,
    userId: string,
    vote: "approve" | "reject"
) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    await runTransaction(db, async (transaction) => {
        const betSnap = await transaction.get(betRef);
        if (!betSnap.exists()) throw new Error("Bet not found");

        const bet = betSnap.data() as Bet;

        if (bet.status !== "DISPUTED") {
            throw new Error("Bet is not in disputed status");
        }

        // Add/update vote
        const votes = bet.votes || {};
        votes[userId] = vote;

        transaction.update(betRef, {
            votes
        });
    });
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
 * Mark bet as INVALID and refund all wagers
 */
export async function markBetInvalidAndRefund(leagueId: string, betId: string) {
    const { getDocs, collection } = await import("firebase/firestore");
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const wagersCol = collection(db, "leagues", leagueId, "bets", betId, "wagers");

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
}

/**
 * Resolve dispute based on voting outcome
 */
export async function resolveDispute(leagueId: string, betId: string) {
    const { updateDoc } = await import("firebase/firestore");
    const voteResult = await checkDisputeVoting(leagueId, betId);

    const betRef = doc(db, "leagues", leagueId, "bets", betId);

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
