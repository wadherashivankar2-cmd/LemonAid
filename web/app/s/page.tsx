import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoastCard } from "@/components/RoastCard";
import { base64UrlDecode, verifySig } from "@/lib/sig";

interface SharePageProps {
  searchParams: {
    b?: string;
    r?: string;
    sig?: string;
  };
}

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const { b, r, sig } = searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mr-roast-ten.vercel.app";

  let title = "LemonAid Roast";
  let description = "A private moment of reflection and its inevitable burn.";

  if (b && r && sig) {
    try {
      const brag = base64UrlDecode(b);
      const roast = base64UrlDecode(r);
      const isValid = await verifySig(brag, roast, sig);
      if (isValid) {
        title = `"${roast.slice(0, 60)}..." | LemonAid`;
        description = `In response to: "${brag}"`;
      }
    } catch {
      // Fallback metadata
    }
  }

  const ogUrl = `/api/og?b=${encodeURIComponent(b || "")}&r=${encodeURIComponent(r || "")}&sig=${encodeURIComponent(sig || "")}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: "Gratitude Journal Roast Card",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ searchParams }: SharePageProps) {
  const { b, r, sig } = searchParams;

  let isValid = false;
  let brag = "";
  let roast = "";

  if (b && r && sig && b.length <= 500 && r.length <= 800 && sig.length === 32) {
    try {
      brag = base64UrlDecode(b);
      roast = base64UrlDecode(r);
      if (brag.length <= 200 && roast.length <= 300) {
        isValid = await verifySig(brag, roast, sig);
      }
    } catch {
      isValid = false;
    }
  }

  if (!isValid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-[480px] space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-foreground">Invalid Link</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This gratitude entry could not be verified. The signature is missing, expired, or was altered.
            </p>
          </div>
          <Link href="/">
            <Button variant="default">Return to Journal</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-4 py-8 sm:py-16 selection:bg-neutral-300">
      <div className="w-full max-w-[540px] flex items-center justify-between pb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Create your own</span>
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-[540px] flex-1 flex flex-col justify-center items-center my-4">
        <RoastCard brag={brag} roast={roast} />

        <div className="pt-6 w-full flex justify-center">
          <Link href="/">
            <Button variant="default" className="w-full sm:w-auto min-w-[200px]">
              Log your own gratitude
            </Button>
          </Link>
        </div>
      </div>

      <footer className="w-full max-w-[540px] pt-8 text-center text-xs text-muted-foreground border-t border-border/50">
        Private. No account. Nothing is stored.
      </footer>
    </main>
  );
}
