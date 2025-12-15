import { db } from "@/lib/firebase/config";
import { collection, doc, runTransaction, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { LeagueRole } from "@/lib/rbac";

export type LeagueMode = "ZERO_SUM" | "STANDARD";
export type LeagueStatus = "NOT_STARTED" | "STARTED" | "FINISHED" | "ARCHIVED";

export interface League {
    id: string;
    name: string;
    ownerId: string;
    startCapital: number;
    startDate?: any;
    endDate?: any;
    createdAt: any;
    memberCount: number;
    mode: LeagueMode;
    status: LeagueStatus;
}

export interface LeagueMember {
    uid: string;
    leagueId: string;
    role: LeagueRole;
    points: number;
    joinedAt: any;
    displayName: string;
    photoURL: string;
    totalInvested: number; // For Zero Sum logic (Buy-in + Rebuys)
}

export async function createLeague(
    user: User,
    leagueName: string,
    mode: LeagueMode,
    startCapital: number = 1000,
    startDate?: Date,
    endDate?: Date
) {
    if (!user) throw new Error("User must be logged in");

    const leagueRef = doc(collection(db, "leagues"));
    const leagueId = leagueRef.id;

    // In Standard mode, everyone starts with 0.
    // In Zero Sum, startCapital is the initial buy-in.
    const initialPoints = mode === "STANDARD" ? 0 : startCapital;

    const leagueData: League = {
        id: leagueId,
        name: leagueName,
        ownerId: user.uid,
        startCapital: initialPoints,
        createdAt: serverTimestamp(),
        memberCount: 1,
        mode: mode,
        status: "NOT_STARTED",
    };

    if (startDate) leagueData.startDate = startDate;
    if (endDate) leagueData.endDate = endDate;

    const memberData: LeagueMember = {
        uid: user.uid,
        leagueId: leagueId,
        role: "OWNER",
        points: initialPoints,
        joinedAt: serverTimestamp(),
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || "",
        totalInvested: mode === "ZERO_SUM" ? initialPoints : 0,
    };

    try {
        await runTransaction(db, async (transaction) => {
            // Create league document
            transaction.set(leagueRef, leagueData);

            // Create member document in subcollection
            const memberRef = doc(db, "leagues", leagueId, "members", user.uid);
            transaction.set(memberRef, memberData);
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

    // Increment points AND totalInvested
    await runTransaction(db, async (transaction) => {
        const memberSnap = await transaction.get(memberRef);
        if (!memberSnap.exists()) throw new Error("Member not found");

        const currentPoints = memberSnap.data().points || 0;
        const currentInvested = memberSnap.data().totalInvested || 0;

        transaction.update(memberRef, {
            points: currentPoints + amount,
            totalInvested: currentInvested + amount
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
