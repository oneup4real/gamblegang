/**
 * Activity Log Service
 * Provides audit trail functionality for leagues
 */

import { db } from "@/lib/firebase/config";
import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    where,
    startAfter,
    DocumentSnapshot,
    writeBatch
} from "firebase/firestore";

// Activity Log Entry Types
export type ActivityType =
    | 'BET_CREATED'
    | 'BET_PUBLISHED'
    | 'BET_LOCKED'
    | 'BET_PROOFING'
    | 'BET_RESOLVED'
    | 'BET_DISPUTED'
    | 'BET_INVALID'
    | 'AI_AUTO_RESOLVE'
    | 'AI_BULK_GENERATE'
    | 'WAGER_PLACED'
    | 'WAGER_CANCELLED'
    | 'MEMBER_JOINED'
    | 'MEMBER_LEFT'
    | 'POINTS_BOUGHT'
    | 'PAYOUT_DISTRIBUTED'
    | 'DISPUTE_VOTE'
    | 'SETTINGS_CHANGED'
    | 'LEAGUE_CREATED';

export interface ActivityLogEntry {
    id: string;
    timestamp: Date;
    type: ActivityType;
    actorId: string;        // User ID or 'system' / 'ai-scheduler'
    actorName: string;      // Display name
    actorAvatar?: string;   // Avatar URL
    targetId?: string;      // Bet ID, Member ID, etc.
    targetName?: string;    // Bet question, member name
    details?: {
        oldStatus?: string;
        newStatus?: string;
        aiResult?: any;
        amount?: number;
        source?: string;
        confidence?: string;
        selection?: string;
        vote?: string;
        [key: string]: any;
    };
    message: string;        // Human-readable summary
}

interface LogActivityParams {
    leagueId: string;
    type: ActivityType;
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetId?: string;
    targetName?: string;
    details?: Record<string, any>;
    message: string;
}

// ============================================
// COST CONTROL CONFIGURATION
// ============================================
const LOG_CONFIG = {
    MAX_LOGS_PER_LEAGUE: 500,      // Maximum logs before auto-pruning
    PRUNE_BATCH_SIZE: 100,         // How many old logs to delete when cap is reached
    PRUNE_CHECK_INTERVAL: 50,      // Check cap every N writes (reduces read costs)
    MAX_MESSAGE_LENGTH: 500,       // Truncate long messages
    MAX_DETAILS_SIZE: 2048,        // Max size of details object in bytes
};

// Simple in-memory counter to reduce read operations
const writeCounters: Map<string, number> = new Map();

/**
 * Log an activity to the league's activity log
 * Includes cost control: caps, pruning, and error handling
 */
export async function logActivity(params: LogActivityParams): Promise<string> {
    const { leagueId, type, actorId, actorName, actorAvatar, targetId, targetName, details, message } = params;

    try {
        const activityRef = collection(db, "leagues", leagueId, "activityLog");

        // Truncate message if too long
        const truncatedMessage = message.length > LOG_CONFIG.MAX_MESSAGE_LENGTH
            ? message.substring(0, LOG_CONFIG.MAX_MESSAGE_LENGTH) + '...'
            : message;

        // Sanitize details to prevent oversized entries
        let sanitizedDetails = details;
        if (details) {
            const detailsString = JSON.stringify(details);
            if (detailsString.length > LOG_CONFIG.MAX_DETAILS_SIZE) {
                sanitizedDetails = {
                    _truncated: true,
                    summary: detailsString.substring(0, 200) + '...'
                };
            }
        }

        const entry = {
            timestamp: Timestamp.now(),
            type,
            actorId,
            actorName: actorName.substring(0, 100), // Limit name length
            actorAvatar: actorAvatar || null,
            targetId: targetId || null,
            targetName: targetName ? targetName.substring(0, 200) : null, // Limit
            details: sanitizedDetails || null,
            message: truncatedMessage
        };

        const docRef = await addDoc(activityRef, entry);

        // Increment write counter
        const currentCount = (writeCounters.get(leagueId) || 0) + 1;
        writeCounters.set(leagueId, currentCount);

        // Check if we should prune (every N writes to reduce read costs)
        if (currentCount % LOG_CONFIG.PRUNE_CHECK_INTERVAL === 0) {
            // Fire and forget - don't await
            pruneOldLogs(leagueId).catch(() => { });
            writeCounters.set(leagueId, 0); // Reset counter
        }

        return docRef.id;
    } catch (error) {
        // Silent fail - logging should NEVER break the main application flow
        // Just log to console for debugging, don't re-throw
        console.error("Failed to log activity (non-blocking):", error);
        return "";
    }
}

/**
 * Prune old logs when the cap is exceeded
 * Deletes the oldest logs in batches
 */
