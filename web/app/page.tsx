"use client";

import * as React from "react";
import { Volume2, VolumeX, Loader2, ArrowLeft, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoastActions } from "@/components/RoastActions";
import { RoastCard } from "@/components/RoastCard";
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

const MOODS = [
  { emoji: "😆", label: "Joyful", reaction: "Delusional confidence detected." },
  { emoji: "🙂", label: "Happy", reaction: "Enjoy it before reality kicks in." },
  { emoji: "😐", label: "Neutral", reaction: "Dead inside already, perfect." },
  { emoji: "🙁", label: "Somber", reaction: "Pre-ordering sympathy won't save you." },
  { emoji: "😶", label: "Speechless", reaction: "Zero thoughts, zero prospects." },
];

export default function Home() {
  const [state, setState] = React.useState<AppState>("idle");
  const [input, setInput] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [loadingSeconds, setLoadingSeconds] = React.useState(0);
  const [roastData, setRoastData] = React.useState<RoastResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [muted, setMutedState] = React.useState(false);
  const [selectedMood, setSelectedMood] = React.useState<number | null>(null);
  const [hoveredMood, setHoveredMood] = React.useState<number | null>(null);

  // Typewriter effect state
  const [displayedWords, setDisplayedWords] = React.useState<string[]>([]);
  const [isTypingComplete, setIsTypingComplete] = React.useState(false);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Initialize sound mute preference and wake backend
  React.useEffect(() => {
    setMutedState(isMuted());
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";
    fetch(`${apiUrl}/health`, { mode: "cors" }).catch(() => { });
  }, []);

  // Progressive loading timer for cold starts
  React.useEffect(() => {
    if (state !== "loading") {
      setLoadingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  const getLoadingMessage = (seconds: number) => {
    if (seconds < 4) {
      return "Reading your self-absorbed thought...";
    }
    if (seconds < 9) {
      return "Formulating a reality check...";
    }
    return "Waking up the server from a coma... your roast is worth the wait.";
  };

  // Word-by-word typewriter effect on reveal
  React.useEffect(() => {
    if (state !== "reveal" || !roastData?.text) {
      setDisplayedWords([]);
      setIsTypingComplete(false);
      return;
    }

    const words = roastData.text.split(" ");
    setDisplayedWords([]);
    setIsTypingComplete(false);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedWords((prev) => [...prev, words[currentIndex]]);
        currentIndex++;
      } else {
        setIsTypingComplete(true);
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [state, roastData]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
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
    setSelectedMood(null);
    setHoveredMood(null);
    setDisplayedWords([]);
    setIsTypingComplete(false);
  };

  const handleMoodClick = (index: number) => {
    setSelectedMood(index);
    quip("mood");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state === "loading") return;

    const trimmed = input.trim();
    if (trimmed.length < 3) {
      setValidationError("Even a humblebrag needs at least 3 characters.");
      return;
    }
    if (trimmed.length > 200) {
      setValidationError("Gratitude is finite. Keep it under 200 characters.");
      return;
    }

    setValidationError(null);
    setState("loading");
    setLoadingSeconds(0);
    setRoastData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

    try {
      const response = await fetch(`${apiUrl}/roast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ happy_thought: trimmed }),
        signal: controller.signal,
      });

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
        playBoom();
      }
    } catch {
      if (controller.signal.aborted) return;
      setState("error");
      setErrorMessage("The meditation timed out. Try again in a moment.");
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

      {/* Main Container */}
      <div className="w-full my-auto py-8 space-y-6 animate-fade-in">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight leading-snug font-normal">
            Take a deep breath. Reflect on the light in your life.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            What brought you genuine peace or pride today?
          </p>
        </header>

        {/* Input Form */}
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
                    <span className="text-neutral-500 font-medium">Gratitude is finite.</span>
                  ) : input.length >= 180 ? (
                    <span className="text-neutral-500 font-medium">A lot of words for very little.</span>
                  ) : null}
                </div>
                <span className="tabular-nums">{input.length}/200</span>
              </div>
            </div>

            {/* Interactive Witty Mood Emojis */}
            {state === "idle" && (
              <div className="space-y-1.5 pt-1" aria-label="Select mood">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Mood:</span>
                  {MOODS.map(({ emoji, label }, index) => {
                    const isSelected = selectedMood === index;
                    const isHovered = hoveredMood === index;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-label={`${label} mood`}
                        onMouseEnter={() => setHoveredMood(index)}
                        onMouseLeave={() => setHoveredMood(null)}
                        onClick={() => handleMoodClick(index)}
                        className={`text-base p-1.5 rounded-lg transition inline-flex items-center justify-center hover:bg-neutral-200/60 active:scale-95 ${
                          isSelected ? "bg-neutral-200/90 ring-1 ring-neutral-400" : isHovered ? "bg-neutral-100" : ""
                        }`}
                      >
                        <span role="img" aria-label={label}>{emoji}</span>
                      </button>
                    );
                  })}
                </div>
                {(hoveredMood !== null || selectedMood !== null) && (
                  <p className="text-xs text-neutral-600 font-mono tracking-tight animate-fade-in pl-0.5">
                    {MOODS[hoveredMood !== null ? hoveredMood : (selectedMood as number)].reaction}
                  </p>
                )}
              </div>
            )}

            {validationError && (
              <p id="validation-error" className="text-xs text-neutral-600 font-medium pt-1" role="alert">
                {validationError}
              </p>
            )}
          </div>

          {state === "idle" && (
            <Button
              id="destroy-my-ego-btn"
              type="submit"
              disabled={input.trim().length === 0}
              className="rounded-lg bg-[#1F1B16] text-[#FAF8F5] hover:bg-black/90 font-medium px-6 py-2.5 transition active:scale-[0.99]"
            >
              Destroy My Ego
            </Button>
          )}
        </form>

        {/* Cold-Start Progressive Loading State */}
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center animate-fade-in" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-700" aria-hidden="true" />
            <p className="text-sm font-mono text-neutral-600 tracking-tight animate-pulse">
              {getLoadingMessage(loadingSeconds)}
            </p>
          </div>
        )}

        {/* Polished Inline Reveal Card with Typewriter Animation */}
        {state === "reveal" && roastData && (
          <div
            id="roast-reveal-container"
            className="space-y-5 rounded-xl border border-border bg-white p-6 sm:p-7 shadow-sm animate-fade-in"
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

            <blockquote className="font-serif text-xl sm:text-2xl text-[#1F1B16] leading-snug tracking-tight border-l-2 border-[#1F1B16] pl-4 my-2 min-h-[3rem]">
              &ldquo;{displayedWords.join(" ")}&rdquo;
              {!isTypingComplete && <span className="inline-block w-1.5 h-5 bg-[#1F1B16] ml-1 animate-pulse align-middle" />}
            </blockquote>

            <div className={`transition-opacity duration-300 ${isTypingComplete ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <RoastActions
                roastId={roastData.id}
                roastText={roastData.text}
                bragText={roastData.brag || input}
                onReset={handleReset}
                onDownloadCard={handleDownloadCard}
                onShareX={handleShareX}
              />
            </div>
          </div>
        )}

        {/* Inline Gentle Crisis Intervention Card */}
        {state === "gentle" && roastData && (
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/80 p-5 animate-fade-in" aria-live="polite">
            <div className="flex items-center gap-2 text-neutral-800">
              <HeartHandshake className="h-4 w-4 text-neutral-600" />
              <span className="text-sm font-serif font-medium">A gentle moment</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {roastData.text}
            </p>
            {roastData.crisis_url && (
              <p className="text-xs text-neutral-700">
                Support is available 24/7:{" "}
                <a
                  href={roastData.crisis_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 font-medium hover:text-black"
                >
                  findahelpline.com
                </a>
              </p>
            )}
            <div className="pt-1">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Reflect again</span>
              </Button>
            </div>
          </div>
        )}

        {/* Inline Error State */}
        {state === "error" && (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4 animate-fade-in" aria-live="assertive">
            <p className="text-sm text-red-700">
              {errorMessage || "The universe is buffering. Try again in a moment."}
            </p>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
          </div>
        )}

        {/* Off-screen RoastCard for PNG Export */}
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
            <RoastCard brag={roastData.brag || input} roast={roastData.text} />
          </div>
        )}
      </div>
    </main>
  );
}