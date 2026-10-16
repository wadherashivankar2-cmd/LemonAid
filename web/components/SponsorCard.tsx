"use client";

import * as React from "react";
import { X } from "lucide-react";

const CLOWN_TRAINING_URL = "https://www.youtube.com/watch?v=9QStt6BIoFM";

export function SponsorCard({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  // Close modal on Escape key press
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Sponsor Trigger Button on Left Flank */}
      <button
        id="sponsor-trigger-btn"
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full lg:w-72 shrink-0 bg-neutral-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col items-center justify-center gap-1 text-center cursor-pointer select-none active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-950 ${className}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="text-sm sm:text-base font-extrabold flex items-center gap-2">
          💸 Sponsor This Disaster
        </span>
        <span className="text-[10px] font-normal text-amber-300/70 leading-tight">
          Warning: High risk of financial extortion &amp; emotional damage.
        </span>
      </button>

      {/* Interactive Brutal Roast Sponsor Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-left max-h-[90vh] overflow-y-auto"
          >
            {/* Top-Right Dismiss Button */}
            <button
              id="sponsor-modal-close-btn"
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Meme Image without Cropping (Full Photo Visible) */}
            {!imgError ? (
              <img
                src="/mode_smile.jpg"
                alt="Sponsor Meme"
                onError={() => setImgError(true)}
                className="w-full max-h-64 object-contain rounded-xl bg-black/30 border border-neutral-800 mb-4"
              />
            ) : (
              <div className="w-full max-h-64 h-48 flex flex-col items-center justify-center p-4 text-center bg-black/30 border border-neutral-800 rounded-xl mb-4 text-neutral-400">
                <span className="text-4xl mb-2">☕💸</span>
                <p className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
                  National Cloud Recovery Initiative
                </p>
              </div>
            )}

            {/* Circus Certification Protocol Badge */}
            <div className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit mb-2">
              CIRCUS CERTIFICATION PROTOCOL
            </div>

            {/* Modal Headline */}
            <h3
              id="sponsor-modal-title"
              className="text-xl font-bold text-neutral-100 mb-2 leading-snug"
            >
              Smile. Your uniform is ready.
            </h3>

            {/* Structured Breakdown (Receipt block) */}
            <div className="space-y-1.5 text-xs text-neutral-400 font-mono mb-4 text-left bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
              <div className="flex justify-between">
                <span>Designation:</span>
                <span className="text-amber-400">Head Circus Performer</span>
              </div>
              <div className="flex justify-between">
                <span>Curriculum:</span>
                <span className="text-rose-400">Greasepaint &amp; Red Noses</span>
              </div>
              <div className="flex justify-between">
                <span>Tuition Fee:</span>
                <span className="text-emerald-400">Waived (Natural Talent)</span>
              </div>
            </div>

            {/* Punchline Body */}
            <p className="text-xs text-neutral-300 leading-relaxed mb-5">
              You sat through an automated roast, clicked a suspicious sponsor button on the flank, and genuinely expected a checkout counter. We don&apos;t want your money—you clearly need professional training.
            </p>

            {/* Primary Action Button (CTA) */}
            <a
              id="sponsor-modal-cta-btn"
              href={CLOWN_TRAINING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center font-bold text-xs py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-all shadow-md active:scale-95"
            >
              Begin Professional Clown Training 🤡💄
            </a>

            {/* Secondary Dismiss Button */}
            <button
              id="sponsor-modal-dismiss-btn"
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-neutral-500 hover:text-neutral-400 mt-3 block text-center underline cursor-pointer w-full bg-transparent border-none py-1"
            >
              I&apos;ll remain an amateur clown (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
