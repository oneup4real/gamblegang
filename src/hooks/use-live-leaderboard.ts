"use client";

/**
 * useLiveLeaderboard Hook
 * 
 * Calculates dynamic leaderboard positions based on live bet outcomes.
 * Shows potential points and position changes for each member.
 */

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase/config";
import {
    collection,
    query,
    where,
    onSnapshot,
    collectionGroup,
    getDocs
} from "firebase/firestore";
import { Bet, Wager } from "@/lib/services/bet-service";
import { LeagueMember } from "@/lib/services/league-service";

export interface MemberWithLiveStats extends LeagueMember {
    // Live calculations
    livePoints: number;           // Points + potential delta
    potentialDelta: number;       // +45, -20, 0
    staticPosition: number;       // Original ranking
    livePosition: number;         // Projected position
    positionChange: number;       // +2, -1, 0 (positive = moving up)

    // Active bet summary
    activeLiveBets: number;       // Count of live bets
    winningBets: number;
    losingBets: number;
    neutralBets: number;
}

interface BetWithWager {
    bet: Bet;
    wager: Wager;
}

/**
 * Calculate if user is winning, losing, or neutral based on their selection and live score
 */
function calculateWinStatus(
    bet: Bet,
    wager: Wager
): "WINNING" | "LOSING" | "NEUTRAL" | "UNKNOWN" {
    const liveScore = bet.liveScore;

    // Handle PROOFING status (Final Result known but points not yet distributed)
    if (bet.status === "PROOFING" && bet.winningOutcome !== undefined) {
        if (bet.type === "MATCH" && typeof wager.selection === "object") {
            const outcome = bet.winningOutcome as { home: number; away: number };
            const prediction = wager.selection as { home: number; away: number };

            if (outcome.home === prediction.home && outcome.away === prediction.away) return "WINNING";

            const actualTendency = outcome.home > outcome.away ? "H" : outcome.home < outcome.away ? "A" : "D";
            const predictedTendency = prediction.home > prediction.away ? "H" : prediction.home < prediction.away ? "A" : "D";

            if (actualTendency === predictedTendency) return "NEUTRAL";
            return "LOSING";
        }

        if (bet.type === "CHOICE") {
            if (String(bet.winningOutcome) === String(wager.selection)) return "WINNING";
            return "LOSING";
        }
    }

    if (!liveScore || liveScore.matchStatus === "NOT_STARTED") {
        return "UNKNOWN";
    }

    const { homeScore, awayScore } = liveScore;

    // For MATCH type bets (exact score prediction)
    if (bet.type === "MATCH" && typeof wager.selection === "object") {
        const prediction = wager.selection as { home: number; away: number };

        if (prediction.home === homeScore && prediction.away === awayScore) {
            return "WINNING";
        }

        const actualTendency = homeScore > awayScore ? "H" : homeScore < awayScore ? "A" : "D";
        const predictedTendency = prediction.home > prediction.away ? "H" : prediction.home < prediction.away ? "A" : "D";

        if (actualTendency === predictedTendency) {
            return "NEUTRAL";
        }

        return "LOSING";
    }

    // For CHOICE type bets (winner prediction)
    if (bet.type === "CHOICE" && bet.options && typeof wager.selection === "string") {
        const selectionIndex = parseInt(wager.selection);
        const selectedOption = (bet.options[selectionIndex]?.text || "").toLowerCase();

        let currentWinner: string = "";
        if (homeScore > awayScore && bet.matchDetails?.homeTeam) {
            currentWinner = bet.matchDetails.homeTeam.toLowerCase();
        } else if (awayScore > homeScore && bet.matchDetails?.awayTeam) {
            currentWinner = bet.matchDetails.awayTeam.toLowerCase();
        } else {
            currentWinner = "draw";
        }

        // Check if selection matches
        if (selectedOption.includes(currentWinner) ||
            (currentWinner === "draw" && selectedOption.includes("draw"))) {
            return "WINNING";
        }

        if (homeScore === awayScore && !selectedOption.includes("draw")) {
            return "NEUTRAL";
        }

        return "LOSING";
    }

    return "UNKNOWN";
}

/**
 * Calculate potential payout for a wager
 */
function calculatePotentialPayout(bet: Bet, wager: Wager): number {
    if (bet.type === "CHOICE" && bet.options && bet.totalPool) {
        const selectionIndex = typeof wager.selection === "string"
            ? parseInt(wager.selection)
            : 0;
        const optionPool = bet.options[selectionIndex]?.totalWagered || 1;
        return Math.floor((wager.amount / optionPool) * bet.totalPool);
    }

    // Default: assume 2x return
    return wager.amount * 2;
}

