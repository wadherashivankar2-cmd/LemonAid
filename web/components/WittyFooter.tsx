"use client";

import * as React from "react";
import Link from "next/link";
import { FakeButton } from "@/components/FakeButton";

export function WittyFooter() {
  return (
    <footer className="w-full pt-8 pb-4 text-xs text-muted-foreground border-t border-border/70 space-y-3">
      {/* Utility Real & Fake Links */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center">
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Terms
        </Link>
        <Link
          href="/status"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Status
        </Link>
        <Link
          href="/changelog"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Changelog
        </Link>

        <FakeButton
          quipKey="careers"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground font-normal"
        >
          Careers
        </FakeButton>

        <FakeButton
          quipKey="press"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground font-normal"
        >
          Press
        </FakeButton>

        <FakeButton
          quipKey="support"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground font-normal"
        >
          Contact support
        </FakeButton>

        <FakeButton
          quipKey="help"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground font-normal"
        >
          Help
        </FakeButton>

        <a
          href="mailto:contact@mrroast.app"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Report a real problem
        </a>
      </div>

      {/* Core Privacy Promise */}
      <div className="text-center text-[11px] text-muted-foreground/80">
        Private. No account. Nothing is stored.
      </div>
    </footer>
  );
}
