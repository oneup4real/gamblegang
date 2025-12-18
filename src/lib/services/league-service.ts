import { db } from "@/lib/firebase/config";
import { collection, doc, runTransaction, writeBatch, serverTimestamp, setDoc, deleteDoc, getDocs, getDoc, query, where } from "firebase/firestore";
import { User } from "firebase/auth";
import { LeagueRole, hasPermission } from "@/lib/rbac";
import { logMemberJoined, logPointsBought } from "./activity-log-service";

export type LeagueMode = "ZERO_SUM" | "STANDARD";
export type LeagueStatus = "NOT_STARTED" | "STARTED" | "FINISHED" | "ARCHIVED";
export type BuyInType = "FIXED" | "FLEXIBLE";

// Power Up Types for Arcade Mode
export type PowerUpType = 'x2' | 'x3' | 'x4';
export interface PowerUpInventory {
    x2: number;
    x3: number;
    x4: number;
}
export interface LeaguePowerUpConfig {
    x2: number;
    x3: number;
    x4: number;
}

export interface League {
    id: string;
    name: string;
    ownerId: string;
    startCapital: number;
    buyInType?: BuyInType; // Only for ZERO_SUM mode
    matchSettings?: MatchSettings;
    arcadePowerUpSettings?: LeaguePowerUpConfig; // Configuration for starting power-ups
    startDate?: any;
    endDate?: any;
    createdAt: any;
    memberCount: number;
    mode: LeagueMode;
    status: LeagueStatus;
    disputeWindowHours?: number; // Configurable dispute period (default: 12)
    aiAutoConfirmEnabled?: boolean;
    icon?: string; // Custom emoji or icon identifier
    colorScheme?: LeagueColorScheme; // Predefined color scheme
}

// Predefined color schemes for leagues
export type LeagueColorScheme =
    | 'purple'   // Purple to Pink
    | 'blue'     // Blue to Cyan  
    | 'green'    // Green to Teal
    | 'orange'   // Orange to Red
    | 'gold'     // Gold to Yellow
    | 'dark'     // Dark gray to black
    | 'sunset'   // Pink to Orange
    | 'ocean';   // Teal to Blue

// Color scheme definitions
export const LEAGUE_COLOR_SCHEMES: Record<LeagueColorScheme, { from: string; to: string; text: string; name: string }> = {
    purple: { from: 'from-purple-500', to: 'to-pink-500', text: 'text-white', name: 'Purple Haze' },
    blue: { from: 'from-blue-500', to: 'to-cyan-500', text: 'text-white', name: 'Ocean Deep' },
    green: { from: 'from-green-500', to: 'to-teal-500', text: 'text-white', name: 'Forest' },
    orange: { from: 'from-orange-500', to: 'to-red-500', text: 'text-white', name: 'Fire' },
    gold: { from: 'from-yellow-400', to: 'to-amber-500', text: 'text-black', name: 'Gold Rush' },
    dark: { from: 'from-gray-700', to: 'to-gray-900', text: 'text-white', name: 'Midnight' },
    sunset: { from: 'from-pink-500', to: 'to-orange-500', text: 'text-white', name: 'Sunset' },
    ocean: { from: 'from-teal-500', to: 'to-blue-600', text: 'text-white', name: 'Tropical' }
};

// Predefined icons for leagues
export const LEAGUE_ICONS = [
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥊',
    '🎮', '🎯', '🎲', '♠️', '🏆', '🎰', '🎪', '🎭',
    '🚀', '💎', '👑', '🔥', '⚡', '💰', '🌟', '🦁'
];

export interface MatchSettings {
    exact: number;
    diff: number;
    winner: number;
    choice?: number; // Multiple Choice points
    range?: number; // Guessing points
}

export interface LeagueMember {
    uid: string;
    leagueId: string;
    role: LeagueRole;
    points: number;
    joinedAt: any;
    displayName: string;
    photoURL: string;
    totalInvested: number; // Only actual bets placed
    totalBought: number; // Initial capital + Rebuys (not counted as invested)
    powerUps?: PowerUpInventory; // Arcade mode inventory
    recentResults?: ('W' | 'L' | 'P')[]; // Sliding window of last 10 bet results
}

