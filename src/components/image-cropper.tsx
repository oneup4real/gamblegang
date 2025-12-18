"use client";

import React, { useRef } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

interface ImageCropperProps {
    src: string;
    onCancel: () => void;
    onCrop: (blob: Blob) => void;
}

export function ImageCropper({ src, onCancel, onCrop }: ImageCropperProps) {
    const cropperRef = useRef<ReactCropperElement>(null);

    const handleSave = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            // Get cropped area
            cropper.getCroppedCanvas({
                width: 512, // Standardize size
                height: 512,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            }).toBlob((blob) => {
                if (blob) onCrop(blob);
            }, 'image/jpeg', 0.9);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tight">Post Your Mug</h3>
                    <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl border-2 border-black bg-gray-100">
                    <Cropper
                        src={src}
                        style={{ height: 400, width: "100%" }}
                        initialAspectRatio={1}
                        aspectRatio={1}
                        guides={true}
                        ref={cropperRef}
                        viewMode={1}
                        dragMode="move"
                        background={true}
                        responsive={true}
                        autoCropArea={1}
                        checkOrientation={false}
                        minCropBoxHeight={10}
                        minCropBoxWidth={10}
                        rotatable={true}
                        scalable={true}
                        zoomable={true}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button type="button" onClick={onCancel} variant="outline" className="h-12 border-2 border-black font-black uppercase text-gray-500 hover:text-black">
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave} className="h-12 border-2 border-black bg-green-400 text-black hover:bg-green-500 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
                        <Check className="mr-2 h-4 w-4" /> Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
