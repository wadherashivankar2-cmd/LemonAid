"use client";

import * as React from "react";
import { Volume2, VolumeX, Loader2, ArrowLeft, Smile, Laugh, Meh, Frown, Annoyed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoastActions } from "@/components/RoastActions";
import { WittyFooter } from "@/components/WittyFooter";
import { isMuted, setMuted, playTick, playBoom } from "@/lib/sound";
import { quip } from "@/lib/quips";

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

  // Sync data-theme with state
  React.useEffect(() => {
    if (state === "reveal") {
      document.documentElement.setAttribute("data-theme", "burn");
    } else {
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-4 py-8 sm:py-16 selection:bg-neutral-300">
      {/* Top Utility Bar */}
      <div className="w-full max-w-[640px] flex justify-end">
        <button
          id="sound-toggle-btn"
          onClick={toggleSound}
          type="button"
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          {muted ? (
            <>
              <VolumeX className="h-4 w-4" aria-hidden="true" />
              <span>Sound off</span>
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Sound on</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[640px] flex-1 flex flex-col justify-center my-8">
        {/* State 1: IDLE */}
        {state === "idle" && (
          <div className="space-y-8 animate-fade-in">
            <header className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight leading-tight">
                Take a deep breath. Reflect on the light in your life.
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
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
                    onChange={handleInputChange}
                    placeholder="Today I felt grateful for..."
                    aria-label="What brought you genuine peace or pride today?"
                    className="w-full resize-none rounded-lg border border-border bg-card p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
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

                {/* Mood Faces Row */}
                <div className="flex items-center gap-2 pt-1" aria-label="Select mood">
                  <span className="text-xs text-muted-foreground pr-1">Mood:</span>
                  <button
                    type="button"
                    aria-label="Joyful mood"
                    onClick={() => handleMoodClick(0, false)}
                    className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${selectedMood === 0 ? "text-foreground bg-muted" : ""}`}
                  >
                    <Laugh className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Happy mood"
                    onClick={() => handleMoodClick(1, false)}
                    className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${selectedMood === 1 ? "text-foreground bg-muted" : ""}`}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Neutral mood"
                    onClick={() => handleMoodClick(2, false)}
                    className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${selectedMood === 2 ? "text-foreground bg-muted" : ""}`}
                  >
                    <Meh className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Somber mood"
                    onClick={() => handleMoodClick(3, true)}
                    className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${selectedMood === 3 ? "text-foreground bg-muted" : ""}`}
                  >
                    <Frown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Distressed mood"
                    onClick={() => handleMoodClick(4, true)}
                    className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${selectedMood === 4 ? "text-foreground bg-muted" : ""}`}
                  >
                    <Annoyed className="h-4 w-4" />
                  </button>
                </div>

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

              <Button
                id="save-to-heart-btn"
                type="submit"
                disabled={input.trim().length === 0}
                className="w-full sm:w-auto min-w-[160px] font-medium"
              >
                Save to Heart
              </Button>
            </form>
          </div>
        )}

        {/* State 2: LOADING */}
        {state === "loading" && (
          <div
            className="flex flex-col items-center justify-center space-y-4 py-16 text-center animate-fade-in"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-base text-foreground font-serif tracking-wide">{loadingText}</p>
          </div>
        )}

        {/* State 3: REVEAL (ROAST) */}
        {state === "reveal" && roastData && (
          <div
            className="space-y-6 animate-fade-in"
            aria-live="polite"
            id="roast-reveal-container"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#C62828]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#C62828] border border-[#C62828]/30">
                The burn
              </span>
              {roastData.category && (
                <span className="text-xs text-muted-foreground capitalize">
                  {roastData.category}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <p className="font-sans text-xl sm:text-2xl font-medium text-foreground leading-snug">
                {roastData.text}
              </p>

              {roastData.brag && (
                <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                  &ldquo;{roastData.brag}&rdquo;
                </p>
              )}
            </div>

            {/* Actions: Joke buttons render ONLY on roasts, never on gentle */}
            <RoastActions
              roastId={roastData.id}
              roastText={roastData.text}
              bragText={roastData.brag}
              onReset={handleReset}
            />
          </div>
        )}

        {/* State 4: GENTLE */}
        {state === "gentle" && roastData && (
          <div className="space-y-6 animate-fade-in" aria-live="polite">
            <div className="space-y-3">
              <h2 className="font-serif text-2xl text-foreground">A gentle moment</h2>
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
              <h2 className="font-serif text-2xl text-foreground">Notice</h2>
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
