"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { quip, getClickCount } from "@/lib/quips";

interface RoastActionsProps {
  roastId?: string;
  roastText?: string;
  bragText?: string;
  onReset: () => void;
  onShareX?: () => void;
  onDownloadCard?: () => void;
  onReport?: () => void;
  onPaywall?: () => void;
  onCharity?: () => void;
}

export function RoastActions({
  roastId,
  onReset,
  onShareX,
  onDownloadCard,
  onReport,
  onPaywall,
  onCharity,
}: RoastActionsProps) {
  const vote = async (kind: "funny" | "meh" | "salt"): Promise<{ salt?: number; n?: number } | void> => {
    if (!roastId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mr-roast-api.onrender.com";
    try {
      const res = await fetch(`${apiUrl}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roast_id: roastId, kind }),
      });
      if (res.ok) {
        const data = await res.json();
        if (kind === "salt") {
          return { salt: data.count };
        }
        if (kind === "funny") {
          return { n: data.count };
        }
      }
    } catch {
      // Swallowed silently per blueprint
    }
  };

  const handleAgain = () => {
    const againCount = getClickCount("again") + 1;
    if (againCount % 5 === 0) {
      quip("againSpam");
    }
    onReset();
  };

  const handleHelpful = () => {
    void vote("funny");
    quip("funny");
  };

  const handleUnhelpful = () => {
    void vote("meh");
    quip("meh");
  };

  const handleReport = () => {
    void vote("salt");
    quip("report");
    if (onReport) onReport();
  };

  const handleShare = () => {
    quip("shareX");
    if (onShareX) onShareX();
  };

  const handleHumiliateFriend = () => {
    quip("humiliateFriend");
    const text = encodeURIComponent(
      "I thought I was doing something with my life until LoveBite completely destroyed me. Go get humbled: https://mr-roast-ten.vercel.app"
    );
    if (typeof window !== "undefined") {
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    quip("downloadCard");
    if (onDownloadCard) onDownloadCard();
  };

  const [likeCount, setLikeCount] = React.useState<number>(1420);
  const [hasPaidTribute, setHasPaidTribute] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mr_roast_creator_tribute_paid");
      if (stored === "true") {
        setHasPaidTribute(true);
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
          setLikeCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  const handleTribute = () => {
    if (hasPaidTribute) {
      quip("creatorTributeGreedy");
      return;
    }

    setLikeCount((prev) => prev + 1);
    setHasPaidTribute(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("mr_roast_creator_tribute_paid", "true");
    }
    quip("creatorTribute");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mr-roast-api.onrender.com";
    fetch(`${apiUrl}/like`, { method: "POST" })
      .then((res) => res.json())
      .then((data: { count?: number }) => {
        if (data && typeof data.count === "number") {
          setLikeCount(data.count);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="pt-6 my-4 space-y-3">
      {/* Primary Actions Row (Symmetrical 2-column grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        <Button
          id="reflect-again-btn"
          variant="default"
          onClick={handleAgain}
          className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-700 hover:border-neutral-600 hover:text-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
        >
          Cook Me Again
        </Button>

        {onShareX && (
          <Button
            id="share-x-btn"
            variant="outline"
            onClick={handleShare}
            className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
          >
            Broadcast My Shame on X 📢
          </Button>
        )}
      </div>

      {/* Secondary Viral / Trophy Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3">
        <Button
          id="humiliate-friend-btn"
          variant="outline"
          onClick={handleHumiliateFriend}
          className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
        >
          Humiliate a Friend 🤝
        </Button>

        {onDownloadCard && (
          <Button
            id="download-card-btn"
            variant="outline"
            onClick={handleDownload}
            className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
          >
            Claim Certificate of Failure 📜
          </Button>
        )}
      </div>

      {/* Troll / Honeypot Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3">
        <Button
          id="paywall-erase-btn"
          variant="outline"
          onClick={onPaywall}
          className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 hover:border-amber-500 hover:text-amber-900 dark:hover:text-amber-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
        >
          Pay $4.99 to Erase from History 💳
        </Button>

        <Button
          id="acknowledge-creator-btn"
          variant="outline"
          onClick={handleTribute}
          className={`w-full py-2.5 px-4 text-xs font-semibold cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out border text-center ${
            hasPaidTribute
              ? "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:bg-neutral-900 hover:border-neutral-700 hover:text-neutral-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 hover:border-amber-500 hover:text-amber-900 dark:hover:text-amber-100"
          }`}
        >
          {hasPaidTribute
            ? "❤️ Tribute Paid (1 per soul)"
            : `Acknowledge the Creator ❤️ [${likeCount.toLocaleString()}]`}
        </Button>
      </div>

      {/* Divider & Utilities Row */}
      <div className="border-t border-neutral-100 dark:border-neutral-800/80 my-5 pt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Deadpan Feedback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            id="vote-helpful-btn"
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleHelpful}
            className="py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer transition-all duration-300 ease-in-out rounded-lg"
          >
            Helpful
          </Button>

          <Button
            id="vote-unhelpful-btn"
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleUnhelpful}
            className="py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer transition-all duration-300 ease-in-out rounded-lg"
          >
            Not helpful
          </Button>

          <Button
            id="report-roast-btn"
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleReport}
            className="py-2 px-3 text-xs text-muted-foreground hover:text-[#C62828] hover:bg-muted/80 border border-transparent hover:border-red-500/30 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer transition-all duration-300 ease-in-out rounded-lg"
          >
            Report
          </Button>
        </div>

        {/* Genuine Charity Button */}
        <div>
          <button
            id="donate-charity-btn"
            type="button"
            onClick={onCharity}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer select-none"
          >
            Donate to Digital Wellness Foundation 🕊️
          </button>
        </div>
      </div>
    </div>
  );
}
