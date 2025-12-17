"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { NotificationModal } from "@/components/notification-modal";
import {
    Notification,
    subscribeToNotifications,
    subscribeToUnreadCount
} from "@/lib/services/notification-service";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationBell() {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Subscribe to notifications and unread count
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        // Subscribe to notifications list
        const unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
            setNotifications(notifs);
        });

        // Subscribe to unread count
        const unsubCount = subscribeToUnreadCount(user.uid, (count) => {
            setUnreadCount(count);
        });

        return () => {
            unsubNotifications();
            unsubCount();
        };
    }, [user]);

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="relative h-10 w-10 flex items-center justify-center rounded-full border-2 border-black bg-purple-500 hover:scale-110 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                title="Notifications"
            >
                <Bell className="w-5 h-5 text-white" />

                {/* Unread badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-black rounded-full border-2 border-white px-1"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            <NotificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                notifications={notifications}
            />
        </>
    );
}