interface UseLiveLeaderboardReturn {
    members: MemberWithLiveStats[];
    hasLiveBets: boolean;
    loading: boolean;
    error: string | null;
}

/**
 * Hook to get live leaderboard with position tracking
 */
export function useLiveLeaderboard(
    leagueId: string,
    staticMembers: LeagueMember[],
    allMembersActiveWagers: Record<string, number>
): UseLiveLeaderboardReturn {
    const [liveBets, setLiveBets] = useState<Bet[]>([]);
    const [memberWagers, setMemberWagers] = useState<Record<string, BetWithWager[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to locked bets with live scores in this league
    useEffect(() => {
        if (!leagueId || !db) {
            setLoading(false);
            return;
        }

        const betsRef = collection(db, "leagues", leagueId, "bets");
        const betsQuery = query(
            betsRef,
            where("status", "in", ["LOCKED", "PROOFING"])
        );

        const unsubscribe = onSnapshot(betsQuery, async (snapshot) => {
            const bets = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Bet))
                .filter(bet => (bet.liveScore && bet.dataSource === "API") || bet.status === "PROOFING");

            setLiveBets(bets);

            // Fetch wagers for these bets
            if (bets.length > 0) {
                const allWagersByMember: Record<string, BetWithWager[]> = {};

                for (const bet of bets) {
                    const wagersRef = collection(db, "leagues", leagueId, "bets", bet.id, "wagers");
                    const wagersSnap = await getDocs(wagersRef);

                    wagersSnap.docs.forEach(wagerDoc => {
                        const wager = { id: wagerDoc.id, ...wagerDoc.data() } as Wager;
                        const userId = wager.userId;

                        if (!allWagersByMember[userId]) {
                            allWagersByMember[userId] = [];
                        }
                        allWagersByMember[userId].push({ bet, wager });
                    });
                }

                setMemberWagers(allWagersByMember);
            } else {
                setMemberWagers({});
            }

            setLoading(false);
        }, (err) => {
            console.error("Error fetching live bets:", err);
            setError("Failed to load live data");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [leagueId]);

    // Calculate live leaderboard positions
    const membersWithLive = useMemo((): MemberWithLiveStats[] => {
        // First, calculate static positions (sorted by current points + active wagers)
        const sortedStatic = [...staticMembers]
            .map((m, originalIdx) => ({
                ...m,
                _totalEquity: m.points + (allMembersActiveWagers[m.uid] || 0)
            }))
            .sort((a, b) => b._totalEquity - a._totalEquity);

        // Assign static positions
        const withStaticPositions = sortedStatic.map((m, idx) => ({
            ...m,
            staticPosition: idx + 1
        }));

        // Calculate live deltas for each member
        const withLiveStats = withStaticPositions.map(member => {
            const userBetsWithWagers = memberWagers[member.uid] || [];

            let potentialDelta = 0;
            let winningBets = 0;
            let losingBets = 0;
            let neutralBets = 0;

            for (const { bet, wager } of userBetsWithWagers) {
                const status = calculateWinStatus(bet, wager);

                if (status === "WINNING") {
                    winningBets++;
                    const payout = calculatePotentialPayout(bet, wager);
                    potentialDelta += (payout - wager.amount);
                } else if (status === "LOSING") {
                    losingBets++;
                    potentialDelta -= wager.amount;
                } else if (status === "NEUTRAL") {
                    neutralBets++;
                    // No change for neutral
                }
                // UNKNOWN = no change
            }

            const livePoints = member.points + (allMembersActiveWagers[member.uid] || 0) + potentialDelta;

            return {
                ...member,
                livePoints,
                potentialDelta,
                activeLiveBets: userBetsWithWagers.length,
                winningBets,
                losingBets,
                neutralBets,
                livePosition: 0, // Will be set after sorting
                positionChange: 0
            };
        });

        // Sort by live points to get live positions
        const sortedLive = [...withLiveStats].sort((a, b) => b.livePoints - a.livePoints);

        // Assign live positions and calculate change
        sortedLive.forEach((member, idx) => {
            member.livePosition = idx + 1;
            member.positionChange = member.staticPosition - member.livePosition;
        });

        // Return in live order
        return sortedLive;
    }, [staticMembers, memberWagers, allMembersActiveWagers]);

    const hasLiveBets = liveBets.length > 0;

    return {
        members: membersWithLive,
        hasLiveBets,
        loading,
        error
    };
}
