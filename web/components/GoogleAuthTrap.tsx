"use client";

import * as React from "react";
import { X } from "lucide-react";
import { playTick } from "@/lib/sound";
import { quip } from "@/lib/quips";

export function GoogleAuthTrap() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow || "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = () => {
    playTick();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    quip("googleAuthReject");
  };

  return (
    <>
      <button
        id="google-auth-btn"
        type="button"
        onClick={handleOpen}
        aria-label="Sign in with Google"
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-800 text-xs font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-neutral-100 hover:border-neutral-400 hover:text-black active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer select-none"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Sign in with Google</span>
      </button>

      {/* Honeypot Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-auth-trap-title"
          onClick={handleClose}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[380px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-left"
          >
            <div className="relative w-full overflow-hidden rounded-xl border border-neutral-800 mb-4 aspect-video bg-neutral-900">
              <img
                src="/laptop_user.jpg"
                alt="User staring in disbelief"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 id="google-auth-trap-title" className="text-sm font-semibold text-neutral-200 leading-snug">
                  IDENTITY PROTECTED BY GOOGLE
                </h3>
                <span className="text-[10px] text-red-400 font-mono tracking-wide mt-1 block">
                  403 HANDSHAKE ABORTED
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 font-mono text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded-lg p-3.5 text-left space-y-1.5 leading-relaxed">
              <div className="text-red-300 font-semibold flex items-center gap-1.5">
                <span>[!]</span> SSO Exception: Insufficient Self-Awareness
              </div>
              <p className="text-neutral-400 text-[11.5px] leading-snug">
                Google refused the OAuth handshake. We cannot in good faith attach an active Google Workspace account to someone taking emotional damage from a web app.
              </p>
              <div className="text-neutral-500 text-[10.5px] pt-1 border-t border-red-950/40">
                status: 403_pure_cope • threat_level: career_limiting
              </div>
            </div>

            <button
              id="dismiss-google-trap-btn"
              type="button"
              onClick={handleClose}
              className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
            >
              Stay Anonymous
            </button>
          </div>
        </div>
      )}
    </>
  );
}
