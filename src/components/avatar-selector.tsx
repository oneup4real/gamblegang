"use client";

import { useState, useRef } from "react";
import { Upload, X, Check } from "lucide-react";
import { uploadUserAvatar } from "@/lib/services/user-service";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/image-cropper";

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
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePredefinedSelect = (url: string) => {
        setSelectedAvatar(url);
        onAvatarChange(url);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Read for cropping
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setCropSrc(reader.result);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ""; // Reset
    };

    const handleCropComplete = async (blob: Blob) => {
        setCropSrc(null);
        setUploading(true);
        try {
            // Create a File object from Blob
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            const url = await uploadUserAvatar(file, uid);
            setSelectedAvatar(url);
            onAvatarChange(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload avatar.");
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
                        className="h-24 w-24 rounded-full object-cover border-4 border-black"
                    />
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                            <div className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Custom
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                    <p className="text-xs font-bold text-gray-500">Max size 2MB.</p>
                </div>
            </div>

            <div>
                <span className="text-sm font-black text-black uppercase mb-2 block">Or choose standard:</span>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {PREDEFINED_AVATARS.map((url, i) => (
                        <button
                            key={i}
                            onClick={() => handlePredefinedSelect(url)}
                            className={`relative overflow-hidden rounded-full transition-all border-2 ${selectedAvatar === url
                                ? "border-primary ring-2 ring-primary ring-offset-1 p-0.5"
                                : "border-black hover:scale-110"
                                }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Avatar ${i}`} className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
            {cropSrc && (
                <ImageCropper
                    src={cropSrc}
                    onCancel={() => setCropSrc(null)}
                    onCrop={handleCropComplete}
                />
            )}
        </div>
    );
}
