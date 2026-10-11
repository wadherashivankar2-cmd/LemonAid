import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy | Gratitude Journal",
  description: "Our concise, truthful privacy promise.",
};

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-4 py-12 sm:py-20">
      <div className="w-full max-w-[640px] flex-1 flex flex-col justify-center space-y-8">
        <header className="space-y-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Journal</span>
            </Button>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Privacy Policy</h1>
        </header>

        <section className="space-y-6 text-base text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium">
            We do not store what you type. We store anonymous vote counts per roast. That is all.
          </p>
          <p>
            If you share a link, the text in it is public. The brag and roast are cryptographically signed to prevent manipulation, but encoded directly in the URL query string.
          </p>
          <p>
            There are no user accounts, no tracking cookies, no cross-site pixels, and no database tables storing journal entries.
          </p>
        </section>

        <footer className="pt-8 text-xs text-muted-foreground border-t border-border/50">
          Private. No account. Nothing is stored.
        </footer>
      </div>
    </main>
  );
}
