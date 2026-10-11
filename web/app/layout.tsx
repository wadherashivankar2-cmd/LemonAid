import type { Metadata } from "next";
import "./globals.css";
import { fontSans, fontSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Chrome } from "@/components/Chrome";

export const metadata: Metadata = {
  title: "Gratitude Journal",
  description: "Reflect on what brought you genuine peace or pride today.",
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
