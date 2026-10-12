"use client";

import * as React from "react";
import { Volume2, VolumeX, Loader2, ArrowLeft, Smile, Laugh, Meh, Frown, Annoyed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoastActions } from "@/components/RoastActions";
import { RoastCard } from "@/components/RoastCard";
import { WittyFooter } from "@/components/WittyFooter";
import { isMuted, setMuted, playTick, playBoom } from "@/lib/sound";
import { quip } from "@/lib/quips";
import { downloadCard, shareX, setCurrentShare } from "@/lib/share";

type AppState = "idle" | "loading" | "reveal" | "gentle" | "error";

interface RoastResponse {
  kind: "roast" | "gentle";
  text: string;
  id?: string;
  category?: string;
  brag?: string;
  sig?: string;
  crisis_url?: string;
}

export default function Home() {
  const [state, setState] = React.useState<AppState>("idle");
  const [input, setInput] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [loadingText, setLoadingText] = React.useState("Reflecting on your journey...");
  const [roastData, setRoastData] = React.useState<RoastResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [muted, setMutedState] = React.useState(false);
  const [forceGentle, setForceGentle] = React.useState(false);
  const [selectedMood, setSelectedMood] = React.useState<number | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Initialize sound mute preference and ping health to wake HF Space
  React.useEffect(() => {
    setMutedState(isMuted());

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";
    fetch(`${apiUrl}/health`, { mode: "cors" }).catch(() => {});
  }, []);

  // Ensure data-theme is never flipped to burn
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [state]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (validationError) {
      setValidationError(null);
    }
    playTick();
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState("idle");
    setInput("");
    setValidationError(null);
    setRoastData(null);
    setErrorMessage(null);
    setForceGentle(false);
    setSelectedMood(null);
  };

  const handleMoodClick = (index: number, isSad: boolean) => {
    setSelectedMood(index);
    if (isSad) {
      setForceGentle(true);
      quip("moodSad");
    } else {
      setForceGentle(false);
      quip("mood");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state === "loading") return;

    const trimmed = input.trim();
    if (trimmed.length < 3) {
      setValidationError("Even a moment of gratitude needs at least 3 characters.");
      return;
    }
    if (trimmed.length > 200) {
      setValidationError("That is the limit. Gratitude is finite.");
      return;
    }

    setValidationError(null);

    // If a sad mood was picked, bypass the roast API and force gentle mode immediately
    if (forceGentle) {
      setRoastData({
        kind: "gentle",
        text: "Take care today. No jokes from us.",
      });
      setState("gentle");
      return;
    }

    setState("loading");
    setLoadingText("Reflecting on your journey...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Timeout timers
    const wakeTimer = setTimeout(() => {
      setLoadingText("Aligning your energy... (the server is waking up)");
    }, 6000);

    const abortTimer = setTimeout(() => {
      controller.abort();
    }, 60000);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

    try {
      const responsePromise = fetch(`${apiUrl}/roast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ happy_thought: trimmed }),
        signal: controller.signal,
      });

      // Ensure minimum 2000ms calm loading delay
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      const [response] = await Promise.all([responsePromise, minDelayPromise]);

      clearTimeout(wakeTimer);
      clearTimeout(abortTimer);

      if (response.status === 429) {
        setState("error");
        setErrorMessage("Slow down. Inner peace takes time.");
        return;
      }

      if (!response.ok) {
        setState("error");
        setErrorMessage("The universe is buffering. Try again in a moment.");
        return;
      }

      const data: RoastResponse = await response.json();
      setRoastData(data);

      if (data.kind === "gentle") {
        setState("gentle");
      } else {
        if (data.brag && data.sig) {
          setCurrentShare({ brag: data.brag, roast: data.text, sig: data.sig });
        }
        setState("reveal");
        // Play low dramatic boom on roast reveal
        playBoom();
      }
    } catch {
      clearTimeout(wakeTimer);
      clearTimeout(abortTimer);

      if (controller.signal.aborted) {
        setState("error");
        setErrorMessage("The meditation timed out. Try again in a moment.");
        return;
      }

      setState("error");
      setErrorMessage("The universe is buffering. Try again in a moment.");
    }
  };

  const handleDownloadCard = () => {
    downloadCard("roast-card");
  };

  const handleShareX = () => {
    if (roastData) {
      shareX(roastData.text, roastData.brag, roastData.sig);
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 min-h-screen flex flex-col justify-between py-12 selection:bg-neutral-200">
      {/* Top Utility Bar */}
      <div className="w-full flex justify-end">
        <button
          id="sound-toggle-btn"
          onClick={toggleSound}
          type="button"
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
        >
          {muted ? (
            <>
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sound off</span>
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sound on</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full my-auto py-8">
        {/* States 1, 2, 3: IDLE, LOADING, REVEAL */}
        {(state === "idle" || state === "loading" || state === "reveal") && (
          <div className="space-y-6 animate-fade-in">
            <header className="space-y-2">
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight leading-snug font-normal">
                Take a deep breath. Reflect on the light in your life.
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                What brought you genuine peace or pride today?
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    id="gratitude-entry"
                    rows={4}
                    maxLength={200}
                    value={input}
                    disabled={state === "loading" || state === "reveal"}
                    onChange={handleInputChange}
                    placeholder="Today I felt grateful for..."
                    aria-label="What brought you genuine peace or pride today?"
                    className="w-full resize-none rounded-xl border border-border bg-white p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition shadow-sm disabled:opacity-90 disabled:bg-neutral-50"
                  />
                  <div className="mt-1.5 flex justify-between items-center text-xs text-muted-foreground">
                    <div>
                      {input.length >= 200 ? (
                        <span className="text-neutral-500 font-medium">
                          That is the limit. Gratitude is finite.
                        </span>
                      ) : input.length >= 180 ? (
                        <span className="text-neutral-500 font-medium">
                          You have so much to say about so little.
                        </span>
                      ) : null}
                    </div>
                    <span className="tabular-nums">{input.length}/200</span>
                  </div>
                </div>

                {/* Mood Emoji Buttons */}
                {state === "idle" && (
                  <div className="flex items-center gap-1.5 pt-1" aria-label="Select mood">
                    <span className="text-xs text-muted-foreground mr-1">Mood:</span>
                    <button
                      type="button"
                      aria-label="Joyful mood"
                      onClick={() => handleMoodClick(0, false)}
                      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 transition inline-flex items-center justify-center ${selectedMood === 0 ? "text-foreground bg-neutral-200/70" : ""}`}
                    >
                      <Laugh className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Happy mood"
                      onClick={() => handleMoodClick(1, false)}
                      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 transition inline-flex items-center justify-center ${selectedMood === 1 ? "text-foreground bg-neutral-200/70" : ""}`}
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Neutral mood"
                      onClick={() => handleMoodClick(2, false)}
                      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 transition inline-flex items-center justify-center ${selectedMood === 2 ? "text-foreground bg-neutral-200/70" : ""}`}
                    >
                      <Meh className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Somber mood"
                      onClick={() => handleMoodClick(3, true)}
                      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 transition inline-flex items-center justify-center ${selectedMood === 3 ? "text-foreground bg-neutral-200/70" : ""}`}
                    >
                      <Frown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Distressed mood"
                      onClick={() => handleMoodClick(4, true)}
                      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 transition inline-flex items-center justify-center ${selectedMood === 4 ? "text-foreground bg-neutral-200/70" : ""}`}
                    >
                      <Annoyed className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {validationError && (
                  <p
                    id="validation-error"
                    className="text-xs text-neutral-600 font-medium pt-1"
                    role="alert"
                  >
                    {validationError}
                  </p>
                )}
              </div>

              {state === "idle" && (
                <Button
                  id="save-to-heart-btn"
                  type="submit"
                  disabled={input.trim().length === 0}
                  className="rounded-lg bg-[#1F1B16] text-[#FAF8F5] hover:bg-black/90 font-medium px-6 py-2.5 transition active:scale-[0.99]"
                >
                  Save to Heart
                </Button>
              )}
            </form>

            {/* State: LOADING */}
            {state === "loading" && (
              <div
                className="flex flex-col items-center justify-center space-y-3 py-8 text-center animate-fade-in"
                aria-live="polite"
              >
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-foreground font-serif tracking-wide">{loadingText}</p>
              </div>
            )}

            {/* State: REVEAL (POLISHED SUBTLE CARD BENEATH TEXTAREA) */}
            {state === "reveal" && roastData && (
              <div
                id="roast-reveal-container"
                className="mt-6 space-y-5 rounded-xl border border-border bg-white p-6 sm:p-7 shadow-sm animate-fade-in"
                aria-live="polite"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
                    The Burn
                  </span>
                  <span className="text-xs text-muted-foreground font-serif italic">
                    A moment of brutal honesty
                  </span>
                </div>

                <blockquote className="font-serif text-xl sm:text-2xl text-[#1F1B16] leading-snug tracking-tight border-l-2 border-[#1F1B16] pl-4 my-2">
                  &ldquo;{roastData.text}&rdquo;
                </blockquote>

                {/* Actions: Reflect again, Share on X, Download Card, and feedback */}
                <RoastActions
                  roastId={roastData.id}
                  roastText={roastData.text}
                  bragText={roastData.brag || input}
                  onReset={handleReset}
                  onDownloadCard={handleDownloadCard}
                  onShareX={handleShareX}
                />
              </div>
            )}

            {/* Off-screen RoastCard for high-res PNG export via html-to-image */}
            {state === "reveal" && roastData && (
              <div
                style={{
                  position: "fixed",
                  left: "-9999px",
                  top: 0,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                <RoastCard
                  brag={roastData.brag || input}
                  roast={roastData.text}
                />
              </div>
            )}
          </div>
        )}

        {/* State 4: GENTLE */}
        {state === "gentle" && roastData && (
          <div className="space-y-6 animate-fade-in" aria-live="polite">
            <div className="space-y-3">
              <h2 className="font-serif text-2xl text-foreground font-normal">A gentle moment</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {roastData.text}
              </p>
              {roastData.crisis_url && (
                <p className="pt-2 text-sm text-foreground">
                  Confidential support is available 24/7. Find local helplines at{" "}
                  <a
                    href={roastData.crisis_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 font-medium hover:text-foreground"
                  >
                    findahelpline.com
                  </a>
                  .
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                id="back-to-journal-btn"
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 5: ERROR */}
        {state === "error" && (
          <div className="space-y-6 animate-fade-in" aria-live="assertive">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">Notice</h2>
              <p className="text-base text-muted-foreground">
                {errorMessage || "The universe is buffering. Try again in a moment."}
              </p>
            </div>

            <div className="pt-2">
              <Button
                id="error-back-btn"
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Witty Footer */}
      <WittyFooter />
    </main>
  );
}
