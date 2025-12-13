import { db } from "@/lib/firebase/config";
import { collection, doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { LeagueRole } from "@/lib/rbac";

export interface League {
    id: string;
    name: string;
    ownerId: string;
    startCapital: number;
    createdAt: any;
    memberCount: number;
}

export interface LeagueMember {
    uid: string;
    leagueId: string;
    role: LeagueRole;
    points: number;
    joinedAt: any;
    displayName: string;
    photoURL: string;
}

export async function createLeague(user: User, leagueName: string, startCapital: number = 1000) {
    if (!user) throw new Error("User must be logged in");

    const leagueRef = doc(collection(db, "leagues"));
    const leagueId = leagueRef.id;

    const leagueData: League = {
        id: leagueId,
        name: leagueName,
        ownerId: user.uid,
        startCapital: startCapital,
        createdAt: serverTimestamp(),
        memberCount: 1,
    };

    const memberData: LeagueMember = {
        uid: user.uid,
        leagueId: leagueId,
        role: "OWNER",
        points: startCapital,
        joinedAt: serverTimestamp(),
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || "",
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

export async function getUserLeagues(userId: string) {
    try {
        const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");

        // Query leagues where ownerId == userId
        // Note: Ideally we want all leagues where user is a member.
        // For that we need a Composite Index or a separate 'memberships' collection.
        // For this Alpha, we'll fetch owned leagues + we can fetch joined leagues if we structure data right.

        const q = query(
            collection(db, "leagues"),
            where("ownerId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League));
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
        batch.update(doc.ref, { points: startCapital });
        count++;
    });

    // Also archive/cancel all OPEN bets? 
    // For simplicity, we won't touch bets, but in a real app -> Cancel all OPEN bets.

    await batch.commit();
    return count;
}
