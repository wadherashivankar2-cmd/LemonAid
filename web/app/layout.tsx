import "./globals.css";
import type { Metadata } from "next";
import { fontSans, fontSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Chrome } from "@/components/Chrome";
import { EvasiveGithub } from "@/components/EvasiveGithub";
import { GridPulse } from "@/components/ui/grid-pulse";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lemon-aid-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LemonAid — Reflect on Your Day",
  description: "A calm, mindful space for genuine daily self-reflection and personal growth.",
  openGraph: {
    title: "LemonAid — Reflect on Your Day",
    description: "A calm, mindful space for genuine daily self-reflection and personal growth.",
    url: siteUrl,
    siteName: "LemonAid",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "LemonAid — Reflect on Your Day",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LemonAid — Reflect on Your Day",
    description: "A calm, mindful space for genuine daily self-reflection.",
    images: ["/api/og"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark min-h-screen antialiased", fontSans.variable, fontSerif.variable)}
    >
      <body className="min-h-screen bg-[#F4F4F0] text-neutral-900 dark:bg-[#0A0A0A] dark:text-neutral-100 font-sans selection:bg-neutral-800 transition-colors duration-300 relative isolate">
        <GridPulse className="fixed inset-0 -z-10 pointer-events-none [mask-image:none] [--grid-pulse-line:rgb(255_255_255/0.12)]" />
        <Chrome />
        {children}
        <EvasiveGithub />
      </body>
    </html>
  );
}
