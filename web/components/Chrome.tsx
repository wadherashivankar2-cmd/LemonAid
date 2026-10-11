"use client";

import * as React from "react";
import { QuipHost } from "@/components/QuipHost";
import { Button } from "@/components/ui/button";
import { quip } from "@/lib/quips";

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function Chrome() {
  const [showCookies, setShowCookies] = React.useState(false);
  const konamiIndex = React.useRef(0);

  React.useEffect(() => {
    // 1. Devtools console line
    console.log("Opening devtools? The roast is not in here. Neither is the career advice.");

    // 2. Cookie banner delay: 2.5s
    const cookieTimer = setTimeout(() => {
      setShowCookies(true);
    }, 2500);

    // 3. Tab blur / focus title swap
    const originalTitle = document.title || "Gratitude Journal";
    const handleBlur = () => {
      document.title = "Come back. Your journey is not finished.";
    };
    const handleFocus = () => {
      document.title = originalTitle;
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // 4. Konami code listener
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expected = KONAMI_CODE[konamiIndex.current];
      if (key === expected || key === expected.toLowerCase()) {
        konamiIndex.current++;
        if (konamiIndex.current === KONAMI_CODE.length) {
          quip("konami");
          konamiIndex.current = 0;
        }
      } else {
        konamiIndex.current = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(cookieTimer);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAcceptCookies = () => {
    quip("cookies");
    setShowCookies(false);
  };

  return (
    <>
      <QuipHost />

      {/* Sarcastic Cookie Banner */}
      {showCookies && (
        <div
          role="dialog"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 rounded-lg border border-border bg-card p-4 shadow-lg text-foreground space-y-3 animate-fade-in"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            We value your emotional compliance. We do not use tracking cookies, but we appreciate the illusion of choice.
          </p>
          <div className="flex gap-2">
            <Button
              id="cookie-accept-1"
              variant="default"
              size="sm"
              onClick={handleAcceptCookies}
              className="flex-1 text-xs"
            >
              Accept all
            </Button>
            <Button
              id="cookie-accept-2"
              variant="outline"
              size="sm"
              onClick={handleAcceptCookies}
              className="flex-1 text-xs"
            >
              Accept all
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
