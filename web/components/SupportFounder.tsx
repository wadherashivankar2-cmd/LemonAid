"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { quip } from "@/lib/quips";

interface SupportFounderProps {
  className?: string;
}

export function SupportFounder({ className = "" }: SupportFounderProps) {
  const [count, setCount] = React.useState<number>(1420);
  const [isLiked, setIsLiked] = React.useState<boolean>(false);
  const [isPopping, setIsPopping] = React.useState<boolean>(false);

  // Load persisted liked state and initial count on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLiked = localStorage.getItem("mr_roast_founder_liked");
      if (storedLiked === "true") {
        setIsLiked(true);
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mr-roast-api.onrender.com";
    fetch(`${apiUrl}/likes`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch likes");
        return res.json();
      })
      .then((data: { count?: number }) => {
        if (data && typeof data.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {
        // Fallback gracefully to default baseline
      });
  }, []);

  const handleLike = () => {
    // Optimistic UI updates
    setCount((prev) => prev + 1);
    setIsLiked(true);
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 300);

    // Persist in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("mr_roast_founder_liked", "true");
      const currentCount = parseInt(localStorage.getItem("mr_roast_founder_click_count") || "0", 10);
      localStorage.setItem("mr_roast_founder_click_count", String(currentCount + 1));
    }

    // Play witty toast reaction
    quip("supportFounder");

    // Send backend increment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mr-roast-api.onrender.com";
    fetch(`${apiUrl}/like`, { method: "POST" })
      .then((res) => res.json())
      .then((data: { count?: number }) => {
        if (data && typeof data.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {
        // Swallowed silently to preserve smooth UI
      });
  };

  return (
    <button
      id="support-founder-btn"
      type="button"
      onClick={handleLike}
      aria-label={`Support the founder, currently ${count} likes`}
      title="Support the founder (pity likes welcome)"
      className={`group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 hover:bg-neutral-100 dark:hover:bg-neutral-900 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer select-none active:scale-95 ${className}`}
    >
      <Heart
        className={`h-3.5 w-3.5 transition-transform duration-200 ${
          isLiked || isPopping
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground group-hover:text-red-500"
        } ${isPopping ? "scale-125" : "scale-100"}`}
        aria-hidden="true"
      />
      <span className="font-sans">Support Founder</span>
      <span className="text-[11px] font-mono text-muted-foreground/80 group-hover:text-foreground transition-colors">
        {count.toLocaleString()}
      </span>
    </button>
  );
}
