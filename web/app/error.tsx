"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { GridPulse } from "@/components/ui/grid-pulse";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", "burn");
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center p-6 text-center select-none bg-black text-white">
      <GridPulse className="-z-10 [--grid-pulse-line:rgb(255_255_255/0.09)]" />
      <div className="max-w-[480px] space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl">Something broke.</h1>
          <p className="text-base text-neutral-400">It was not you. Probably.</p>
        </div>

        <div className="pt-2">
          <Button
            variant="default"
            onClick={() => reset()}
            className="bg-white text-black hover:bg-neutral-200"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
