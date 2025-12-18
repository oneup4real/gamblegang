"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Notification,
    getNotificationStyle,
    formatTimeAgo,
    deleteNotification,
    clearAllNotifications,
    markAllAsRead,
    markAsRead
} from "@/lib/services/notification-service";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "@/i18n/navigation";

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
}

export function NotificationModal({ isOpen, onClose, notifications }: NotificationModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [clearing, setClearing] = useState(false);

    const handleDelete = async (notificationId: string, path?: string) => {
        if (!user) return;
        setDeletingId(notificationId);
        try {
            await deleteNotification(user.uid, notificationId, path);
        } catch (error) {
            console.error("Failed to delete notification:", error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleClearAll = async () => {
        if (!user) return;
        setClearing(true);
        try {
            await clearAllNotifications(user.uid, notifications);
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        } finally {
            setClearing(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await markAllAsRead(user.uid);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!user) return;

        // Mark as read
        if (!notification.read) {
            await markAsRead(user.uid, notification.id, notification.path);
        }

        // Navigate to relevant page
        if (notification.leagueId && notification.betId) {
            router.push(`/leagues/${notification.leagueId}`);
            onClose();
        } else if (notification.leagueId) {
            router.push(`/leagues/${notification.leagueId}`);
            onClose();
        }
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }}
                        className="fixed top-20 right-4 w-full max-w-md bg-white border-3 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400">
                            <div className="flex items-center gap-2">
                                <Bell className="h-6 w-6 text-white" />
                                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                                    Notifications
                                </h2>
                                {unreadCount > 0 && (
                                    <span className="bg-white text-purple-600 text-xs font-black px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                            >
                                <X className="h-5 w-5 text-white" />
                            </button>
                        </div>

                        {/* Actions */}
                        {notifications.length > 0 && (
                            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                                <Button
                                    onClick={handleMarkAllRead}
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs font-bold text-gray-600 hover:text-purple-600"
                                    disabled={unreadCount === 0}
                                >
                                    <CheckCheck className="h-4 w-4 mr-1" />
                                    Mark all read
                                </Button>
                                <Button
                                    onClick={handleClearAll}
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50"
                                    disabled={clearing}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {clearing ? "Clearing..." : "Clear all"}
                                </Button>
                            </div>
                        )}

                        {/* Notification List */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Bell className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <p className="font-bold text-gray-500 mb-1">No notifications yet</p>
                                    <p className="text-sm text-gray-400">
                                        You'll see updates about your bets here
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {notifications.map((notification) => {
                                        const style = getNotificationStyle(notification.type);
                                        const isDeleting = deletingId === notification.id;

                                        return (
                                            <motion.div
                                                key={notification.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${!notification.read ? "bg-purple-50/50" : ""
                                                    }`}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon */}
                                                    <div
                                                        className={`w-10 h-10 rounded-xl ${style.bgColor} flex items-center justify-center text-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
                                                    >
                                                        {style.icon}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className={`font-black text-sm ${style.color}`}>
                                                                {notification.title}
                                                            </p>
                                                            {!notification.read && (
                                                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-xs text-gray-400 font-medium">
                                                                {formatTimeAgo(notification.createdAt)}
                                                            </p>
                                                            {notification.leagueName && (
                                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                                                                    {notification.leagueName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(notification.id, notification.path);
                                                        }}
                                                        disabled={isDeleting}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500"
                                                    >
                                                        {isDeleting ? (
                                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
