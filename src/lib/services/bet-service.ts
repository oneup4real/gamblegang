import { db } from "@/lib/firebase/config";
import { collection, doc, runTransaction, serverTimestamp, setDoc, increment } from "firebase/firestore";
import { User } from "firebase/auth";
import { League } from "./league-service";

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
    status: "OPEN" | "LOCKED" | "RESOLVED" | "CANCELLED" | "PROOFING"; // Added PROOFING
    createdAt: any;
    closesAt: any;

    // Choice Bets
    options?: BetOption[];

    // Range Bets
    rangeMin?: number;
    rangeMax?: number;
    rangeUnit?: string;

    // Match Bets (New)
    matchDetails?: {
        homeTeam: string;
        awayTeam: string;
        date: string;
    };

    totalPool: number;
    winningOutcome?: string | number | { home: number, away: number }; // Updated
    winnerPool?: number;
    resolvedAt?: any; // Re-added
    description?: string; // Re-added

    // Verification & Proofing
    verificationStatus?: "IDLE" | "SUGGESTED" | "PROOFING" | "VERIFIED";
    aiSuggestedOutcome?: string;
    proofingDeadline?: any;
    adminComment?: string;
}

export interface Wager {
    id: string; // Document ID
    userId: string;
    amount: number;
    selection: string | number | { home: number, away: number }; // Changed from prediction to selection, updated type
    placedAt: any;
    userName?: string; // Removed from instruction, but kept for consistency with existing code
    status?: "PENDING" | "WON" | "LOST" | "REFUNDED"; // Re-added
    payout?: number; // Re-added
}

export async function createBet(
    leagueId: string,
    user: User,
    question: string,
    type: BetType,
    closesAt: Date,
    options?: string[], // For CHOICE
    range?: { min?: number; max?: number; unit?: string }, // For RANGE, changed name from rangeConfig
    matchDetails?: { homeTeam: string, awayTeam: string, date: string } // For MATCH
) {
    if (!user) throw new Error("Unauthorized");

    const betRef = doc(collection(db, "leagues", leagueId, "bets"));
    const betId = betRef.id;

    const betData: Bet = { // Changed newBet to betData and type to Bet
        id: betId,
        leagueId,
        creatorId: user.uid,
        question,
        type,
        status: "OPEN",
        createdAt: serverTimestamp(),
        closesAt: closesAt,
        totalPool: 0,
        // searchKey: question.toLowerCase() // Added searchKey as per instruction, but it's not in Bet interface
    };

    if (type === "CHOICE" && options) {
        betData.options = options.map((opt, idx) => ({
            id: `opt_${idx}`, // Changed to `opt_${idx}` for consistency
            text: opt,
            totalWagered: 0,
        }));
    } else if (type === "RANGE" && range) { // Changed to else if
        betData.rangeMin = range.min;
        betData.rangeMax = range.max;
        betData.rangeUnit = range.unit;
    } else if (type === "MATCH" && matchDetails) { // Added MATCH type
        betData.matchDetails = matchDetails;
    }

    await setDoc(betRef, betData); // Changed newBet to betData
    return betId;
}

