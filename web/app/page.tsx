"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [input, setInput] = React.useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-4 py-12 sm:py-24">
      <div className="w-full max-w-[640px] flex-1 flex flex-col justify-center space-y-8">
        <header className="space-y-3 text-center sm:text-left">
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground">
            Take a deep breath. Reflect on the light in your life.
          </h1>
          <p className="text-base text-muted-foreground">
            What brought you genuine peace or pride today?
          </p>
        </header>

        <section className="space-y-4">
          <div className="relative">
            <textarea
              id="gratitude-entry"
              rows={4}
              maxLength={200}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Today I felt grateful for..."
              className="w-full resize-none rounded-lg border border-border bg-card p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
              aria-label="What brought you genuine peace or pride today?"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{input.length}/200</span>
            </div>
          </div>

          <Button
            id="save-to-heart-btn"
            className="w-full sm:w-auto min-w-[160px]"
            disabled={input.trim().length === 0}
          >
            Save to Heart
          </Button>
        </section>

        <footer className="pt-8 text-center text-xs text-muted-foreground border-t border-border/50">
          Private. No account. Nothing is stored.
        </footer>
      </div>
    </main>
  );
}
