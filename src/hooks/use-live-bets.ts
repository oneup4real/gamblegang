"use client";

/**
 * useLiveBets Hook
 * 
 * Provides real-time subscription to live bets with their current scores.
 * Used in the dashboard to show users their active bets with live updates.
 */

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import {
    collection,
    query,
    where,
    collectionGroup,
    onSnapshot,
    orderBy,
    limit as firestoreLimit
} from "firebase/firestore";
import { Bet, Wager } from "@/lib/services/bet-service";

export interface LiveBetData {
    bet: Bet;
    wager: Wager;
    liveScore?: {
        homeScore: number;
        awayScore: number;
        matchTime: string;
        matchStatus: "NOT_STARTED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED";
        lastUpdated: Date;
    };
    winStatus: "WINNING" | "LOSING" | "NEUTRAL" | "UNKNOWN";
    potentialPayout: number;
}

export interface LiveBetsStats {
    netPosition: number;
    netPositionChange: number;
    winningCount: number;
    losingCount: number;
    neutralCount: number;
    totalActive: number;
    estimatedTotalPayout: number;
}

interface UseLiveBetsReturn {
    liveBets: LiveBetData[];
    stats: LiveBetsStats;
    lastUpdated: Date | null;
    loading: boolean;
    error: string | null;
}

/**
 * Calculate if user is winning, losing, or neutral based on their selection and live score
 */
function calculateWinStatus(
    bet: Bet,
    wager: Wager,
    liveScore?: LiveBetData["liveScore"]
): "WINNING" | "LOSING" | "NEUTRAL" | "UNKNOWN" {
    if (!liveScore || liveScore.matchStatus === "NOT_STARTED") {
        return "UNKNOWN";
    }

    const { homeScore, awayScore } = liveScore;

    // For MATCH type bets (exact score prediction)
    if (bet.type === "MATCH" && typeof wager.selection === "object") {
        const prediction = wager.selection as { home: number; away: number };

        // Check exact match
        if (prediction.home === homeScore && prediction.away === awayScore) {
            return "WINNING";
        }

        // Check tendency match (correct winner)
        const actualTendency = homeScore > awayScore ? "H" : homeScore < awayScore ? "A" : "D";
        const predictedTendency = prediction.home > prediction.away ? "H" : prediction.home < prediction.away ? "A" : "D";

        if (actualTendency === predictedTendency) {
            return "NEUTRAL"; // Correct tendency but not exact score
        }

        return "LOSING";
    }

    // For CHOICE type bets (winner prediction)
    if (bet.type === "CHOICE" && bet.options && typeof wager.selection === "string") {
        const selectionIndex = parseInt(wager.selection);
        const selectedOption = bet.options[selectionIndex]?.text?.toLowerCase() || "";

        // Determine current winner
        let currentWinner: string = "";
        if (homeScore > awayScore) {
            currentWinner = bet.matchDetails?.homeTeam?.toLowerCase() || "home";
        } else if (awayScore > homeScore) {
            currentWinner = bet.matchDetails?.awayTeam?.toLowerCase() || "away";
        } else {
            currentWinner = "draw";
        }

        // Check if selection matches current state
        if (selectedOption.includes(currentWinner) ||
            (currentWinner === "draw" && selectedOption.includes("draw"))) {
            return "WINNING";
        }

        // If tied and user picked one team, they're neutral (could still win)
        if (homeScore === awayScore && !selectedOption.includes("draw")) {
            return "NEUTRAL";
        }

        return "LOSING";
    }

    return "UNKNOWN";
}

/**
 * Hook to subscribe to user's live bets
 */
