"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FakeButton } from "@/components/FakeButton";

const LINES = [
  "We looked everywhere. Even the Jira backlog.",
  "This page was deprioritized in Q3.",
  "This page has left to pursue other opportunities.",
  "You have reached a page that is not on the roadmap.",
  "The page ghosted you. Do not take it personally. Take it a little personally.",
];

export default function NotFound() {
  const [line, setLine] = React.useState<string>(LINES[0]);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", "burn");
    // Pick random line on client mount to prevent hydration mismatch
    const randomIndex = Math.floor(Math.random() * LINES.length);
    setLine(LINES[randomIndex]);

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center select-none bg-black text-white">
      <div className="max-w-[480px] space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-serif text-6xl tracking-tight">404</h1>
          <h2 className="text-xl font-medium text-neutral-300">Gratitude not found.</h2>
        </div>

        <p className="text-sm text-neutral-400 leading-relaxed min-h-[48px]">
          {line}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button variant="default" className="bg-white text-black hover:bg-neutral-200">
              Return to Journal
            </Button>
          </Link>

          <FakeButton
            quipKey="report"
            variant="outline"
            className="border-neutral-800 text-neutral-300 hover:bg-neutral-900"
          >
            Report this page
          </FakeButton>

          <FakeButton
            quipKey="support"
            variant="outline"
            className="border-neutral-800 text-neutral-300 hover:bg-neutral-900"
          >
            Contact support
          </FakeButton>
        </div>
      </div>
    </div>
  );
}
