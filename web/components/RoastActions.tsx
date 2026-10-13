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
      "I thought I was doing something with my life until Mr. Roast completely destroyed me. Go get humbled: https://mr-roast-ten.vercel.app"
    );
    if (typeof window !== "undefined") {
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    quip("downloadCard");
    if (onDownloadCard) onDownloadCard();
  };

  return (
    <div className="pt-6 space-y-4">
      {/* Primary Action Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          id="reflect-again-btn"
          variant="default"
          onClick={handleAgain}
          className="font-medium cursor-pointer"
        >
          Cook Me Again
        </Button>

        {onShareX && (
          <Button
            id="share-x-btn"
            variant="outline"
            onClick={handleShare}
            className="cursor-pointer"
          >
            Share on X
          </Button>
        )}

        <Button
          id="humiliate-friend-btn"
          variant="outline"
          onClick={handleHumiliateFriend}
          className="cursor-pointer text-xs"
        >
          Humiliate a Friend 🤝
        </Button>

        <Button
          id="paywall-erase-btn"
          variant="outline"
          onClick={onPaywall}
          className="cursor-pointer border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500 active:scale-95 transition-all text-xs font-semibold"
        >
          Pay $4.99 to Erase from History 💳
        </Button>

        {onDownloadCard && (
          <Button
            id="download-card-btn"
            variant="outline"
            onClick={handleDownload}
            className="cursor-pointer text-xs"
          >
            Claim Certificate of Failure 📜
          </Button>
        )}
      </div>

      {/* Deadpan Feedback Controls (Never Disabled) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <Button
          id="vote-helpful-btn"
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleHelpful}
          className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs cursor-pointer"
        >
          Helpful
        </Button>

        <Button
          id="vote-unhelpful-btn"
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleUnhelpful}
          className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs cursor-pointer"
        >
          Not helpful
        </Button>

        <Button
          id="report-roast-btn"
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleReport}
          className="text-muted-foreground hover:text-[#C62828] hover:bg-muted text-xs cursor-pointer"
        >
          Report
        </Button>
      </div>

      {/* Fake Charity Honeypot Link */}
      <div className="pt-1 text-left">
        <button
          id="donate-charity-btn"
          type="button"
          onClick={onCharity}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors cursor-pointer select-none"
        >
          Donate to Charity (Offset Karmic Debt) 🕊️
        </button>
      </div>
    </div>
  );
}
