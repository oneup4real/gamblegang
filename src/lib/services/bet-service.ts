import { db } from "@/lib/firebase/config";
import { collection, doc, runTransaction, serverTimestamp, setDoc, increment } from "firebase/firestore";
import { User } from "firebase/auth";

export type BetType = "CHOICE" | "RANGE"; // CHOICE covers Yes/No and Multiple Choice

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
    description?: string;
    type: BetType;
    options?: BetOption[]; // Only for CHOICE
    rangeMin?: number; // Only for RANGE
    rangeMax?: number; // Only for RANGE
    rangeUnit?: string; // e.g. "Goals", "Minutes"

    status: "OPEN" | "LOCKED" | "RESOLVED" | "CANCELLED";
    createdAt: any;
    closesAt: any;
    resolvedAt?: any;
    winningOutcome?: string | number;
    winnerPool?: number;

    totalPool: number;
}

export async function createBet(
    leagueId: string,
    user: User,
    question: string,
    type: BetType,
    closesAt: Date,
    options?: string[], // For CHOICE
    rangeConfig?: { min?: number; max?: number; unit?: string } // For RANGE
) {
    if (!user) throw new Error("Unauthorized");

    const betRef = doc(collection(db, "leagues", leagueId, "bets"));
    const betId = betRef.id;

    const newBet: Bet = {
        id: betId,
        leagueId,
        creatorId: user.uid,
        question,
        type,
        status: "OPEN",
        createdAt: serverTimestamp(),
        closesAt: closesAt,
        totalPool: 0,
    };

    if (type === "CHOICE" && options) {
        newBet.options = options.map((opt, idx) => ({
            id: `opt_${idx}`,
            text: opt,
            totalWagered: 0,
        }));
    }

    if (type === "RANGE" && rangeConfig) {
        newBet.rangeMin = rangeConfig.min;
        newBet.rangeMax = rangeConfig.max;
        newBet.rangeUnit = rangeConfig.unit;
    }

    await setDoc(betRef, newBet);
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
            // 1. Check Balance
            const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
            const memberSnap = await transaction.get(memberRef);
            if (!memberSnap.exists()) throw new Error("Not a member of this league");

            const memberPoints = memberSnap.data().points;
            if (memberPoints < amount) throw new Error("Insufficient points");

            // 2. Deduct Points
            transaction.update(memberRef, { points: memberPoints - amount });

            // 3. Create Wager
            const wagerRef = doc(collection(db, "leagues", leagueId, "bets", betId, "wagers"));
            transaction.set(wagerRef, {
                userId: user.uid,
                userName: user.displayName,
                amount,
                prediction,
                placedAt: serverTimestamp(),
            });

            // 4. Update Bet Pool
            const betRef = doc(db, "leagues", leagueId, "bets", betId);
            const betSnap = await transaction.get(betRef);
            if (!betSnap.exists()) throw new Error("Bet not found");

            const betData = betSnap.data() as Bet;
            if (betData.status !== "OPEN") throw new Error("Bet is not open");

            let updateData: any = {
                totalPool: (betData.totalPool || 0) + amount
            };

            if (betData.type === "CHOICE" && typeof prediction === "string" && betData.options) {
                // Find option index or update by matching ID
                // Note: For simplicity in this Alpha, we update the array. 
                // In highly concurrent apps, this array update might conflict often.
                // Distributed counter solution is better for scale, but complex.

                const newOptions = betData.options.map(opt => {
                    if (opt.id === prediction || opt.text === prediction) {
                        return { ...opt, totalWagered: (opt.totalWagered || 0) + amount };
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

export interface Wager {
    id: string; // Document ID
    userId: string;
    userName: string;
    amount: number;
    prediction: string | number;
    placedAt: any;
    status?: "PENDING" | "WON" | "LOST" | "REFUNDED";
    payout?: number;
}

export async function resolveBet(
    leagueId: string,
    betId: string,
    user: User,
    winningOutcome: string | number
) {
    // 1. Validation
    if (!user) throw new Error("Unauthorized");
    const { writeBatch, doc } = await import("firebase/firestore");

    // Note: In a real app, logic should be server-side (Cloud Fn) for security & integrity.
    // Client-side resolution relies on the user being an honest Admin/Owner.

    // Fetch Bet
    const betRef = doc(db, "leagues", leagueId, "bets", betId);
    // We need to fetch it to check status, but we assume the caller has fresh data or we check in a Transaction.
    // For Batch, we can't "read" inside the batch chain like a Transaction. 
    // We'll proceed with assumed validity or fetch first. Fetching first is safer.

    const { getDoc, getDocs, collection } = await import("firebase/firestore");
    const betSnap = await getDoc(betRef);
    if (!betSnap.exists()) throw new Error("Bet not found");
    const bet = betSnap.data() as Bet;

    if (bet.creatorId !== user.uid) {
        // Also allow League Owner (TODO: Check Recoil/Context role). For now, Creator only.
        throw new Error("Only the creator can resolve this bet");
    }
    if (bet.status !== "OPEN" && bet.status !== "LOCKED") throw new Error("Bet is already resolved or cancelled");

    // Fetch Wagers
    const wagersRef = collection(db, "leagues", leagueId, "bets", betId, "wagers");
    const wagersSnap = await getDocs(wagersRef);
    const wagers = wagersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Wager));

    // Calculate Winners
    // Normalize comparison
    const isMatch = (p: string | number, w: string | number) => String(p) === String(w);

    const winners = wagers.filter(w => isMatch(w.prediction, winningOutcome));
    const totalPool = bet.totalPool;
    const winnerPool = winners.reduce((sum, w) => sum + w.amount, 0);

    const batch = writeBatch(db);

    // 2. Update Bet
    batch.update(betRef, {
        status: "RESOLVED",
        resolvedAt: serverTimestamp(),
        winningOutcome,
        winnerPool
    });

    // 3. Process Wagers & Payouts
    wagers.forEach(w => {
        const wRef = doc(db, "leagues", leagueId, "bets", betId, "wagers", w.id);
        let status: "WON" | "LOST" = "LOST";
        let payout = 0;

        if (isMatch(w.prediction, winningOutcome)) {
            status = "WON";
            if (winnerPool > 0) {
                const share = w.amount / winnerPool;
                payout = Math.floor(share * totalPool);

                // Credit Member
                const memberRef = doc(db, "leagues", leagueId, "members", w.userId);
                batch.update(memberRef, { points: increment(payout) });
            }
        }

        batch.update(wRef, { status, payout });
    });

    await batch.commit();
    return { winnerCount: winners.length, totalPayout: totalPool };
}