export async function pruneOldLogs(leagueId: string): Promise<number> {
    try {
        const activityRef = collection(db, "leagues", leagueId, "activityLog");

        // Count total logs
        const countQuery = query(activityRef, orderBy("timestamp", "desc"));
        const countSnapshot = await getDocs(countQuery);
        const totalLogs = countSnapshot.size;

        if (totalLogs <= LOG_CONFIG.MAX_LOGS_PER_LEAGUE) {
            return 0; // No pruning needed
        }

        // Get the oldest logs to delete
        const logsToDelete = totalLogs - LOG_CONFIG.MAX_LOGS_PER_LEAGUE + LOG_CONFIG.PRUNE_BATCH_SIZE;
        const oldestLogsQuery = query(
            activityRef,
            orderBy("timestamp", "asc"),
            limit(logsToDelete)
        );

        const oldestSnapshot = await getDocs(oldestLogsQuery);

        // Batch delete (Firestore allows up to 500 operations per batch)
        const batch = writeBatch(db);
        let deleteCount = 0;

        oldestSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deleteCount++;
        });

        if (deleteCount > 0) {
            await batch.commit();
            console.log(`Pruned ${deleteCount} old activity logs from league ${leagueId}`);
        }

        return deleteCount;
    } catch (error) {
        console.error("Failed to prune logs (non-blocking):", error);
        return 0;
    }
}

/**
 * Get the current log count for a league (for admin monitoring)
 */
export async function getLogCount(leagueId: string): Promise<number> {
    try {
        const activityRef = collection(db, "leagues", leagueId, "activityLog");
        const snapshot = await getDocs(activityRef);
        return snapshot.size;
    } catch {
        return 0;
    }
}

/**
 * Manually trigger log cleanup (for admin use)
 */
export async function cleanupLogs(leagueId: string, keepCount: number = 200): Promise<number> {
    try {
        const activityRef = collection(db, "leagues", leagueId, "activityLog");

        // Get all logs sorted by time (oldest first)
        const allLogsQuery = query(activityRef, orderBy("timestamp", "asc"));
        const snapshot = await getDocs(allLogsQuery);

        const totalLogs = snapshot.size;
        if (totalLogs <= keepCount) {
            return 0;
        }

        const deleteCount = totalLogs - keepCount;
        const logsToDelete = snapshot.docs.slice(0, deleteCount);

        // Delete in batches of 500 (Firestore limit)
        let deletedTotal = 0;
        for (let i = 0; i < logsToDelete.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = logsToDelete.slice(i, i + 500);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            deletedTotal += chunk.length;
        }

        return deletedTotal;
    } catch (error) {
        console.error("Failed to cleanup logs:", error);
        return 0;
    }
}

/**
 * Get activity logs for a league with pagination
 */
export async function getActivityLogs(
    leagueId: string,
    pageSize: number = 50,
    lastDoc?: DocumentSnapshot
): Promise<{ entries: ActivityLogEntry[], lastDoc: DocumentSnapshot | null }> {
    const activityRef = collection(db, "leagues", leagueId, "activityLog");

    let q = query(
        activityRef,
        orderBy("timestamp", "desc"),
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(
            activityRef,
            orderBy("timestamp", "desc"),
            startAfter(lastDoc),
            limit(pageSize)
        );
    }

    const snapshot = await getDocs(q);

    const entries: ActivityLogEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            timestamp: data.timestamp?.toDate() || new Date(),
            type: data.type,
            actorId: data.actorId,
            actorName: data.actorName,
            actorAvatar: data.actorAvatar,
            targetId: data.targetId,
            targetName: data.targetName,
            details: data.details,
            message: data.message
        };
    });

    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { entries, lastDoc: newLastDoc };
}

/**
 * Get activity logs filtered by type
 */
export async function getActivityLogsByType(
    leagueId: string,
    types: ActivityType[],
    pageSize: number = 50
): Promise<ActivityLogEntry[]> {
    const activityRef = collection(db, "leagues", leagueId, "activityLog");

    const q = query(
        activityRef,
        where("type", "in", types),
        orderBy("timestamp", "desc"),
        limit(pageSize)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            timestamp: data.timestamp?.toDate() || new Date(),
            type: data.type,
            actorId: data.actorId,
            actorName: data.actorName,
            actorAvatar: data.actorAvatar,
            targetId: data.targetId,
            targetName: data.targetName,
            details: data.details,
            message: data.message
        };
    });
}

/**
 * Get activity logs for a specific bet
 */
export async function getBetActivityLogs(
    leagueId: string,
    betId: string
): Promise<ActivityLogEntry[]> {
    const activityRef = collection(db, "leagues", leagueId, "activityLog");

    const q = query(
        activityRef,
        where("targetId", "==", betId),
        orderBy("timestamp", "desc"),
        limit(100)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            timestamp: data.timestamp?.toDate() || new Date(),
            type: data.type,
            actorId: data.actorId,
            actorName: data.actorName,
            actorAvatar: data.actorAvatar,
            targetId: data.targetId,
            targetName: data.targetName,
            details: data.details,
            message: data.message
        };
    });
}

