"use client";

import { useAuth } from "@/components/auth-provider";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const { signInWithGoogle, loading, user } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Redirect if already logged in handled by AuthProvider or middleware theoretically,
    // but for now we just show a message or redirect client-side in useEffect if we wanted strict strictness.
    // The signInWithGoogle will redirect to dashboard on success.

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-lg ring-1 ring-border">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to access your leagues.</p>
                </div>

                <button
                    onClick={signInWithGoogle}
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
