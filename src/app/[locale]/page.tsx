"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Home() {
  const t = useTranslations('Landing');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="z-10 container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-xl comic-border bg-white/50">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
              {t('badge')}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-6xl font-bold tracking-tighter sm:text-7xl md:text-8xl lg:text-9xl text-primary font-comic drop-shadow-md comic-title"
          >
            {t('title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto max-w-[700px] text-muted-foreground md:text-xl font-medium"
          >
            {t('subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-x-4 pt-4 flex items-center justify-center"
          >
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-lg shadow-lg hover:scale-105 transition-transform">
                {t('getStarted')} <ArrowRight className="ml-2 h-5 w-5 comic-icon" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg bg-background/50 backdrop-blur-sm border-2">
                {t('signIn')}
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3 lg:gap-12"
        >
          <FeatureCard
            icon={<Trophy className="h-10 w-10 text-accent comic-icon" />}
            title={t('features.league.title')}
            description={t('features.league.desc')}
          />
          <FeatureCard
            icon={<Users className="h-10 w-10 text-primary comic-icon" />}
            title={t('features.social.title')}
            description={t('features.social.desc')}
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-secondary comic-icon" />}
            title={t('features.ai.title')}
            description={t('features.ai.desc')}
          />
        </motion.div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border-2 border-black bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-bold font-comic tracking-wide text-foreground">{title}</h3>
      <p className="text-muted-foreground font-medium">{description}</p>
    </div>
  );
}
