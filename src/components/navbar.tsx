'use client';

import { useAuth } from "@/components/auth-provider";
import { Link } from '@/i18n/navigation';
import { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { ManualModal } from "@/components/user-manual/manual-modal";
import { UserSettingsModal } from "@/components/user-settings-modal";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function NavBar() {
    const { user } = useAuth();
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);

    // Fetch user's photoURL from Firestore
    useEffect(() => {
        async function fetchUserPhoto() {
            if (!user) return;

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserPhotoURL(userData.photoURL || user.photoURL || null);
                } else {
                    setUserPhotoURL(user.photoURL || null);
                }
            } catch (error) {
                console.error("Error fetching user photo:", error);
                setUserPhotoURL(user.photoURL || null);
            }
        }

        fetchUserPhoto();
    }, [user]);

    if (!user) return null;

    return (
        <>
            <header className="border-b-2 border-black bg-white py-4 sticky top-0 z-50">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/GG_Logo.png?v=2" alt="Logo" className="h-12 w-12 object-contain group-hover:scale-110 transition-transform" />
                        <h1 className="text-3xl font-black font-comic text-primary uppercase tracking-wider drop-shadow-[2px_2px_0_rgba(0,0,0,1)] group-hover:text-primary/80 transition-colors">
                            GambleGang
                        </h1>
                    </Link>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsManualOpen(true)}
                            className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-black bg-yellow-400 hover:scale-110 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            title="How to Play"
                        >
                            <HelpCircle className="w-6 h-6 text-black" />
                        </button>

                        <button onClick={() => setIsSettingsOpen(true)}>
                            {userPhotoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={userPhotoURL}
                                    alt="Profile"
                                    className="h-10 w-10 rounded-full border-2 border-black bg-gray-200 hover:scale-110 transition-transform cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-cover"
                                    title="My Profile"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" title="My Profile">
                                    <span className="font-bold text-xl">{user.displayName?.charAt(0) || 'U'}</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </header>
            <ManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
            <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
}
