"use client";

import { useState } from "react";
import { X, Megaphone, Send, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { User } from "firebase/auth";

interface LeagueAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    leagueId: string;
    leagueName: string;
    user: User;
}

export function LeagueAnnouncementModal({
    isOpen,
    onClose,
    leagueId,
    leagueName,
    user
}: LeagueAnnouncementModalProps) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        try {
            // Add to league's announcements collection
            const announcementsRef = collection(db, "leagues", leagueId, "announcements");
            await addDoc(announcementsRef, {
                title: title.trim() || "📢 Announcement",
                message: message.trim(),
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.displayName || "League Admin"
            });

            // Also add to activity log for visibility
            const activityRef = collection(db, "leagues", leagueId, "activityLog");
            await addDoc(activityRef, {
                timestamp: serverTimestamp(),
                type: "ANNOUNCEMENT",
                actorId: user.uid,
                actorName: user.displayName || "Admin",
                actorPhoto: user.photoURL || "",
                message: title.trim() || "📢 Announcement",
                details: message.trim()
            });

            setSent(true);
            setTimeout(() => {
                setTitle("");
                setMessage("");
                setSent(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Error sending announcement:", error);
            alert("Failed to send announcement. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 px-6 py-4 border-b-4 border-black">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <Megaphone className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black uppercase tracking-wide">
                                    Send Announcement
                                </h2>
                                <p className="text-xs font-bold text-black/70">
                                    Notify all players in {leagueName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5 text-black" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {sent ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-black">
                                <Megaphone className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-black text-green-600 uppercase">
                                Sent!
                            </h3>
                            <p className="text-sm text-gray-500 font-bold mt-1">
                                Your announcement has been posted
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Title (Optional) */}
                            <div>
                                <label className="block text-sm font-black text-black uppercase mb-2">
                                    Title (optional)
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="📢 Announcement"
                                    className="w-full h-12 px-4 rounded-xl border-2 border-black font-bold text-black focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-black text-black uppercase mb-2">
                                    Message *
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write your message to all league members..."
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-black font-medium text-black focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] resize-none"
                                />
                                <p className="text-xs text-gray-500 font-bold mt-1">
                                    This will be visible in the Activity tab and all members will be notified.
                                </p>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={!message.trim() || sending}
                                className={`w-full h-14 rounded-xl border-2 border-black font-black uppercase tracking-wide text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 ${message.trim() && !sending
                                        ? "bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-black hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        Send Announcement
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
