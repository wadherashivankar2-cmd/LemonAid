import { toPng, toBlob } from "html-to-image";
import { quip } from "@/lib/quips";

interface SharePayload {
  brag: string;
  roast: string;
  sig: string;
}

let activeShare: SharePayload | null = null;

export function setCurrentShare(payload: SharePayload | null): void {
  activeShare = payload;
}

export function getCurrentShare(): SharePayload | null {
  return activeShare;
}

export async function downloadCard(elementId = "roast-card", filename = "Certificate_of_Failure.png"): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    quip("help", { n: "Card element not found" });
    return;
  }

  try {
    // 1. Font warm-up pass
    await toPng(node);

    // 2. High-DPI export pass
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#000000",
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Card download failed:", err);
    alert("Card export failed. Please take a screenshot instead.");
  }
}

export async function shareCard(elementId = "roast-card"): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    await downloadCard(elementId);
    return;
  }

  // Check Web Share API support with files
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      // 1. Font warm-up
      await toBlob(node);

      // 2. High-DPI blob
      const blob = await toBlob(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#000000",
      });

      if (blob) {
        const file = new File([blob], "my-gratitude.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Gratitude Journal",
            text: "I logged my gratitude and got roasted instead.",
            files: [file],
          });
          return;
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return; // User canceled share sheet
      }
      console.warn("Web Share API failed, falling back to download:", err);
    }
  }

  // Fallback to plain download
  await downloadCard(elementId);
}

export function shareX(roastText: string): void {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://lemonaid.vercel.app";
  const tweetText = `I logged my gratitude and LemonAid destroyed me:\n\n"${roastText}"\n\nGet cooked: ${origin}`;
  const tweetUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}`;

  if (typeof window !== "undefined") {
    window.open(tweetUrl, "_blank", "noopener,noreferrer");

    const onWindowFocus = () => {
      quip("twitterReturn", undefined, { duration: 5000 });
      window.removeEventListener("focus", onWindowFocus);
    };
    window.addEventListener("focus", onWindowFocus);
  }
}