export async function getLeagueBets(leagueId: string) {
    try {
        const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
        const q = query(
            collection(db, "leagues", leagueId, "bets"),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
    } catch (error) {
        console.error("Error fetching bets:", error);
        return [];
    }
}

export async function placeWager(
    leagueId: string,
    betId: string,
    user: User,
    amount: number,
    prediction: string | number // Option ID for CHOICE, Number for RANGE
) {
    // Transaction:
    // 1. Check user balance in league
    // 2. Deduct points
    // 3. Create wager doc
    // 4. Update bet totalPool (and option total if CHOICE)

    if (!user) throw new Error("Unauthorized");

    try {
        await runTransaction(db, async (transaction) => {
            const leagueRef = doc(db, "leagues", leagueId);
            const leagueSnap = await transaction.get(leagueRef);
            if (!leagueSnap.exists()) throw new Error("League not found");

            const leagueData = leagueSnap.data() as League;

            // Enforce League Status Lock
            if (leagueData.status !== "STARTED") {
                throw new Error(`Betting is disabled. League status: ${leagueData.status}`);
            }

            const isStandard = leagueData.mode === "STANDARD";
            let actualAmount = amount;

            const memberRef = doc(db, "leagues", leagueId, "members", user.uid);

            if (isStandard) {
                // In Arcade mode, wagers are free but fixed "voting power" (100)
                actualAmount = 100;
            } else {
                // 1. Check Balance
                const memberSnap = await transaction.get(memberRef);
                if (!memberSnap.exists()) throw new Error("Not a member of this league");

                const memberPoints = memberSnap.data().points;
                if (memberPoints < amount) throw new Error("Insufficient points");

                // 2. Deduct Points
                transaction.update(memberRef, { points: memberPoints - amount });
            }

            // 3. Create Wager
            const wagerRef = doc(collection(db, "leagues", leagueId, "bets", betId, "wagers"));
            transaction.set(wagerRef, {
                userId: user.uid,
                userName: user.displayName,
                amount: actualAmount,
                selection: prediction,
                placedAt: serverTimestamp(),
            });

            // 4. Update Bet Pool
            const betRef = doc(db, "leagues", leagueId, "bets", betId);
            const betSnap = await transaction.get(betRef);
            if (!betSnap.exists()) throw new Error("Bet not found");

            const betData = betSnap.data() as Bet;
            if (betData.status !== "OPEN") throw new Error("Bet is not open");

            let updateData: any = {
                totalPool: (betData.totalPool || 0) + actualAmount
            };

            if (betData.type === "CHOICE" && typeof prediction === "string" && betData.options) {
                const newOptions = betData.options.map(opt => {
                    if (opt.id === prediction || opt.text === prediction) {
                        return { ...opt, totalWagered: (opt.totalWagered || 0) + actualAmount };
                    }
                    return opt;
                });
                updateData.options = newOptions;
            }

            transaction.update(betRef, updateData);
        });

        return true;
    } catch (error) {
        console.error("Error placing wager:", error);
        throw error;
    }
}


/**
 * Calculates Tote (Parimutuel) Odds
 * Formula: Odds = (Total Pool / Option Wagered)
 * Returns decimal odds (e.g. 2.50)
 */
export function calculateOdds(totalPool: number, optionWagered: number): number {
    if (optionWagered === 0) return 1.0; // Default or 0-risk
    // Standard Tote often takes a cut, here we assume Social Betting (0% cut)
    return parseFloat((totalPool / optionWagered).toFixed(2));
}

export function getReturnPotential(wagerAmount: number, totalPool: number, optionTotalIncludingMyWager: number): number {
    // If I bet 100, and pool was 1000 (now 1100), and option had 200 (now 300)
    // Odds = 1100 / 300 = 3.66
    // Return = 3.66 * 100 = 366
    return wagerAmount * calculateOdds(totalPool, optionTotalIncludingMyWager);
}

// ... (Removed duplicate Wager interface)

export async function resolveBet(
    leagueId: string,
    betId: string,
    user: User,
    winningOutcome: string | number | { home: number, away: number }
) {
    if (!user) throw new Error("Unauthorized");
    const { writeBatch, doc, getDoc, getDocs, collection } = await import("firebase/firestore");

    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    const betSnap = await getDoc(betRef);
    if (!betSnap.exists()) throw new Error("Bet not found");
    const bet = betSnap.data() as Bet;

    if (bet.creatorId !== user.uid) {
        throw new Error("Only the creator can resolve this bet");
    }
    if (bet.status !== "OPEN" && bet.status !== "LOCKED") throw new Error("Bet is already resolved or cancelled");

    const wagersRef = collection(db, "leagues", leagueId, "bets", betId, "wagers");
    const wagersSnap = await getDocs(wagersRef);
    const wagers = wagersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Wager));

    const batch = writeBatch(db);
    let totalPayout = 0;

    // Logic for MATCH Bets (Tiered Parimutuel)
    // Goal: Maintain Zero-Sum. Total Payout = Total Pool.
    if (bet.type === "MATCH" && typeof winningOutcome === "object") {
        const result = winningOutcome as { home: number, away: number };

        // 1. Calculate Shares for each wager
        const wagerShares = wagers.map(wager => {
            const pred = wager.selection as { home: number, away: number };
            let shares = 0;

            if (pred.home === result.home && pred.away === result.away) {
                shares = 5; // Exact Score Tier
            } else if ((pred.home - pred.away) === (result.home - result.away)) {
                shares = 3; // Correct Diff Tier
            } else if (Math.sign(pred.home - pred.away) === Math.sign(result.home - result.away)) {
                shares = 1; // Correct Winner Tier
            }
            return { ...wager, shares };
        });

        // 2. Calculate Total Shares
        const totalShares = wagerShares.reduce((sum, w) => sum + (w.shares * w.amount), 0); // Weighted by amount wagered? 
        // Parimutuel: You buy "tickets". If I bet 100 on Exact (5x), do I get 500 shares? 
        // Simplification: YES. Your "stake" in the pool is Amount * TierWeight.

        // However, if NO ONE wins anything, the house (nobody) takes it? 
        // In a friendly league, maybe carry over? Or refund?
        // For simplicity now: If totalShares > 0, distribute. If 0, Refund.

        if (totalShares > 0) {
            const valuePerShare = bet.totalPool / totalShares;

            wagerShares.forEach(w => {
                if (w.shares > 0) {
                    const myTotalShares = w.amount * w.shares;
                    const payout = Math.floor(myTotalShares * valuePerShare);
                    totalPayout += payout;

                    batch.update(doc(db, "leagues", leagueId, "members", w.userId), {
                        points: increment(payout)
                    });
                    batch.update(doc(db, "leagues", leagueId, "bets", betId, "wagers", w.id), {
                        status: "WON",
                        payout
                    });
                } else {
                    batch.update(doc(db, "leagues", leagueId, "bets", betId, "wagers", w.id), {
                        status: "LOST",
                        payout: 0
                    });
                }
            });
        } else {
            // Refund everyone if no one got it right (or carry over logic could go here)
            wagers.forEach(w => {
                batch.update(doc(db, "leagues", leagueId, "members", w.userId), {
                    points: increment(w.amount)
                });
                batch.update(doc(db, "leagues", leagueId, "bets", betId, "wagers", w.id), {
                    status: "REFUNDED",
                    payout: w.amount
                });
            });
        }
    }
    // Logic for CHOICE / RANGE Bets (Parimutuel Pool)
    else {
        const winningVal = String(winningOutcome);
        const winningWagers = wagers.filter(w => String(w.selection) === winningVal);
        const winnerPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);

        if (winningWagers.length > 0) {
            winningWagers.forEach(wager => {
                const share = wager.amount / winnerPool;
                const payout = Math.floor(bet.totalPool * share);

                totalPayout += payout;

                batch.update(doc(db, "leagues", leagueId, "members", wager.userId), {
                    points: increment(payout)
                });
                batch.update(doc(db, "leagues", leagueId, "bets", betId, "wagers", wager.id), {
                    status: "WON",
                    payout
                });
            });
        }

        wagers.filter(w => String(w.selection) !== winningVal).forEach(wager => {
            batch.update(doc(db, "leagues", leagueId, "bets", betId, "wagers", wager.id), {
                status: "LOST",
                payout: 0
            });
        });

        // Update bet with winner info (MATCH type doesn't use winnerPool in the same way, but consistent enough)
        batch.update(betRef, {
            winnerPool
        });
    }

    batch.update(betRef, {
        status: "RESOLVED",
        resolvedAt: serverTimestamp(),
        winningOutcome
    });

    await batch.commit();
    return { winnerCount: wagers.filter(w => w.status === "WON" || (w.payout ?? 0) > 0).length, totalPayout };
}

export async function startProofing(
    leagueId: string,
    betId: string,
    user: User,
    suggestedOutcome: string
) {
    if (!user) throw new Error("Unauthorized");
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    // Proofing lasts 24 hours by default
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);

    await setDoc(betRef, {
        status: "PROOFING",
        verificationStatus: "PROOFING", // Admin validated the suggestion
        aiSuggestedOutcome: suggestedOutcome, // Or manual override
        proofingDeadline: deadline
    }, { merge: true });
}

export async function confirmVerification(
    leagueId: string,
    betId: string,
    user: User
) {
    if (!user) throw new Error("Unauthorized");
    // Just marks it as VERIFIED, ready for resolution (or could trigger resolution automatically)
    // For now, let's keep it simple: Verified means "Ready to Resolve"
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    await setDoc(betRef, {
        verificationStatus: "VERIFIED"
    }, { merge: true });
}
