import type { Metadata } from "next";
import "./globals.css";
import { fontSans, fontSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Chrome } from "@/components/Chrome";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mr-roast.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LoveBite — Reflect on Your Day",
  description: "A calm, mindful space for genuine daily self-reflection and personal growth.",
  openGraph: {
    title: "LoveBite — Reflect on Your Day",
    description: "A calm, mindful space for genuine daily self-reflection and personal growth.",
    url: siteUrl,
    siteName: "LoveBite",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "LoveBite — Reflect on Your Day",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LoveBite — Reflect on Your Day",
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
      className={cn("min-h-screen bg-background antialiased", fontSans.variable, fontSerif.variable)}
    >
      <body className="min-h-screen font-sans selection:bg-neutral-200">
        <Chrome />
        {children}
      </body>
    </html>
  );
}
