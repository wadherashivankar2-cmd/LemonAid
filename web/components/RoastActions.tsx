"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [showReportModal, setShowReportModal] = React.useState(false);

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
    setShowReportModal(true);
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

      {/* Troll Report Modal with Meow.jpg */}
      {showReportModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={() => setShowReportModal(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            className="fixed z-50 top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[300px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-4 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="report-modal-title" className="text-xs font-semibold text-neutral-200 leading-snug text-left">
                Reporting this? Cry to the authorities.
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex justify-center">
              <Image
                src="/Meow.jpg"
                alt="Meow"
                width={160}
                height={160}
                className="mx-auto rounded-lg object-contain border border-neutral-700 bg-neutral-900"
                priority
              />
            </div>

            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              Our moderation department is taking this very seriously.
            </p>

            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="w-full rounded-lg bg-neutral-800 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 active:scale-98 transition cursor-pointer text-center"
            >
              Understood
            </button>
          </div>
        </>
      )}
    </div>
  );
}