export async function createLeague(
    user: User,
    leagueName: string,
    mode: LeagueMode,
    startCapital: number = 1000,
    buyInType: BuyInType = "FIXED",
    startDate?: Date,
    endDate?: Date,
    matchSettings?: MatchSettings,
    icon?: string,
    colorScheme?: LeagueColorScheme,
    arcadePowerUpSettings?: LeaguePowerUpConfig,
    disputeWindowHours: number = 12,
) {
    if (!user) throw new Error("User must be logged in");

    const leagueRef = doc(collection(db, "leagues"));
    const leagueId = leagueRef.id;

    // In Standard mode, everyone starts with 0.
    // In Zero Sum FIXED, everyone gets startCapital.
    // In Zero Sum FLEXIBLE, everyone starts with 0.
    const initialPoints = mode === "STANDARD" ? 0 : (buyInType === "FIXED" ? startCapital : 0);

    const leagueData: Record<string, any> = {
        id: leagueId,
        name: leagueName,
        ownerId: user.uid,
        mode,
        startCapital,
        createdAt: serverTimestamp(),
        memberCount: 1,
        status: "NOT_STARTED",
        aiAutoConfirmEnabled: true, // Default enabled
        icon: icon || (mode === "ZERO_SUM" ? "💰" : "🎮"),
        colorScheme: colorScheme || "purple",
        disputeWindowHours
    };

    if (mode === "ZERO_SUM") {
        leagueData.buyInType = buyInType;
    }

    if (mode === "STANDARD") {
        leagueData.matchSettings = matchSettings || { exact: 3, diff: 1, winner: 2, choice: 1, range: 1 };
        // Default power-up settings if not provided
        if (arcadePowerUpSettings) {
            leagueData.arcadePowerUpSettings = arcadePowerUpSettings;
        } else {
            // Default: 3x 'x2', 1x 'x3', 0x 'x4' (can be adjusted)
            leagueData.arcadePowerUpSettings = { x2: 3, x3: 1, x4: 0 };
        }
    }

    if (startDate) leagueData.startDate = startDate;
    if (endDate) leagueData.endDate = endDate;

    const ownerMember: LeagueMember = {
        uid: user.uid,
        leagueId,
        role: "OWNER",
        points: initialPoints,
        joinedAt: serverTimestamp(),
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || "",
        totalInvested: 0, // Only actual bets count
        totalBought: mode === "ZERO_SUM" && buyInType === "FIXED" ? startCapital : 0, // Initial capital
    };

    if (mode === "STANDARD" && leagueData.arcadePowerUpSettings) {
        ownerMember.powerUps = { ...leagueData.arcadePowerUpSettings };
    }

    try {
        await runTransaction(db, async (transaction) => {
            // Create league document
            transaction.set(leagueRef, leagueData);

            // Create member document in subcollection
            const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
            transaction.set(memberRef, ownerMember);
        });
        return leagueId;
    } catch (error) {
        console.error("Error creating league:", error);
        throw error;
    }
}

export async function updateLeagueStatus(leagueId: string, status: LeagueStatus) {
    const leagueRef = doc(db, "leagues", leagueId);
    await setDoc(leagueRef, { status }, { merge: true });
}

export async function rebuy(leagueId: string, userId: string, amount: number) {
    const memberRef = doc(db, "leagues", leagueId, "members", userId);

    // Increment points AND totalBought (NOT totalInvested - that's only for bets)
    await runTransaction(db, async (transaction) => {
        const memberSnap = await transaction.get(memberRef);
        if (!memberSnap.exists()) throw new Error("Member not found");

        const currentPoints = memberSnap.data().points || 0;
        const currentBought = memberSnap.data().totalBought || 0;

        transaction.update(memberRef, {
            points: currentPoints + amount,
            totalBought: currentBought + amount
        });
    });
}


