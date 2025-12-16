"use client";

import { useAuth } from "@/components/auth-provider";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from 'next-intl';
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { createUserProfile, updateUserProfile } from "@/lib/services/user-service";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const t = useTranslations('Login');
    const { signInWithGoogle, loading } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<"login" | "register">("login");
    const [actionLoading, setActionLoading] = useState(false);

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary comic-icon" />
            </div>
        );
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setActionLoading(true);

        if (!auth) {
            setError("Firebase Auth not initialized.");
            setActionLoading(false);
            return;
        }

        try {
            if (mode === "login") {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                // Set username
                if (username) {
                    await updateProfile(res.user, { displayName: username });
                    // Ensure profile exists and is updated, handling race conditions with auth listener
                    if (auth.currentUser) {
                        await createUserProfile(auth.currentUser);
                        await updateUserProfile(res.user.uid, { displayName: username });
                    }
                }
            }
            // AuthProvider listener will handle redirection or we do it explicitly
            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            // Map Firebase errors to user friendly messages
            if (err.code === 'auth/email-already-in-use') setError("Email already in use.");
            else if (err.code === 'auth/invalid-credential') setError("Invalid email or password.");
            else setError(err.message || "Authentication failed");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
            <Card className="max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-card border-2 border-black">
                <div className="space-y-2 mb-6">
                    <h1 className="text-4xl font-bold tracking-tighter font-comic text-primary drop-shadow-sm uppercase">
                        {mode === "login" ? t('title') : "Join the Gang"}
                    </h1>
                    <p className="text-muted-foreground font-medium">{mode === "login" ? t('description') : "Create an account to start betting."}</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl border-2 border-black/10">
                    <button
                        onClick={() => { setMode("login"); setError(""); }}
                        className={`flex-1 py-2 text-sm font-black uppercase rounded-lg transition-all ${mode === "login" ? "bg-white text-black shadow-sm border-2 border-black" : "text-gray-400 hover:text-black"}`}
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => { setMode("register"); setError(""); }}
                        className={`flex-1 py-2 text-sm font-black uppercase rounded-lg transition-all ${mode === "register" ? "bg-white text-black shadow-sm border-2 border-black" : "text-gray-400 hover:text-black"}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
                    {mode === "register" && (
                        <div className="space-y-1">
                            <Input
                                placeholder="Username"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="border-2 border-black h-12 font-bold"
                            />
                        </div>
                    )}
                    <div className="space-y-1">
                        <Input
                            placeholder="Email"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="border-2 border-black h-12 font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <Input
                            placeholder="Password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="border-2 border-black h-12 font-bold"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm font-black bg-red-50 p-2 rounded-lg border-2 border-red-200">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full h-12 text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase tracking-widest"
                        variant="primary"
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="animate-spin" /> : (mode === "login" ? "Sign In" : "Create Account")}
                    </Button>
                </form>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t-2 border-gray-200 border-dashed" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase font-black">
                        <span className="bg-white px-2 text-gray-400">Or continue with</span>
                    </div>
                </div>

                <Button
                    onClick={signInWithGoogle}
                    className="w-full h-12 text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white text-black border-2 border-black hover:bg-gray-50 flex items-center justify-center gap-2 font-bold"
                    type="button"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Google
                </Button>
            </Card>
        </div>
    );
}
