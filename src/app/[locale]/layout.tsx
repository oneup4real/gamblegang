import type { Metadata, Viewport } from "next";
import { Bangers, Fredoka } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

const fontComic = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-comic",
});

const fontFredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "GambleGang",
  description: "Social Betting App",
  manifest: "/manifest.json",
  icons: {
    icon: '/GG_Logo.png',
    shortcut: '/GG_Logo.png',
    apple: '/GG_Logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GambleGang",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#8B5CF6", // Purple to match branding
};

import { AuthProvider } from "@/components/auth-provider";
import { NavBar } from "@/components/navbar";
import { PWAInstallProvider } from "@/hooks/use-pwa-install";
import { PwaPopup } from "@/components/pwa-popup";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'de' }];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!['en', 'de'].includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontFredoka.variable,
          fontComic.variable
        )}
      >
        <NextIntlClientProvider messages={messages}>
          <PWAInstallProvider>
            <AuthProvider>
              <NavBar />
              {children}
            </AuthProvider>
            <PwaPopup />
          </PWAInstallProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
