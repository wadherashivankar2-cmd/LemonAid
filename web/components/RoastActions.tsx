"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quip } from "@/lib/quips";

interface RoastActionsProps {
  roastId?: string;
  roastText?: string;
  bragText?: string;
  onReset: () => void;
  onShareX?: () => void;
  onDownloadCard?: () => void;
  onPaywall?: () => void;
  onCharity?: () => void;
}

type FeedbackModalType = "helpful" | "unhelpful" | "report" | "tribute_rejected" | null;

const COOK_AGAIN_MESSAGES = [
  "Masochist detected. Back for another round of humiliation?",
  "Addicted to emotional damage, aren't you?",
  "Your ego didn't learn the first time?",
];

const FEEDBACK_MODAL_DATA = {
  helpful: {
    title: "BRO THINKS HE COOKED",
    image: "/how_bro_felt.jpg",
    alt: "How bro felt",
    message: "Nobody asked for your approval bro. Sit down.",
    dismiss: "My fault chief",
  },
  unhelpful: {
    title: "CRY ABOUT IT",
    image: "/cartoon_bean.jpg",
    alt: "Cartoon bean",
    message: "Skill issue. Go cry in the comments.",
    dismiss: "I'll cope harder",
  },
  report: {
    title: "WOMP WOMP",
    image: "/womp_womp.jpg",
    alt: "Womp womp",
    message: "Calling the police on a roast? Bro is genuinely traumatized.",
    dismiss: "Womp womp",
  },
  tribute_rejected: {
    title: "TRIBUTE REJECTED",
    image: "/Superman.jpg",
    alt: "Tribute Rejected",
    message: "Bro thinks paying respect fixes his personality. Denied.",
    dismiss: "Fair enough",
  },
};