export function useLiveBets(userId: string, leagueId?: string): UseLiveBetsReturn {
    const initialStats: LiveBetsStats = {
        netPosition: 0,
        netPositionChange: 0,
        winningCount: 0,
        losingCount: 0,
        neutralCount: 0,
        totalActive: 0,
        estimatedTotalPayout: 0
    };

    const [liveBets, setLiveBets] = useState<LiveBetData[]>([]);
    const [stats, setStats] = useState<LiveBetsStats>(initialStats);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || !db) {
            setLoading(false);
            return;
        }

        // 1. Listen to user's pending wagers
        const wagersQuery = query(
            collectionGroup(db, "wagers"),
            where("userId", "==", userId),
            where("status", "==", "PENDING")
        );

        let betUnsubscribes: (() => void)[] = [];

        const unsubWagers = onSnapshot(wagersQuery, (wagersSnapshot) => {
            // Clean up previous bet listeners
            betUnsubscribes.forEach(unsub => unsub());
            betUnsubscribes = [];

            const userWagers = wagersSnapshot.docs.map(doc => ({
                ...doc.data() as Wager,
                id: doc.id,
                _ref: doc.ref,
                _betRef: doc.ref.parent.parent,
                _leagueId: doc.ref.parent.parent?.parent.parent?.id
            }));

            // Filter by league if needed
            const filteredWagers = leagueId
                ? userWagers.filter(w => w._leagueId === leagueId)
                : userWagers;

            if (filteredWagers.length === 0) {
                setLiveBets([]);
                setStats(initialStats);
                setLoading(false);
                return;
            }

            // Deduplicate Bets
            const uniqueBets = new Map<string, any>(); // <BetId, BetRef>
            const wagersByBetId = new Map<string, Wager[]>();

            filteredWagers.forEach(w => {
                const betRef = w._betRef;
                if (!betRef) return;

                uniqueBets.set(betRef.id, betRef);

                if (!wagersByBetId.has(betRef.id)) wagersByBetId.set(betRef.id, []);
                wagersByBetId.get(betRef.id)!.push(w);
            });

            // Listen to each unique bet and maintain map of data
            const betDataMap = new Map<string, Bet>();

            // Recalculate derived state
            const recalculate = () => {
                const results: LiveBetData[] = [];
                const newStats = { ...initialStats };

                uniqueBets.forEach((_, betId) => {
                    const bet = betDataMap.get(betId);

                    // Filter: Must be loaded AND LOCKED
                    // Also include bets that are technically OPEN but have liveScore (rare edge case)
                    if (!bet || bet.status !== "LOCKED") return;

                    const wagers = wagersByBetId.get(betId) || [];

                    wagers.forEach(wager => {
                        const winStatus = calculateWinStatus(bet, wager, bet.liveScore);

                        // Calculate potential payout
                        let potentialPayout = wager.amount;
                        if (bet.totalPool && bet.options) {
                            const selectionIndex = typeof wager.selection === "string"
                                ? parseInt(wager.selection)
                                : 0;
                            const optionPool = bet.options[selectionIndex]?.totalWagered || 1;
                            potentialPayout = Math.floor((wager.amount / optionPool) * bet.totalPool);
                        }

                        // Update Stats
                        newStats.totalActive++;
                        if (winStatus === "WINNING") {
                            newStats.winningCount++;
                            newStats.netPosition += (potentialPayout - wager.amount);
                            newStats.estimatedTotalPayout += potentialPayout;
                        } else if (winStatus === "LOSING") {
                            newStats.losingCount++;
                            newStats.netPosition -= wager.amount;
                        } else if (winStatus === "NEUTRAL") {
                            newStats.neutralCount++;
                        }

                        results.push({
                            bet,
                            wager,
                            liveScore: bet.liveScore,
                            winStatus,
                            potentialPayout
                        });
                    });
                });

                // Sort by last updated (desc)
                results.sort((a, b) => {
                    const tA = a.liveScore?.lastUpdated?.getTime() || 0;
                    const tB = b.liveScore?.lastUpdated?.getTime() || 0;
                    return tB - tA;
                });

                setLiveBets(results);
                setStats(newStats);
                setLastUpdated(new Date());
                setLoading(false);
            };

            // Setup listeners for each unique bet
            uniqueBets.forEach((betRef, betId) => {
                const unsub = onSnapshot(betRef, (snap: any) => {
                    if (snap.exists()) {
                        const betData = { id: snap.id, ...snap.data() } as Bet;
                        // Timestamp conversion
                        if (betData.liveScore?.lastUpdated?.toDate) {
                            betData.liveScore = {
                                ...betData.liveScore,
                                lastUpdated: betData.liveScore.lastUpdated.toDate()
                            };
                        }
                        betDataMap.set(betId, betData);
                        recalculate();
                    }
                });
                betUnsubscribes.push(unsub);
            });

        }, (err) => {
            console.error("Error setting up live bets listeners:", err);
            setError("Failed to load live bets");
            setLoading(false);
        });

        return () => {
            unsubWagers();
            betUnsubscribes.forEach(unsub => unsub());
        };
    }, [userId, leagueId]);

    return { liveBets, stats, lastUpdated, loading, error };
}
