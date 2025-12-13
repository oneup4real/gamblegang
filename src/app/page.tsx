"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";

export default function Home() {
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
            <div className="inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
              v1.0 Alpha Access
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50"
          >
            GambleGang
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto max-w-[700px] text-muted-foreground md:text-xl"
          >
            Social betting for your inner circle. Create leagues, bet on anything, and climb the leaderboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-x-4 pt-4"
          >
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background/50 px-8 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign In
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
            icon={<Trophy className="h-10 w-10 text-yellow-500" />}
            title="League Based"
            description="Create private leagues with your friends. Separate ranks, separate drama."
          />
          <FeatureCard
            icon={<Users className="h-10 w-10 text-blue-500" />}
            title="Social Betting"
            description="Bet on sports, reality TV, or whose turn it is to buy lunch."
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-primary" />}
            title="AI Powered"
            description="Let our AI generate balanced odds and resolve ambiguous bets instantly."
          />
        </motion.div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card/50 p-6 backdrop-blur-sm transition-all hover:bg-card/80 hover:shadow-lg hover:-translate-y-1">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