export function RoastActions({
  roastId,
  onReset,
  onShareX,
  onDownloadCard,
  onPaywall,
  onCharity,
}: RoastActionsProps) {
  const [activeFeedbackModal, setActiveFeedbackModal] = React.useState<FeedbackModalType>(null);

  // Modal ESC key listener & body scroll lock
  React.useEffect(() => {
    if (!activeFeedbackModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveFeedbackModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow || "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFeedbackModal]);

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
    const randomMsg = COOK_AGAIN_MESSAGES[Math.floor(Math.random() * COOK_AGAIN_MESSAGES.length)];
    quip(randomMsg, undefined, { duration: 5000 });
    onReset();
  };

  const handleHelpful = () => {
    void vote("funny");
    setActiveFeedbackModal("helpful");
  };

  const handleUnhelpful = () => {
    void vote("meh");
    setActiveFeedbackModal("unhelpful");
  };

  const handleReport = () => {
    void vote("salt");
    setActiveFeedbackModal("report");
  };

  const handleShare = () => {
    quip("shareX", undefined, { duration: 5000 });
    if (onShareX) onShareX();
  };

  const handleHumiliateFriend = () => {
    quip("humiliateFriend", undefined, { duration: 5000 });
    const origin = typeof window !== "undefined" ? window.location.origin : "https://lovebite.vercel.app";
    const text = encodeURIComponent(
      `I thought I was doing something with my life until LoveBite completely destroyed me. Go get humbled: ${origin}`
    );
    if (typeof window !== "undefined") {
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    quip("downloadCard", undefined, { duration: 5000 });
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
      setActiveFeedbackModal("tribute_rejected");
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
      {/* Prominent Hero Action: Cook Me Again */}
      <div className="w-full mb-4">
        <Button
          id="reflect-again-btn"
          variant="default"
          onClick={handleAgain}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md hover:shadow-lg hover:shadow-rose-500/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer text-center"
        >
          Cook Me Again
        </Button>
      </div>

      {/* Primary Viral / Share Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {onShareX && (
          <Button
            id="share-x-btn"
            variant="outline"
            onClick={handleShare}
            className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
          >
            Broadcast My Shame on X 📢
          </Button>
        )}

        <Button
          id="humiliate-friend-btn"
          variant="outline"
          onClick={handleHumiliateFriend}
          className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
        >
          Humiliate a Friend 🤝
        </Button>
      </div>

      {/* Trophy & Monetization / Troll Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3">
        {onDownloadCard && (
          <Button
            id="download-card-btn"
            variant="outline"
            onClick={handleDownload}
            className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
          >
            Claim Certificate of Failure 📜
          </Button>
        )}

        <Button
          id="paywall-erase-btn"
          variant="outline"
          onClick={onPaywall}
          className="w-full py-2.5 px-4 text-xs font-semibold cursor-pointer border border-amber-500/50 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-600 dark:hover:border-amber-400 hover:text-amber-950 dark:hover:text-amber-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out text-center"
        >
          Pay ₹499 to Erase from History 💳
        </Button>
      </div>

      {/* Acknowledge Creator Row */}
      <div className="w-full mt-3">
        <Button
          id="acknowledge-creator-btn"
          variant="outline"
          onClick={handleTribute}
          className={`w-full py-2.5 px-4 text-xs font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out border text-center cursor-pointer ${
            hasPaidTribute
              ? "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 hover:border-neutral-700"
              : "border-amber-500/50 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-600 dark:hover:border-amber-400 hover:text-amber-950 dark:hover:text-amber-100"
          }`}
        >
          {hasPaidTribute
            ? "❤️ Tribute Paid (1 per soul)"
            : `Acknowledge the Creator ❤️ [${likeCount.toLocaleString()}]`}
        </Button>
      </div>

      {/* Divider & Utilities Row */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 my-5 pt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Deadpan Feedback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            id="vote-helpful-btn"
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleHelpful}
            className="py-2 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer transition-all duration-300 ease-in-out rounded-lg"
          >
            Helpful
          </Button>

          <Button
            id="vote-unhelpful-btn"
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleUnhelpful}
            className="py-2 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer transition-all duration-300 ease-in-out rounded-lg"
          >
            Not helpful
          </Button>

          <Button
            id="report-roast-btn"
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleReport}
            className="py-2 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-neutral-200 dark:border-neutral-700 hover:border-red-400 dark:hover:border-red-800 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer transition-all duration-300 ease-in-out rounded-lg"
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer select-none"
          >
            Donate to Digital Wellness Foundation 🕊️
          </button>
        </div>
      </div>

      {/* Interactive Feedback Meme Modal */}
      {activeFeedbackModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-meme-title"
          onClick={() => setActiveFeedbackModal(null)}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[340px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="feedback-meme-title" className="text-xs font-semibold text-neutral-300 uppercase tracking-wider text-left">
                {FEEDBACK_MODAL_DATA[activeFeedbackModal].title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveFeedbackModal(null)}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex justify-center">
              {activeFeedbackModal === "tribute_rejected" ? (
                <img
                  src="/Superman.jpg"
                  alt="Tribute Rejected"
                  className="w-full rounded-lg object-cover"
                />
              ) : (
                <Image
                  src={FEEDBACK_MODAL_DATA[activeFeedbackModal].image}
                  alt={FEEDBACK_MODAL_DATA[activeFeedbackModal].alt}
                  width={180}
                  height={180}
                  className="max-h-48 w-auto object-contain mx-auto rounded-xl border border-neutral-700 bg-neutral-900 shadow-inner"
                  priority
                />
              )}
            </div>

            <p className="text-sm font-medium text-neutral-200 my-2 leading-relaxed px-1">
              {FEEDBACK_MODAL_DATA[activeFeedbackModal].message}
            </p>

            <button
              type="button"
              onClick={() => setActiveFeedbackModal(null)}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl mt-4 border border-neutral-700/60 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
            >
              {FEEDBACK_MODAL_DATA[activeFeedbackModal].dismiss}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
