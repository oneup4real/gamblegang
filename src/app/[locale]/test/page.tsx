"use client";

import { HelpCircle } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

// Mock Header Component
function MockHeader({ title, bgClass, customStyle }: { title: string, bgClass?: string, customStyle?: React.CSSProperties }) {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold mb-2">{title}</h2>
            <header className={`border-b-2 border-black py-4 sticky top-0 z-50 ${bgClass}`} style={customStyle}>
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-3 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/GG_Logo.png?v=2" alt="Logo" className="h-12 w-12 object-contain" />
                        <h1 className="text-3xl font-black font-comic text-primary uppercase tracking-wider drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                            GambleGang
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-black bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <HelpCircle className="w-6 h-6 text-black" />
                        </button>

                        <div className="relative">
                            <div className="relative cursor-pointer hover:scale-110 transition-transform">
                                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <svg className="w-6 h-6 text-black" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-black">
                                    3
                                </span>
                            </div>
                        </div>

                        <div className="h-10 w-10 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="font-bold text-xl">U</span>
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}

export default function HeaderDesignTestPage() {
    return (
        <div className="min-h-screen bg-gray-100 p-8 space-y-12">
            <h1 className="text-4xl font-black font-comic text-center mb-12">Header Design Proposals</h1>

            {/* Design 1: Classic Comic Dots (Blue) */}
            <MockHeader
                title="1. Classic Comic Dots (Blue)"
                customStyle={{
                    backgroundColor: '#e0f2fe',
                    backgroundImage: 'radial-gradient(#0ea5e9 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Design 2: Subtle Grid */}
            <MockHeader
                title="2. Blueprint Grid"
                customStyle={{
                    backgroundColor: '#ffffff',
                    backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Design 3: Diagonal Stripes (Action) */}
            <MockHeader
                title="3. Action Stripes"
                customStyle={{
                    backgroundColor: '#fff',
                    backgroundImage: 'repeating-linear-gradient(45deg, #f0f9ff, #f0f9ff 10px, #e0f2fe 10px, #e0f2fe 20px)'
                }}
            />

            {/* Design 4: Retro Memphis (Zig Zag) */}
            <MockHeader
                title="4. Retro ZigZag"
                customStyle={{
                    backgroundColor: '#fff1f2',
                    backgroundImage: 'linear-gradient(135deg, #fecdd3 25%, transparent 25%), linear-gradient(225deg, #fecdd3 25%, transparent 25%), linear-gradient(45deg, #fecdd3 25%, transparent 25%), linear-gradient(315deg, #fecdd3 25%, transparent 25%)',
                    backgroundPosition: '10px 0, 10px 0, 0 0, 0 0',
                    backgroundSize: '20px 20px',
                    backgroundRepeat: 'repeat'
                }}
            />

            {/* Design 5: Halftone Pop (Large) */}
            <MockHeader
                title="5. Halftone Pop"
                customStyle={{
                    backgroundColor: '#fff',
                    backgroundImage: 'radial-gradient(circle, #ddd 2px, transparent 2.5px)',
                    backgroundSize: '16px 16px'
                }}
            />

            {/* Design 6: Yellow Warning */}
            <MockHeader
                title="6. High Voltage"
                bgClass="bg-yellow-300"
                customStyle={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)'
                }}
            />

            {/* Design 7: Clean White (just border) */}
            <MockHeader
                title="7. Ultra Clean (Current style of League Header)"
                bgClass="bg-white"
            />

            {/* Design 8: Speckled Noise */}
            <MockHeader
                title="8. Street Noise"
                customStyle={{
                    backgroundColor: '#f3f4f6',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.1\'/%3E%3C/svg%3E")'
                }}
            />

            {/* Design 9: Pastel Playground */}
            <MockHeader
                title="9. Pastel Playground"
                customStyle={{
                    background: 'conic-gradient(from 90deg at 50% 50%, #eff6ff 0deg, #f5f3ff 90deg, #fff7ed 180deg, #eff6ff 360deg)'
                }}
            />

            {/* Design 10: Comic Speed Lines */}
            <MockHeader
                title="10. Speed Lines"
                customStyle={{
                    backgroundColor: '#ffffff',
                    backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.03) 50%)',
                    backgroundSize: '4px 100%'
                }}
            />

            <div className="h-24"></div>
        </div>
    );
}
