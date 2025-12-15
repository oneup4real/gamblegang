// Add these functions to bet-service.ts

/**
 * Start the dispute period after proofing
 * Sets a 48-hour deadline for players to dispute
 */
export async function startDisputePeriod(leagueId: string, betId: string) {
    const betRef = doc(db, "leagues", leagueId, "bets", betId);

    // Set dispute deadline to 48 hours from now
    const disputeDeadline = new Date();
    disputeDeadline.setHours(disputeDeadline.getHours() + 48);

    await updateDoc(betRef, {
        disputeDeadline: disputeDeadline,
        disputeActive: false, // Not yet disputed
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
                status: "PUSH" // Push = refunded
            });
        }

        // Mark bet as invalid
        transaction.update(betRef, {
            status: "INVALID",
            resolvedAt: serverTimestamp(),
            invalidReason: "No consensus reached on dispute"
        });
    });
}

/**
 * Resolve dispute based on voting outcome
 */
export async function resolveDispute(leagueId: string, betId: string) {
    const voteResult = await checkDisputeVoting(leagueId, betId);

    if (voteResult === "approve") {
        // Proceed with original resolution
        const betRef = doc(db, "leagues", leagueId, "bets", betId);
        await updateDoc(betRef, {
            status: "PROOFING", // Back to proofing so owner can finalize
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
