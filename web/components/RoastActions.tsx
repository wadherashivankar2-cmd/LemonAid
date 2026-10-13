"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FakeButton } from "@/components/FakeButton";
import { quip, getClickCount } from "@/lib/quips";

interface RoastActionsProps {
  roastId?: string;
  roastText?: string;
  bragText?: string;
  onReset: () => void;
  onShareX?: () => void;
  onDownloadCard?: () => void;
}

export function RoastActions({
  roastId,
  onReset,
  onShareX,
  onDownloadCard,
}: RoastActionsProps) {
  const vote = async (kind: "funny" | "meh" | "salt"): Promise<{ salt?: number; n?: number } | void> => {
    if (!roastId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";
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

  return (
    <div className="pt-6 space-y-4">
      {/* Primary Action Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          id="reflect-again-btn"
          variant="default"
          onClick={handleAgain}
          className="font-medium"
        >
          Burn Me Again
        </Button>

        {onShareX && (
          <Button
            id="share-x-btn"
            variant="outline"
            onClick={onShareX}
          >
            Share on X
          </Button>
        )}

        {onDownloadCard && (
          <Button
            id="download-card-btn"
            variant="outline"
            onClick={onDownloadCard}
          >
            Download Card
          </Button>
        )}
      </div>

      {/* Deadpan Feedback Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <FakeButton
          id="vote-helpful-btn"
          quipKey="funny"
          busy="Logging..."
          run={() => vote("funny")}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
        >
          Helpful
        </FakeButton>

        <FakeButton
          id="vote-unhelpful-btn"
          quipKey="meh"
          busy="Filing..."
          run={() => vote("meh")}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
        >
          Not helpful
        </FakeButton>

        <FakeButton
          id="report-roast-btn"
          quipKey="report"
          busy="Escalating..."
          run={() => vote("salt")}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-[#C62828] hover:bg-muted text-xs"
        >
          Report
        </FakeButton>

        <Button
          id="suggestions-btn"
          variant="ghost"
          size="sm"
          onClick={() => quip("suggestions")}
          className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-normal cursor-pointer"
        >
          Suggestions
        </Button>
      </div>
    </div>
  );
}