export async function getUserLeagues(userId: string) {
    try {
        const { collectionGroup, query, where, getDocs, getDoc, doc, collection } = await import("firebase/firestore");

        // 1. Fetch leagues owned by the user (Simpler query, usually works without custom index)
        const ownedQuery = query(
            collection(db, "leagues"),
            where("ownerId", "==", userId)
        );

        let ownedLeagues: League[] = [];
        try {
            const ownedSnap = await getDocs(ownedQuery);
            ownedLeagues = ownedSnap.docs.map(d => ({ id: d.id, ...d.data() } as League));
        } catch (e) {
            console.error("Error fetching owned leagues:", e);
        }

        // 2. Find all memberships for this user across all leagues (Requires CollectionGroup Index)
        let memberLeagueIds: string[] = [];
        try {
            const membershipsQuery = query(
                collectionGroup(db, "members"),
                where("uid", "==", userId)
            );
            const membershipsSnap = await getDocs(membershipsQuery);
            memberLeagueIds = membershipsSnap.docs.map(d => d.data().leagueId).filter(id => !!id);
        } catch (e) {
            console.warn("Index missing for CollectionGroup 'members'? Fetched only owned leagues. Check console for link.", e);
        }

        // 3. Fetch joined leagues if any
        let joinedLeagues: League[] = [];
        if (memberLeagueIds.length > 0) {
            const uniqueIds = [...new Set(memberLeagueIds)]; // Deduplicate just in case
            // Filter out ones we already fetched as owner to save reads (optional, but good practice)
            const newIds = uniqueIds.filter(id => !ownedLeagues.find(ol => ol.id === id));

            if (newIds.length > 0) {
                const leaguePromises = newIds.map(id => getDoc(doc(db, "leagues", id)));
                const leagueSnaps = await Promise.all(leaguePromises);
                joinedLeagues = leagueSnaps
                    .filter(snap => snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() } as League));
            }
        }

        // 4. Merge and return
        return [...ownedLeagues, ...joinedLeagues];

    } catch (error) {
        console.error("Error fetching leagues:", error);
        return [];
    }
}

export async function updateLeague(leagueId: string, updates: Partial<League>) {
    const leagueRef = doc(db, "leagues", leagueId);
    await setDoc(leagueRef, updates, { merge: true });
}

export async function backfillPowerUps(leagueId: string) {
    // First, get the league settings
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);

    if (!leagueSnap.exists()) {
        throw new Error("League not found");
    }

    const league = leagueSnap.data() as League;

    // Use league's configured settings, or default if not set
    const powerUpSettings = league.arcadePowerUpSettings || { x2: 3, x3: 1, x4: 0 };

    // Get all members
    const membersRef = collection(db, "leagues", leagueId, "members");
    const membersSnap = await getDocs(membersRef);

    const batch = writeBatch(db);

    membersSnap.docs.forEach(memberDoc => {
        // Set powerUps for each member using the league's settings
        batch.set(memberDoc.ref, { powerUps: powerUpSettings }, { merge: true });
    });

    // Always set league's arcadePowerUpSettings to ensure it exists
    batch.set(leagueRef, {
        arcadePowerUpSettings: powerUpSettings
    }, { merge: true });

    await batch.commit();

    console.log(`[backfillPowerUps] Updated ${membersSnap.docs.length} members with powerUps:`, powerUpSettings);
}

export async function resetLeague(leagueId: string, startCapital: number) {
    // Reset all members to startCapital
    const { writeBatch, getDocs, collection } = await import("firebase/firestore");

    const membersRef = collection(db, "leagues", leagueId, "members");
    const membersSnap = await getDocs(membersRef);

    // Process in batches of 500 (Firestore limit)
    const batch = writeBatch(db);
    let count = 0;

    membersSnap.docs.forEach(doc => {
        batch.update(doc.ref, {
            points: startCapital,
            totalInvested: startCapital // Reset invested too? Usually new season = new buy in. 
        });
        count++;
    });

    // Also archive/cancel all OPEN bets? 
    // For simplicity, we won't touch bets, but in a real app -> Cancel all OPEN bets.

    await batch.commit();
    return count;
}

