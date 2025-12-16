"use client";

import { useState, useRef } from "react";
import { X, Check, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCropperProps {
    src: string;
    onCancel: () => void;
    onCrop: (blob: Blob) => void;
}

export function ImageCropper({ src, onCancel, onCrop }: ImageCropperProps) {
    const [zoom, setZoom] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [baseScale, setBaseScale] = useState(1);
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setStartPos({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        setPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    };

    const handleMouseUp = () => setDragging(false);

    // Touch support
    const handleTouchStart = (e: React.TouchEvent) => {
        setDragging(true);
        setStartPos({ x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y });
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!dragging) return;
        setPos({ x: e.touches[0].clientX - startPos.x, y: e.touches[0].clientY - startPos.y });
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Visual container is 256x256
        const currentWidth = imgDims.w * zoom;
        const currentHeight = imgDims.h * zoom;

        ctx.clearRect(0, 0, 256, 256);
        // Fill white to handle transparent PNGs nicely in JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 256, 256);

        // Draw what is visible
        ctx.drawImage(img, pos.x, pos.y, currentWidth, currentHeight);

        canvas.toBlob((blob) => {
            if (blob) onCrop(blob);
        }, "image/jpeg", 0.85); // 85% quality JPEG
    };

    const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        // Calculate scale to cover 256x256
        const scale = Math.max(256 / naturalWidth, 256 / naturalHeight);
        setBaseScale(scale);

        const w = naturalWidth * scale;
        const h = naturalHeight * scale;
        setImgDims({ w, h });

        // Center initial position
        setPos({ x: (256 - w) / 2, y: (256 - h) / 2 });
    };

    // Calculate current display size
    const displayW = imgDims.w * zoom;
    const displayH = imgDims.h * zoom;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-6">
                <div className="flex justify-between w-full items-center">
                    <h3 className="text-xl font-black uppercase tracking-tight">Post Your Mug</h3>
                    <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div
                    className="relative w-[256px] h-[256px] bg-gray-100 rounded-full border-4 border-black overflow-hidden cursor-move touch-none shadow-inner"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imgRef}
                        src={src}
                        onLoad={onImgLoad}
                        style={{
                            width: displayW,
                            height: displayH,
                            left: pos.x,
                            top: pos.y,
                            position: "absolute",
                            maxWidth: "none",
                        }}
                        draggable={false}
                        className="select-none"
                    />
                </div>

                <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase">
                        <div className="flex items-center gap-1"><ZoomOut className="h-3 w-3" /> Zoom</div>
                        <div className="flex items-center gap-1"><ZoomIn className="h-3 w-3" /></div>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="h-12 border-2 border-black font-black uppercase text-gray-500 hover:text-black"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="h-12 border-2 border-black bg-green-400 text-black hover:bg-green-500 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                    >
                        <Check className="mr-2 h-4 w-4" /> Save
                    </Button>
                </div>

                <canvas ref={canvasRef} width={256} height={256} className="hidden" />
            </div>
        </div>
    );
}