// ============================================
// HELPER FUNCTIONS FOR COMMON LOG ENTRIES
// ============================================

interface UserInfo {
    uid: string;
    displayName?: string | null;
    photoURL?: string | null;
}

export async function logBetCreated(
    leagueId: string,
    user: UserInfo,
    betId: string,
    betQuestion: string
) {
    return logActivity({
        leagueId,
        type: 'BET_CREATED',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        targetId: betId,
        targetName: betQuestion,
        message: `${user.displayName || 'Unknown'} created bet: "${betQuestion}"`
    });
}

export async function logBetPublished(
    leagueId: string,
    user: UserInfo,
    betId: string,
    betQuestion: string
) {
    return logActivity({
        leagueId,
        type: 'BET_PUBLISHED',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        targetId: betId,
        targetName: betQuestion,
        details: { newStatus: 'OPEN' },
        message: `${user.displayName || 'Unknown'} published bet: "${betQuestion}"`
    });
}

export async function logBetStatusChange(
    leagueId: string,
    actorId: string,
    actorName: string,
    betId: string,
    betQuestion: string,
    oldStatus: string,
    newStatus: string,
    actorAvatar?: string
) {
    const typeMap: Record<string, ActivityType> = {
        'LOCKED': 'BET_LOCKED',
        'PROOFING': 'BET_PROOFING',
        'RESOLVED': 'BET_RESOLVED',
        'DISPUTED': 'BET_DISPUTED',
        'INVALID': 'BET_INVALID'
    };

    return logActivity({
        leagueId,
        type: typeMap[newStatus] || 'BET_RESOLVED',
        actorId,
        actorName,
        actorAvatar,
        targetId: betId,
        targetName: betQuestion,
        details: { oldStatus, newStatus },
        message: `Bet "${betQuestion}" changed from ${oldStatus} to ${newStatus}`
    });
}

export async function logWagerPlaced(
    leagueId: string,
    user: UserInfo,
    betId: string,
    betQuestion: string,
    amount: number,
    selection: string
) {
    return logActivity({
        leagueId,
        type: 'WAGER_PLACED',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        targetId: betId,
        targetName: betQuestion,
        details: { amount, selection },
        message: `${user.displayName || 'Unknown'} wagered ${amount} pts on "${selection}"`
    });
}

export async function logAIAutoResolve(
    leagueId: string,
    betId: string,
    betQuestion: string,
    result: any,
    source?: string,
    confidence?: string
) {
    return logActivity({
        leagueId,
        type: 'AI_AUTO_RESOLVE',
        actorId: 'ai-scheduler',
        actorName: 'AI Auto-Resolver',
        targetId: betId,
        targetName: betQuestion,
        details: {
            aiResult: result,
            source: source || 'AI',
            confidence: confidence || 'unknown'
        },
        message: `AI resolved bet "${betQuestion}" - Result: ${JSON.stringify(result)} (Source: ${source || 'AI'})`
    });
}

export async function logDisputeVote(
    leagueId: string,
    user: UserInfo,
    betId: string,
    betQuestion: string,
    vote: 'approve' | 'reject'
) {
    return logActivity({
        leagueId,
        type: 'DISPUTE_VOTE',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        targetId: betId,
        targetName: betQuestion,
        details: { vote },
        message: `${user.displayName || 'Unknown'} voted to ${vote} result for "${betQuestion}"`
    });
}

export async function logMemberJoined(
    leagueId: string,
    user: UserInfo
) {
    return logActivity({
        leagueId,
        type: 'MEMBER_JOINED',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        message: `${user.displayName || 'Unknown'} joined the league`
    });
}

export async function logPointsBought(
    leagueId: string,
    user: UserInfo,
    amount: number
) {
    return logActivity({
        leagueId,
        type: 'POINTS_BOUGHT',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        details: { amount },
        message: `${user.displayName || 'Unknown'} bought ${amount} points`
    });
}

export async function logPayoutDistributed(
    leagueId: string,
    betId: string,
    betQuestion: string,
    totalPayout: number,
    winnerCount: number
) {
    return logActivity({
        leagueId,
        type: 'PAYOUT_DISTRIBUTED',
        actorId: 'system',
        actorName: 'System',
        targetId: betId,
        targetName: betQuestion,
        details: { totalPayout, winnerCount },
        message: `Payout of ${totalPayout} pts distributed to ${winnerCount} winner(s) for "${betQuestion}"`
    });
}

export async function logBulkBetsGenerated(
    leagueId: string,
    user: UserInfo,
    topic: string,
    betCount: number
) {
    return logActivity({
        leagueId,
        type: 'AI_BULK_GENERATE',
        actorId: user.uid,
        actorName: user.displayName || 'Unknown',
        actorAvatar: user.photoURL || undefined,
        details: { topic, betCount },
        message: `${user.displayName || 'Unknown'} generated ${betCount} bets using AI for "${topic}"`
    });
}