export async function deleteLeague(leagueId: string) {
    const leagueRef = doc(db, "leagues", leagueId);
    await deleteDoc(leagueRef);
}

export async function joinLeague(leagueId: string, user: User) {
    if (!user) throw new Error("User must be logged in");

    const leagueRef = doc(db, "leagues", leagueId);

    await runTransaction(db, async (transaction) => {
        const leagueSnap = await transaction.get(leagueRef);
        if (!leagueSnap.exists()) throw new Error("League not found");

        const leagueData = leagueSnap.data() as League;
        const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
        const memberSnap = await transaction.get(memberRef);

        if (memberSnap.exists()) {
            // Already a member
            return;
        }

        let initialPoints = 0;
        let initialBought = 0;

        // In STANDARD mode, everyone starts with 0.
        // In ZERO_SUM, depends on buyInType.
        if (leagueData.mode === "ZERO_SUM") {
            if (leagueData.buyInType === "FIXED") {
                initialPoints = leagueData.startCapital;
                initialBought = leagueData.startCapital;
            }
            // FLEXIBLE starts at 0, user buys in later
        }

        // Fetch user profile from Firestore to get updated photoURL
        const userProfileRef = doc(db, "users", user.uid);
        const userProfileSnap = await transaction.get(userProfileRef);
        const userProfile = userProfileSnap.exists() ? userProfileSnap.data() : null;

        const memberData: LeagueMember = {
            uid: user.uid,
            leagueId,
            role: "MEMBER",
            points: initialPoints,
            totalBought: initialBought,
            totalInvested: 0,
            joinedAt: serverTimestamp(),
            displayName: userProfile?.displayName || user.displayName || "Anonymous",
            photoURL: userProfile?.photoURL || user.photoURL || ""
        };

        if (leagueData.mode === "STANDARD" && leagueData.arcadePowerUpSettings) {
            memberData.powerUps = { ...leagueData.arcadePowerUpSettings };
        }

        transaction.set(memberRef, memberData);
        // Increment member count
        transaction.update(leagueRef, {
            memberCount: (leagueData.memberCount || 0) + 1
        });
    });

    // Log activity (fire and forget)
    logMemberJoined(leagueId, user).catch(console.error);
}

/**
 * Calculate active wagers for all members in a league
 * Returns a map of userId -> activeWagered amount (excluding resolved/invalid bets)
 */
export async function getAllMembersActiveWagers(leagueId: string): Promise<Record<string, number>> {
    const activeWagersByMember: Record<string, number> = {};

    try {
        // 1. Get all bets for this league
        const betsRef = collection(db, "leagues", leagueId, "bets");
        const betsSnap = await getDocs(betsRef);

        // 2. For each non-resolved bet, get all wagers
        for (const betDoc of betsSnap.docs) {
            const bet = betDoc.data();

            // Only count wagers from non-resolved bets
            if (!["RESOLVED", "INVALID"].includes(bet.status)) {
                // Get all wagers for this bet
                const wagersRef = collection(db, "leagues", leagueId, "bets", betDoc.id, "wagers");
                const wagersSnap = await getDocs(wagersRef);

                // Sum up wagers by user
                wagersSnap.docs.forEach(wagerDoc => {
                    const wager = wagerDoc.data();
                    const userId = wager.userId;
                    const amount = wager.amount || 0;

                    activeWagersByMember[userId] = (activeWagersByMember[userId] || 0) + amount;
                });
            }
        }

        return activeWagersByMember;
    } catch (error) {
        console.error("Error calculating active wagers:", error);
        return {};
    }
}

/**
 * Update a member's role in the league
 * Only OWNER can assign roles
 */
export async function updateMemberRole(
    leagueId: string,
    memberId: string,
    newRole: LeagueRole,
    currentUserRole: LeagueRole
): Promise<void> {
    // Permission check - only OWNER can assign roles
    if (!hasPermission(currentUserRole, "ASSIGN_ROLE")) {
        throw new Error("You don't have permission to assign roles");
    }

    const memberRef = doc(db, "leagues", leagueId, "members", memberId);
    await setDoc(memberRef, { role: newRole }, { merge: true });
}
