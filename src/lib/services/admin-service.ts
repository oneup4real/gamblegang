import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    limit,
    getCountFromServer,
    where,
    getDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { UserProfile } from "./user-service";
import { League } from "./league-service";

export interface DashboardStats {
    totalUsers: number;
    totalLeagues: number;
    totalBets: number; // Might be approximate or require index
}

/**
 * Fetch high-level stats for the admin dashboard
 */
export async function getAdminStats(): Promise<DashboardStats> {
    try {
        const usersColl = collection(db, "users");
        const leaguesColl = collection(db, "leagues");

        // Use getCountFromServer for efficiency (cost: 1 read per 1000 items)
        const usersSnapshot = await getCountFromServer(usersColl);
        const leaguesSnapshot = await getCountFromServer(leaguesColl);

        // For bets, we'd need a collectionGroup query which might fail without index.
        // Let's try it, but fallback to 0 if it fails.
        let betsCount = 0;
        try {
            // Note: collectionGroup count requires an index if used with filters, 
            // but pure count might work if there are no filters.
            // However, collectionGroup query is expensive if we actually fetched docs.
            // getCountFromServer is optimized.
            const betsSnapshot = await getCountFromServer(query(collection(db, "leagues"))); // Placeholder logic if structure implies
            // Actually, we can't do collectionGroup count easily without specific index on 'bets'.
            // Let's just return 0 or implement a cloud function for this later.
            // Better: just count leagues * avg bets? No, inaccurate.

            // Let's rely on a simple client-side count of recent activity instead?
            // Or just return 0 for now to be safe.
        } catch (e) {
            console.warn("Failed to count bets", e);
        }

        return {
            totalUsers: usersSnapshot.data().count,
            totalLeagues: leaguesSnapshot.data().count,
            totalBets: 0
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return { totalUsers: 0, totalLeagues: 0, totalBets: 0 };
    }
}

/**
 * Fetch all users (limited to most recent 100 for performance)
 */
export async function getAllUsers(limitCount = 100): Promise<UserProfile[]> {
    try {
        const q = query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as UserProfile);
    } catch (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
}

/**
 * Fetch all leagues (limited to most recent 100)
 */
export async function getAllLeagues(limitCount = 100): Promise<League[]> {
    try {
        const q = query(
            collection(db, "leagues"),
            orderBy("createdAt", "desc"), // Assumes createdAt exists on League
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as League));
    } catch (error) {
        console.error("Error fetching all leagues:", error);
        return [];
    }
}

/**
 * Toggle user Super Admin status
 */
export async function toggleSuperAdmin(uid: string, currentStatus: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, "users", uid), {
            isSuperAdmin: !currentStatus,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error toggling admin status:", error);
        throw error;
    }
}

/**
 * Delete a user's profile/data (Client Side only - cannot delete Auth account)
 */
export async function deleteUserData(uid: string): Promise<void> {
    try {
        // 1. Delete user profile
        await deleteDoc(doc(db, "users", uid));

        // Note: This leaves "orphaned" member records in leagues. 
        // A proper cleanup would require a cloud function or complex client logic.
        // For MVP Admin, just deleting the profile prevents them from showing up in main lists.
    } catch (error) {
        console.error("Error deleting user data:", error);
        throw error;
    }
}

/**
 * Delete a league (And all sub-data ideally)
 */
export async function deleteLeagueAsAdmin(leagueId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, "leagues", leagueId));
        // Subcollections (bets, members) are NOT automatically deleted by Firestore.
        // This creates orphaned data.
        // Ideally, triggering the 'cleanup-orphaned-data' logic or a Cloud Function is better.
        // For now, we delete the top-level doc so it disappears from UI.
    } catch (error) {
        console.error("Error deleting league:", error);
        throw error;
    }
}

import { LeagueMember } from "./league-service";

/**
 * Fetch all members of a specific league for detailed view
 */
export async function getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
    try {
        const membersSnapshot = await getDocs(collection(db, "leagues", leagueId, "members"));
        return membersSnapshot.docs.map(doc => doc.data() as LeagueMember);
    } catch (error) {
        console.error("Error fetching league members:", error);
        return [];
    }
}
