'use client';

import { useAuth } from "@/components/auth-provider";
import { AvatarSelector } from "@/components/avatar-selector";
import { UserProfile, updateUserProfile } from "@/lib/services/user-service";
import { LogOut, Save, Loader2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useTranslations, useLocale } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
    const t = useTranslations('Settings');
    const currentLocale = useLocale();
    const router = useRouter();
    const { user, logout } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [fetchingProfile, setFetchingProfile] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [nickname, setNickname] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [language, setLanguage] = useState("en");

    useEffect(() => {
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

        if (user && isOpen) {
            setFetchingProfile(true);
            fetchProfile();
        }
    }, [user, isOpen]);

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
                router.replace('/dashboard', { locale: language });
                onClose();
            } else {
                alert(t('saving') + " Done!");
                onClose();
                // Reload to show updated avatar
                window.location.reload();
            }

        } catch (error) {
            console.error("Failed to save settings", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push('/login');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 h-8 w-8 rounded-full border-2 border-black bg-white hover:bg-gray-100 flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-8">
                    <h1 className="text-3xl font-black font-comic text-primary uppercase stroke-black drop-shadow-[2px_2px_0_rgba(0,0,0,1)] mb-8 text-center">
                        {t('title')}
                    </h1>

                    {fetchingProfile ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Avatar Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-700">{t('avatar')}</label>
                                <AvatarSelector
                                    uid={user!.uid}
                                    currentAvatar={avatarUrl}
                                    onAvatarChange={setAvatarUrl}
                                />
                            </div>

                            {/* Nickname */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-700">{t('nickname')}</label>
                                <Input
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder={t('enterNickname')}
                                    required
                                />
                            </div>

                            {/* Language */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-700">{t('language')}</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
                                >
                                    <option value="en">🇬🇧 English</option>
                                    <option value="de">🇩🇪 Deutsch</option>
                                </select>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={handleLogout}
                                    className="flex items-center gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('logout')}
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('saving')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            {t('save')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
