"use client";

import { useAuth } from "@/components/auth-provider";
import { AvatarSelector } from "@/components/avatar-selector";
import { UserProfile, updateUserProfile } from "@/lib/services/user-service";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
// import { useRouter } from "next/navigation"; // REMOVED
import { useRouter } from "@/i18n/navigation"; // ADDED
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useTranslations, useLocale } from 'next-intl'; // UPDATED
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
    const t = useTranslations('Settings');
    const currentLocale = useLocale();
    const router = useRouter();
    const { user, loading } = useAuth();
    // const router = useRouter(); // Removed standard router

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [fetchingProfile, setFetchingProfile] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [nickname, setNickname] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [language, setLanguage] = useState("en");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
            return;
        }

        async function fetchProfile() {
            if (!user) return;
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    setProfile(data);
                    setNickname(data.displayName || user.displayName || "");
                    setAvatarUrl(data.photoURL || user.photoURL);
                    setLanguage(data.language || "en");
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setFetchingProfile(false);
            }
        }

        if (user) {
            fetchProfile();
        }
    }, [user, loading, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            await updateUserProfile(user.uid, {
                displayName: nickname,
                photoURL: avatarUrl,
                language: language
            });

            // If language changed, redirect to new locale
            if (language !== currentLocale) {
                router.replace('/settings', { locale: language });
            } else {
                alert(t('saving') + " Done!"); // Simple feedback if no redirect
            }

        } catch (error) {
            console.error("Failed to save settings", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || fetchingProfile) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-foreground pb-20">
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        {t('backToDashboard')}
                    </Link>
                    <h1 className="text-xl font-bold text-primary ml-auto mr-auto sm:ml-0">{t('title')}</h1>
                </div>
            </header>

            <main className="container mx-auto py-6 max-w-2xl">
                <Card className="p-8">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div>
                            <h2 className="text-lg font-semibold mb-4">{t('profilePicture')}</h2>
                            <AvatarSelector
                                uid={user!.uid}
                                currentAvatar={avatarUrl}
                                onAvatarChange={setAvatarUrl}
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="nickname" className="block text-sm font-medium mb-1.5">
                                    {t('displayName')}
                                </label>
                                <Input
                                    id="nickname"
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder={t('enterNickname')}
                                />
                                <p className="text-xs text-muted-foreground mt-1">{t('displayNameDesc')}</p>
                            </div>

                            <div>
                                <label htmlFor="language" className="block text-sm font-medium mb-1.5">
                                    {t('language')}
                                </label>
                                <select
                                    id="language"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border-2 border-black bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="en">English</option>
                                    <option value="de">Deutsch</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <Button
                                type="submit"
                                disabled={saving}
                                className="w-full"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin comic-icon" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4 comic-icon" />
                                        {t('saveChanges')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
}
