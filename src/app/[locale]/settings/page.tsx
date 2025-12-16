"use client";

import { useAuth } from "@/components/auth-provider";
import { AvatarSelector } from "@/components/avatar-selector";
import { UserProfile, updateUserProfile } from "@/lib/services/user-service";
import { LogOut, Save, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useTranslations, useLocale } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
    const t = useTranslations('Settings');
    const currentLocale = useLocale();
    const router = useRouter();
    const { user, loading, logout } = useAuth();

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
                alert(t('saving') + " Done!");
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
        <div className="min-h-screen text-foreground pb-20 pt-8">
            <main className="container mx-auto px-4 max-w-2xl">
                <h1 className="text-3xl font-black font-comic text-primary uppercase stroke-black drop-shadow-[2px_2px_0_rgba(0,0,0,1)] mb-8 text-center">{t('title')}</h1>
                <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div>
                            <h2 className="text-lg font-black font-comic uppercase mb-4">{t('profilePicture')}</h2>
                            <AvatarSelector
                                uid={user!.uid}
                                currentAvatar={avatarUrl}
                                onAvatarChange={setAvatarUrl}
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="nickname" className="block text-sm font-bold uppercase mb-1.5">
                                    {t('displayName')}
                                </label>
                                <Input
                                    id="nickname"
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder={t('enterNickname')}
                                    className="border-2 border-black font-bold"
                                />
                                <p className="text-xs text-muted-foreground mt-1 font-bold">{t('displayNameDesc')}</p>
                            </div>

                            <div>
                                <label htmlFor="language" className="block text-sm font-bold uppercase mb-1.5">
                                    {t('language')}
                                </label>
                                <select
                                    id="language"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border-2 border-black bg-background px-3 py-2 text-sm font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="en">English</option>
                                    <option value="de">Deutsch</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t-2 border-dashed border-gray-300 space-y-4">
                            <Button
                                type="submit"
                                disabled={saving}
                                className="w-full h-12 text-lg font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all bg-primary hover:bg-primary/90"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin comic-icon" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5 comic-icon" />
                                        {t('saveChanges')}
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="danger"
                                onClick={logout}
                                className="w-full h-12 text-lg font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all bg-red-500 hover:bg-red-600"
                            >
                                <LogOut className="mr-2 h-5 w-5 comic-icon" />
                                {t('signOut') || "Sign Out"}
                            </Button>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
}
