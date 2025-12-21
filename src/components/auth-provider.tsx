"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();

    useEffect(() => {
        if (!auth || Object.keys(auth).length === 0) {
            console.error("Firebase Auth not initialized. Missing API Key?");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Ensure profile exists
                const { createUserProfile, updateUserProfile } = await import("@/lib/services/user-service");
                await createUserProfile(user);

                // Auto-promote Super Admin
                if (user.email === "c.venetz@gmail.com") {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists() && !docSnap.data().isSuperAdmin) {
                        console.log("👑 Promoting user to Super Admin...");
                        await updateUserProfile(user.uid, { isSuperAdmin: true });
                    }
                }

                // Sync Language Preference
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.language && data.language !== currentLocale && ['en', 'de'].includes(data.language)) {
                            // If user has a preferred language different from current, switch!
                            router.replace(pathname, { locale: data.language });
                        }
                    }
                } catch (e) {
                    console.error("Failed to sync language", e);
                }
            }
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentLocale, pathname, router]); // Added deps for locale sync

    const signInWithGoogle = async () => {
        if (!auth || Object.keys(auth).length === 0) {
            alert("Auth not configured. Check console.");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // Router automatically handles locale, but we might want to ensure we are on the USER'S locale?
            // The useEffect above will handle the language switch if needed right after auth state changes.
            // But here we can just push to dashboard.
            router.push("/dashboard");
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const logout = async () => {
        if (!auth || Object.keys(auth).length === 0) return;
        try {
            await signOut(auth);
            router.push("/");
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
