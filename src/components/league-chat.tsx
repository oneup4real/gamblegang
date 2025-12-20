"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, Timestamp } from "firebase/firestore";
import { User, Send, Smile, Image as ImageIcon } from "lucide-react";
import { LeagueMember } from "@/lib/services/league-service";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface LeagueChatProps {
    leagueId: string;
    currentUser: { uid: string; displayName?: string | null; photoURL?: string | null };
    members: LeagueMember[];
}

interface ChatMessage {
    id: string;
    text: string;
    uid: string;
    createdAt: Timestamp | null;
    userName?: string;
    userAvatar?: string;
}

export function LeagueChat({ leagueId, currentUser, members }: LeagueChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Create a map of members for quick lookup
    const memberMap = useRef<Record<string, LeagueMember>>({});
    useEffect(() => {
        memberMap.current = members.reduce((acc, m) => ({ ...acc, [m.uid]: m }), {});
    }, [members]);

    useEffect(() => {
        if (!leagueId) return;

        const q = query(
            collection(db, "leagues", leagueId, "chat"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage)).reverse(); // Show oldest first (top) to newest (bottom)

            setMessages(msgs);
            // Scroll to bottom on new messages
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [leagueId]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || sending) return;

        const text = inputText.trim();
        setInputText("");
        setSending(true);
        setShowEmojiPicker(false); // Close picker on send

        try {
            await addDoc(collection(db, "leagues", leagueId, "chat"), {
                text,
                uid: currentUser.uid,
                createdAt: serverTimestamp(),
                // Denormalize generic info just in case, but rely on memberMap mainly
                userName: currentUser.displayName || "Unknown",
                userAvatar: currentUser.photoURL || null
            });
        } catch (error) {
            console.error("Error sending message:", error);
            setInputText(text); // Restore text on error
        } finally {
            setSending(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setInputText((prev) => prev + emojiData.emoji);
        // Keep picker open for chaining entries? Or close? User preference usually "keep open"
        // But for mobile it might block view.
        // Let's hidden it? No, keep it open but let user close with toggle button.
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
            {/* Header */}
            <div className="bg-yellow-400 p-4 border-b-4 border-black flex items-center justify-between z-10">
                <div>
                    <h3 className="font-black text-2xl uppercase font-comic tracking-wide text-black drop-shadow-sm flex items-center gap-2">
                        💬 Trash Talk
                    </h3>
                    <p className="text-xs font-bold text-black/70">
                        {members.length} members in the room
                    </p>
                </div>
                <div className="flex -space-x-2">
                    {members.slice(0, 5).map(m => (
                        <div key={m.uid} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-white" title={m.displayName}>
                            {m.photoURL ? (
                                <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <User className="w-4 h-4 text-gray-500" />
                                </div>
                            )}
                        </div>
                    ))}
                    {members.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-black bg-black text-white flex items-center justify-center text-[10px] font-bold">
                            +{members.length - 5}
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                onClick={() => setShowEmojiPicker(false)} // Close picker when clicking messages area
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                        <div className="text-6xl">🙊</div>
                        <p className="font-bold text-lg uppercase">Quiet in here...</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.uid === currentUser.uid;
                    const member = memberMap.current[msg.uid];
                    const prevMsg = messages[index - 1];
                    const isSequence = prevMsg && prevMsg.uid === msg.uid && msg.createdAt && prevMsg.createdAt && (msg.createdAt.seconds - prevMsg.createdAt.seconds < 60);

                    const avatarUrl = member?.photoURL || msg.userAvatar;
                    const name = member?.displayName || msg.userName || "Unknown";

                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            {!isMe && !isSequence ? (
                                <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-white shrink-0 mb-1" title={name}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                            <User className="w-4 h-4 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                            ) : (!isMe && <div className="w-8 shrink-0" />)}

                            {/* Bubble */}
                            <div className={`max-w-[70%] group relative ${isSequence ? 'mt-1' : 'mt-4'}`}>
                                {!isMe && !isSequence && (
                                    <p className="text-[10px] font-black text-gray-500 ml-1 mb-1 uppercase tracking-wide">{name}</p>
                                )}

                                <div className={`px-4 py-2 text-sm font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${isMe
                                    ? "bg-blue-500 text-white rounded-2xl rounded-tr-sm"
                                    : "bg-white text-black rounded-2xl rounded-tl-sm"
                                    }`}>
                                    {msg.text}
                                </div>

                                {/* Timestamp tooltip */}
                                {msg.createdAt && (
                                    <div className={`text-[9px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute w-max ${isMe ? 'right-0' : 'left-0'}`}>
                                        {formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t-4 border-black flex items-end gap-2 relative z-20">
                {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 border-4 border-black rounded-xl shadow-xl z-50 overflow-hidden">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width={320}
                            height={400}
                            theme={Theme.LIGHT}
                            lazyLoadEmojis={true}
                        />
                    </div>
                )}

                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Say something toxic..."
                        className="w-full bg-gray-100 border-2 border-black rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all placeholder:text-gray-400"
                        maxLength={500}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 flex gap-1">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-1 hover:bg-gray-200 rounded-md transition-colors ${showEmojiPicker ? 'bg-gray-200 text-yellow-500' : ''}`}
                        >
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="h-[50px] w-[50px] bg-black text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                >
                    {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </form>
        </div>
    );
}
