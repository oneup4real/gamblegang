"use client";

import { useAuth } from "@/components/auth-provider";
import { useDataMode } from "@/hooks/use-data-mode";
import { setDataMode } from "@/lib/services/data-mode-service";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AITogglePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { mode, loading: modeLoading } = useDataMode();
    const [switching, setSwitching] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const handleModeSwitch = async (newMode: "AI" | "API") => {
        if (!user || newMode === mode) return;

        setSwitching(true);
        setMessage(null);

        try {
            const success = await setDataMode(newMode, user.uid);
            if (success) {
                setMessage({
                    type: "success",
                    text: `✅ Switched to ${newMode === "AI" ? "AI (Gemini)" : "API (TheSportsDB)"} mode!`
                });
            } else {
                setMessage({
                    type: "error",
                    text: "Failed to switch mode. Please try again."
                });
            }
        } catch (error) {
            console.error("Error switching mode:", error);
            setMessage({
                type: "error",
                text: "An error occurred. Please try again."
            });
        } finally {
            setSwitching(false);
        }
    };

    if (authLoading || modeLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-foreground pb-20 pt-8">
            <main className="container mx-auto px-4 max-w-2xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard")}
                        className="border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-2"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-black font-comic text-primary uppercase stroke-black drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                        Data Source
                    </h1>
                </div>

                {/* Description Card */}
                <Card className="p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6">
                    <h2 className="text-lg font-black font-comic uppercase mb-2">🔧 Global Setting</h2>
                    <p className="text-muted-foreground font-bold">
                        Choose the data source for generating bets and auto-resolving results.
                        This setting affects <strong>all leagues</strong> instantly.
                    </p>
                </Card>

                {/* Current Mode Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-primary/10 rounded-xl border-2 border-primary">
                    <span className="font-bold">Current Mode:</span>
                    <span className="font-black text-primary uppercase flex items-center gap-2">
                        {mode === "AI" ? (
                            <>
                                <Sparkles className="h-5 w-5" />
                                AI (Gemini)
                            </>
                        ) : (
                            <>
                                <Database className="h-5 w-5" />
                                API (TheSportsDB)
                            </>
                        )}
                    </span>
                </div>

                {/* Mode Selection Cards */}
                <div className="grid gap-4">
                    {/* AI Mode Card */}
                    <Card
                        className={`p-6 border-4 cursor-pointer transition-all ${mode === "AI"
                            ? "border-primary shadow-[8px_8px_0px_0px_rgba(var(--primary-rgb),0.5)] bg-primary/5"
                            : "border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
                            }`}
                        onClick={() => handleModeSwitch("AI")}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                                        <Sparkles className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-black font-comic uppercase">AI Mode (Gemini)</h3>
                                </div>
                                <p className="text-muted-foreground font-bold mb-3">
                                    Uses Google's Gemini AI with web search grounding to find and verify match results.
                                </p>
                                <div className="space-y-1 text-sm">
                                    <p className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Works with any sport/event</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Generates creative bet ideas</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                        <span>May have knowledge cutoff limitations</span>
                                    </p>
                                </div>
                            </div>
                            {mode === "AI" && (
                                <div className="ml-4">
                                    <CheckCircle2 className="h-8 w-8 text-primary" />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* API Mode Card */}
                    <Card
                        className={`p-6 border-4 cursor-pointer transition-all ${mode === "API"
                            ? "border-primary shadow-[8px_8px_0px_0px_rgba(var(--primary-rgb),0.5)] bg-primary/5"
                            : "border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
                            }`}
                        onClick={() => handleModeSwitch("API")}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                                        <Database className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-black font-comic uppercase">API Mode (TheSportsDB)</h3>
                                </div>
                                <p className="text-muted-foreground font-bold mb-3">
                                    Uses TheSportsDB API to fetch real sports schedules and results directly.
                                </p>
                                <div className="space-y-1 text-sm">
                                    <p className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Real-time sports data</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Accurate match schedules</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                        <span>Limited to sports covered by API</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                        <span>Premium key required for full coverage</span>
                                    </p>
                                </div>
                            </div>
                            {mode === "API" && (
                                <div className="ml-4">
                                    <CheckCircle2 className="h-8 w-8 text-primary" />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Loading/Message State */}
                {switching && (
                    <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-muted rounded-xl">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="font-bold">Switching mode...</span>
                    </div>
                )}

                {message && (
                    <div
                        className={`mt-6 p-4 rounded-xl border-2 font-bold ${message.type === "success"
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "bg-red-50 border-red-300 text-red-700"
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* Info Box */}
                <Card className="mt-6 p-4 border-2 border-dashed border-gray-300 bg-muted/50">
                    <h4 className="font-black uppercase text-sm mb-2">ℹ️ How it works</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 font-medium">
                        <li>• Changes apply instantly to all users</li>
                        <li>• Affects bulk bet generation (AI Wizard)</li>
                        <li>• Affects auto-resolution of finished matches</li>
                        <li>• Cloud functions also respect this setting</li>
                    </ul>
                </Card>
            </main>
        </div>
    );
}
