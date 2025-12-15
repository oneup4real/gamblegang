"use client";

import { useAuth } from "@/components/auth-provider";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from 'next-intl';

export default function LoginPage() {
    const t = useTranslations('Login');
    const { signInWithGoogle, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary comic-icon" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <Card className="max-w-md w-full p-8 shadow-xl bg-card border-2 border-black">
                <div className="space-y-2 mb-8">
                    <h1 className="text-4xl font-bold tracking-tighter font-comic text-primary drop-shadow-sm">{t('title')}</h1>
                    <p className="text-muted-foreground font-medium">{t('description')}</p>
                </div>

                <Button
                    onClick={signInWithGoogle}
                    className="w-full h-12 text-base shadow-lg"
                    variant="primary"
                >
                    {t('signInGoogle')}
                </Button>
            </Card>
        </div>
    );
}
