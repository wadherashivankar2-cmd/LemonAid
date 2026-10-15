import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Changelog | Gratitude Journal",
  description: "Updates and deprecations in LemonAid.",
};

const RELEASES = [
  {
    version: "v1.3",
    date: "Current",
    note: "Fixed a bug where users felt better.",
  },
  {
    version: "v1.2",
    date: "Recent",
    note: "Roasts are 14% more accurate and 100% less sorry.",
  },
  {
    version: "v1.1",
    date: "Earlier",
    note: "Added a report button. It does nothing. It is working as intended.",
  },
  {
    version: "v1.0",
    date: "Inception",
    note: "Launched. Mindfulness not included.",
  },
];

export default function ChangelogPage() {
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
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Changelog</h1>
        </header>

        <section className="space-y-6">
          {RELEASES.map((rel) => (
            <div
              key={rel.version}
              className="border-l-2 border-border pl-4 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {rel.version}
                </span>
                <span className="text-xs text-muted-foreground">({rel.date})</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rel.note}
              </p>
            </div>
          ))}
        </section>

        <footer className="pt-8 text-xs text-muted-foreground border-t border-border/50">
          Private. No account. Nothing is stored.
        </footer>
      </div>
    </main>
  );
}
