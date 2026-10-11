"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StatusPage() {
  const [status, setStatus] = React.useState<"checking" | "up" | "slow" | "down">("checking");

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";
    const start = performance.now();

    fetch(`${apiUrl}/health`, { signal: controller.signal, mode: "cors" })
      .then((res) => {
        clearTimeout(timeout);
        const duration = performance.now() - start;
        if (res.ok) {
          if (duration > 3500) {
            setStatus("slow");
          } else {
            setStatus("up");
          }
        } else {
          setStatus("slow");
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          setStatus("slow");
        } else {
          setStatus("down");
        }
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-4 py-12 sm:py-20">
      <div className="w-full max-w-[640px] flex-1 flex flex-col justify-center space-y-8 animate-fade-in">
        <header className="space-y-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Journal</span>
            </Button>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground">System Status</h1>
        </header>

        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          {status === "checking" && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-5 w-5 animate-spin" />
              <span>Checking pulse of backend services...</span>
            </div>
          )}

          {status === "up" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-emerald-600 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>All systems operational. Emotionally: unknown.</span>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Vector retrieval, intent classifiers, and rate limiters healthy.
              </p>
            </div>
          )}

          {status === "slow" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-amber-600 font-medium">
                <Clock className="h-5 w-5" />
                <span>The server is waking up. It is not a morning model.</span>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Hugging Face CPU Space is spinning up from cold sleep. Please allow 10-20 seconds.
              </p>
            </div>
          )}

          {status === "down" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-neutral-600 font-medium">
                <AlertCircle className="h-5 w-5" />
                <span>Backend unreachable.</span>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Unable to establish connection to the API endpoint.
              </p>
            </div>
          )}
        </section>

        <footer className="pt-8 text-xs text-muted-foreground border-t border-border/50">
          Private. No account. Nothing is stored.
        </footer>
      </div>
    </main>
  );
}
