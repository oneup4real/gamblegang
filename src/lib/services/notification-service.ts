"use client";

import { db } from "@/lib/firebase/config";
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    writeBatch,
    serverTimestamp,
    Timestamp,
    limit,
    collectionGroup
} from "firebase/firestore";

export type NotificationType =
    | "BET_WON"
    | "BET_LOST"
    | "BET_REFUNDED"
    | "PROOFING_STARTED"
    | "VOTE_NEEDED"
    | "DISPUTE_STARTED"
    | "BET_RESOLVED";

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    betId?: string;
    leagueId?: string;
    leagueName?: string;
    read: boolean;
    createdAt: Timestamp;
    path?: string; // Full path to document (for easier updates since we query collectionGroup)
}


// Get notification icon and color based on type
export function getNotificationStyle(type: NotificationType): { icon: string; color: string; bgColor: string } {
    switch (type) {
        case "BET_WON":
            return { icon: "🏆", color: "text-green-600", bgColor: "bg-green-100" };
        case "BET_LOST":
            return { icon: "😢", color: "text-red-600", bgColor: "bg-red-100" };
        case "BET_REFUNDED":
            return { icon: "♻️", color: "text-blue-600", bgColor: "bg-blue-100" };
        case "PROOFING_STARTED":
            return { icon: "⏳", color: "text-yellow-600", bgColor: "bg-yellow-100" };
        case "VOTE_NEEDED":
            return { icon: "🗳️", color: "text-purple-600", bgColor: "bg-purple-100" };
        case "DISPUTE_STARTED":
            return { icon: "⚠️", color: "text-orange-600", bgColor: "bg-orange-100" };
        case "BET_RESOLVED":
            return { icon: "✅", color: "text-blue-600", bgColor: "bg-blue-100" };
        default:
            return { icon: "🔔", color: "text-gray-600", bgColor: "bg-gray-100" };
    }
}

// Create a new notification
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
        betId?: string;
        leagueId?: string;
        leagueName?: string;
    }
): Promise<string> {
    // If leagueId is present, store in league subcollection to allow Owners to write for other members
    // Otherwise, try user subcollection (only works if writing for self or via Admin)
    let notificationsRef;

    if (options?.leagueId) {
        notificationsRef = collection(db, "leagues", options.leagueId, "notifications");
    } else {
        notificationsRef = collection(db, "users", userId, "notifications");
    }

    const docRef = await addDoc(notificationsRef, {
        userId, // Recipient ID
        type,
        title,
        message,
        betId: options?.betId || null,
        leagueId: options?.leagueId || null,
        leagueName: options?.leagueName || null,
        read: false,
        createdAt: serverTimestamp()
    });

    return docRef.id;
}

// Create notifications for multiple users
export async function createNotificationsForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    options?: {
        betId?: string;
        leagueId?: string;
        leagueName?: string;
    }
): Promise<void> {
    const batch = writeBatch(db);

    for (const userId of userIds) {
        let notificationsRef;
        if (options?.leagueId) {
            notificationsRef = collection(db, "leagues", options.leagueId, "notifications");
        } else {
            notificationsRef = collection(db, "users", userId, "notifications");
        }

        const newNotificationRef = doc(notificationsRef);

        batch.set(newNotificationRef, {
            userId,
            type,
            title,
            message,
            betId: options?.betId || null,
            leagueId: options?.leagueId || null,
            leagueName: options?.leagueName || null,
            read: false,
            createdAt: serverTimestamp()
        });
    }

    await batch.commit();
}

// Subscribe to user notifications (real-time) across all collections
export function subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
): () => void {
    // collectionGroup query to find notifications where userId == currentUser
    // This requires a Firestore Index (composite index on userId + createdAt might be needed)
    const q = query(
        collectionGroup(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            path: doc.ref.path, // Store path for updates/deletes
            ...doc.data()
        })) as Notification[];

        callback(notifications);
    }, (error) => {
        console.error("Notification subscription error:", error);
        // If error code is 'failed-precondition', it means missing index
        if (error.code === 'failed-precondition') {
            console.warn("Missing Firestore Index for Notifications. Please create it using the link in console.");
            // We can't easily alert() here without spamming, but logging is critical
        }
    });
}

// Subscribe to unread count (real-time)
// Note: collectionGroup requires reading all docs to count, unless we use aggregation queries (available in newer SDKs)
// or just count standard snapshot.
export function subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
): () => void {
    // Use collectionGroup to count ALL unread, not just user-subcollection
    const q = query(
        collectionGroup(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
    }, (error) => {
        console.error("Unread count subscription error:", error);
    });
}

// Mark single notification as read
export async function markAsRead(userId: string, notificationId: string, customPath?: string): Promise<void> {
    // If we have the full path (preferable), use it.
    // Otherwise fallback to user subcollection (legacy/default)
    // To support league notifications without path, we'd need to query. 
    // BUT avoiding querying for a single write is better.
    // The UI should pass the path if possible.

    let notificationRef;
    if (customPath) {
        // Parse path or just use doc(db, path)
        notificationRef = doc(db, customPath);
    } else {
        notificationRef = doc(db, "users", userId, "notifications", notificationId);
    }

    await updateDoc(notificationRef, { read: true });
}

// Mark all notifications as read
export async function markAllAsRead(userId: string): Promise<void> {
    // Use collectionGroup to find all unread
    const q = query(
        collectionGroup(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false)
    );
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
    });

    await batch.commit();
}

// Delete a single notification
export async function deleteNotification(userId: string, notificationId: string, customPath?: string): Promise<void> {
    let notificationRef;
    if (customPath) {
        notificationRef = doc(db, customPath);
    } else {
        notificationRef = doc(db, "users", userId, "notifications", notificationId);
    }
    await deleteDoc(notificationRef);
}

// Clear all notifications
export async function clearAllNotifications(userId: string, notifications?: Notification[]): Promise<void> {
    const batch = writeBatch(db);

    if (notifications && notifications.length > 0) {
        // Delete known notifications by path (much more efficient and avoids index issues)
        notifications.forEach(n => {
            if (n.path) {
                batch.delete(doc(db, n.path));
            } else {
                // Fallback for logic if path missing (shouldn't happen with updated subscribe)
                const ref = doc(db, "users", userId, "notifications", n.id);
                batch.delete(ref);
            }
        });
    } else {
        // Fallback: Query all (Requires Index)
        const q = query(
            collectionGroup(db, "notifications"),
            where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
    }

    await batch.commit();
}

// Format time ago for display
export function formatTimeAgo(timestamp: Timestamp): string {
    if (!timestamp) return "";

    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}
