"use client";

import * as React from "react";
import { onQuip } from "@/lib/quips";

interface ToastItem {
  id: number;
  text: string;
}

export function QuipHost() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const idCounter = React.useRef(0);

  React.useEffect(() => {
    const unsubscribe = onQuip((message) => {
      const id = ++idCounter.current;
      setToasts((prev) => [...prev.slice(-2), { id, text: message }]);

      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 4500);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center gap-2 max-w-[90vw] sm:max-w-[480px] pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground shadow-md transition-all duration-150 animate-fade-in text-center select-none"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
