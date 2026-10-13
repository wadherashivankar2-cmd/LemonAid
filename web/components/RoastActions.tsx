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
}

export function RoastActions({
  roastId,
  onReset,
  onShareX,
  onDownloadCard,
  onReport,
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

        {onDownloadCard && (
          <Button
            id="download-card-btn"
            variant="outline"
            onClick={handleDownload}
            className="cursor-pointer"
          >
            Download Card
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
    </div>
  );
}
