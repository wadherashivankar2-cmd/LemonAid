import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms | Gratitude Journal",
  description: "Terms of service for Gratitude Journal.",
};

export default function TermsPage() {
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
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Terms of Service</h1>
        </header>

        <section className="space-y-6 text-base text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium">
            Gratitude Journal is a comedy project, not a wellness or mental-health service.
          </p>
          <p>
            By using Gratitude Journal you agree to be roasted, not to take it personally, and to take it a little personally.
          </p>
          <p>
            The software is provided &ldquo;as is&rdquo;, without warranty of any kind, express or implied. Your achievements remain your own, as does the subsequent existential realization.
          </p>
        </section>

        <footer className="pt-8 text-xs text-muted-foreground border-t border-border/50">
          Private. No account. Nothing is stored.
        </footer>
      </div>
    </main>
  );
}
