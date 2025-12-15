"use client";

import { useState, useRef } from "react";
import { Upload, X, Check } from "lucide-react";
import { uploadUserAvatar } from "@/lib/services/user-service";

interface AvatarSelectorProps {
    uid: string;
    currentAvatar: string | null;
    onAvatarChange: (url: string) => void;
}

const PREDEFINED_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Caitlyn",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Robot2"
];

export function AvatarSelector({ uid, currentAvatar, onAvatarChange }: AvatarSelectorProps) {
    const [uploading, setUploading] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePredefinedSelect = (url: string) => {
        setSelectedAvatar(url);
        onAvatarChange(url);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadUserAvatar(file, uid);
            setSelectedAvatar(url);
            onAvatarChange(url);
        } catch (error) {
            console.error("Upload failed", error);
            // Could add toast here
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={selectedAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
                        alt="Current Avatar"
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-primary"
                    />
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground">Max file size 2MB.</p>
                </div>
            </div>

            <div>
                <span className="text-sm font-medium text-muted-foreground mb-2 block">Or choose from library:</span>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {PREDEFINED_AVATARS.map((url, i) => (
                        <button
                            key={i}
                            onClick={() => handlePredefinedSelect(url)}
                            className={`relative overflow-hidden rounded-full transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none ${selectedAvatar === url ? "ring-2 ring-primary" : "ring-1 ring-border"
                                }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Avatar ${i}`} className="h-full w-full object-cover" />
                            {selectedAvatar === url && (
                                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                    <Check className="h-4 w-4 text-primary" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
