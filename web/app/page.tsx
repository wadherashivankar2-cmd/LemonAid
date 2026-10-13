"use client";

import * as React from "react";
import Image from "next/image";
import { Volume2, VolumeX, Loader2, ArrowLeft, HeartHandshake, X } from "lucide-react";
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

const REPORT_DISMISS_OPTIONS = [
  "Cry about it",
  "I accept my insignificance",
  "Go touch grass",
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
  const [wordCount, setWordCount] = React.useState(0);
  const [isTypingComplete, setIsTypingComplete] = React.useState(false);
  const [showSuggestionPopup, setShowSuggestionPopup] = React.useState(false);
  const [showEgoTrollPopup, setShowEgoTrollPopup] = React.useState(false);
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [reportDismissIndex, setReportDismissIndex] = React.useState(0);
  const [showPaywallModal, setShowPaywallModal] = React.useState(false);
  const [showCharityModal, setShowCharityModal] = React.useState(false);

  const words = React.useMemo(() => {
    return roastData?.text ? roastData.text.trim().split(/\s+/) : [];
  }, [roastData?.text]);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Initialize sound mute preference and wake backend (pre-warm Render container)
  React.useEffect(() => {
    setMutedState(isMuted());
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mr-roast-api.onrender.com";
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

  const getInputLengthInsult = (len: number) => {
    if (len < 3) return "Not even your delusions can be summarized in 2 letters. Type something.";
    if (len <= 19) return "Barely a sentence. Did your battery die or your brain?";
    if (len <= 39) return "Starting to yap. Keep going if you think anyone cares.";
    if (len <= 49) return "A whole paragraph of self-pity incoming.";
    if (len <= 74) return "Writing your memoirs already? Nobody's buying the book.";
    if (len <= 99) return "Careful, you're burning precious calories typing this essay.";
    if (len <= 119) return "Triple digits on the character count. The delusion is real.";
    if (len <= 149) return "Wrap it up Shakespeare, this is a roast box not your diary.";
    if (len <= 174) return "Almost hit the limit. Your coping mechanisms know no bounds.";
    if (len <= 199) return "Running out of room. Condense your mediocrity.";
    return "200/200 maxed out. Congratulations on wasting all available space.";
  };

  // Word-by-word typewriter effect on reveal
  React.useEffect(() => {
    if (state !== "reveal" || words.length === 0) {
      setWordCount(0);
      setIsTypingComplete(false);
      return;
    }

    setWordCount(1);
    setIsTypingComplete(words.length <= 1);

    let count = 1;
    const interval = setInterval(() => {
      count++;
      setWordCount(count);
      if (count >= words.length) {
        setIsTypingComplete(true);
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [state, words]);

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
    setWordCount(0);
    setIsTypingComplete(false);
    setShowSuggestionPopup(false);
    setShowEgoTrollPopup(false);
    setShowReportModal(false);
    setShowPaywallModal(false);
    setShowCharityModal(false);
  };

  const handleMoodClick = (index: number) => {
    setSelectedMood(index);
    quip("mood");
  };

  const handleTrollEgoClick = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    quip("trollEgo");
    setShowEgoTrollPopup(true);
  };

  const handleSubmitFeedback = () => {
    quip("suggestions");
    setShowSuggestionPopup(true);
  };

  const handleCloseSuggestionPopup = () => {
    setShowSuggestionPopup(false);
    quip("closeSuggestion");
  };

  const handleOpenReportModal = () => {
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportDismissIndex((prev) => (prev + 1) % REPORT_DISMISS_OPTIONS.length);
    quip("reportDismiss");
  };

  const handleOpenPaywallModal = () => {
    setShowPaywallModal(true);
  };

  const handleClosePaywallModal = () => {
    setShowPaywallModal(false);
    quip("paywallDismiss");
  };

  const handleOpenCharityModal = () => {
    setShowCharityModal(true);
  };

  const handleCloseCharityModal = () => {
    setShowCharityModal(false);
    quip("charityDismiss");
  };

  // Modal Body Scroll Lock & Esc Key Listener
  const isAnyModalOpen =
    showSuggestionPopup ||
    showEgoTrollPopup ||
    showReportModal ||
    showPaywallModal ||
    showCharityModal;

  React.useEffect(() => {
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSuggestionPopup) {
          handleCloseSuggestionPopup();
        } else if (showEgoTrollPopup) {
          setShowEgoTrollPopup(false);
        } else if (showReportModal) {
          handleCloseReportModal();
        } else if (showPaywallModal) {
          handleClosePaywallModal();
        } else if (showCharityModal) {
          handleCloseCharityModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow || "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isAnyModalOpen,
    showSuggestionPopup,
    showEgoTrollPopup,
    showReportModal,
    showPaywallModal,
    showCharityModal,
  ]);

  const handleCamouflagedEnter = () => {
    if (state === "loading") return;
    const trimmed = input.trim();
    if (trimmed.length < 3) {
      quip("camouflagedEnter");
      setValidationError("Even a humblebrag needs at least 3 characters.");
    } else {
      handleSubmit();
    }
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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mr-roast-api.onrender.com";

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
      shareX(roastData.text);
    }
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-4 min-h-screen flex flex-col justify-between py-12 selection:bg-neutral-200">
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

      {state !== "reveal" ? (
        /* Main Container for Idle / Loading / Gentle / Error */
        <div className="w-full max-w-xl mx-auto my-auto py-8 space-y-6 animate-fade-in">
          <header className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight leading-snug font-normal">
              Take a deep breath. Reflect on the light in your life.
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              What brought you genuine peace or pride today?
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <button
                type="button"
                disabled={state === "loading"}
                onClick={handleCamouflagedEnter}
                className="text-muted-foreground font-normal p-0 m-0 bg-transparent border-0 outline-none focus:outline-none cursor-pointer inline select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enter
              </button>{" "}
              your achievement or whatever.
            </p>
          </header>

          {/* Input Form */}
          <form onSubmit={handleTrollEgoClick} className="space-y-4">
            <div className="space-y-3">
              {/* Interactive Witty Mood Emojis Above Textarea */}
              {state === "idle" && (
                <div className="flex flex-col items-start gap-1 my-2" aria-label="Select mood">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Mood:</span>
                    <div className="flex items-center gap-1.5">
                      {MOODS.map(({ emoji, label }, index) => {
                        const isSelected = selectedMood === index;
                        return (
                          <button
                            key={label}
                            type="button"
                            aria-label={`${label} mood`}
                            onMouseEnter={() => setHoveredMood(index)}
                            onMouseLeave={() => setHoveredMood(null)}
                            onClick={() => handleMoodClick(index)}
                            className={`p-1 rounded-md transition-transform hover:scale-125 focus:outline-none cursor-pointer inline-flex items-center justify-center ${
                              isSelected ? "bg-neutral-200/90 ring-1 ring-neutral-400" : ""
                            }`}
                          >
                            <span role="img" aria-label={label} className="text-base select-none">
                              {emoji}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RESERVED HEIGHT CONTAINER: Prevents vertical layout jumping and infinite flutter loop */}
                  <div className="h-5 flex items-center">
                    <p
                      className={`text-xs text-neutral-600 font-mono tracking-tight transition-opacity duration-150 pl-0.5 ${
                        hoveredMood !== null || selectedMood !== null ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {hoveredMood !== null
                        ? MOODS[hoveredMood].reaction
                        : selectedMood !== null
                        ? MOODS[selectedMood].reaction
                        : ""}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <textarea
                  id="gratitude-entry"
                  rows={4}
                  maxLength={200}
                  value={input}
                  disabled={state === "loading"}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCamouflagedEnter();
                    }
                  }}
                  placeholder="Today I felt grateful for..."
                  aria-label="What brought you genuine peace or pride today?"
                  className="w-full resize-none rounded-xl border border-border bg-white p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition shadow-sm disabled:opacity-90 disabled:bg-neutral-50"
                />
                <div className="mt-1.5 flex justify-between items-start gap-2 text-xs text-muted-foreground">
                  <p className="text-neutral-500 font-medium text-xs leading-tight transition-opacity duration-150">
                    {getInputLengthInsult(input.length)}
                  </p>
                  <span className="tabular-nums shrink-0">{input.length}/200</span>
                </div>
              </div>

              {validationError && (
                <p id="validation-error" className="text-xs text-neutral-600 font-medium pt-1" role="alert">
                  {validationError}
                </p>
              )}
            </div>

            {state === "idle" && (
              <Button
                id="destroy-my-ego-btn"
                type="button"
                onClick={handleTrollEgoClick}
                disabled={input.trim().length === 0}
                className="rounded-lg bg-[#1F1B16] text-[#FAF8F5] hover:bg-black/90 font-medium px-6 py-2.5 transition active:scale-[0.99] cursor-pointer"
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
        </div>
      ) : roastData ? (
        /* Permanent Zero-Overlap Flexbox Layout on Reveal */
        <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-5xl mx-auto my-auto py-8 animate-fade-in">
          {/* Main Roast Card (Left / Main Column) */}
          <div className="w-full max-w-xl">
            <div
              id="roast-reveal-container"
              className="space-y-5 rounded-xl border border-border bg-white p-6 sm:p-7 shadow-sm"
              aria-live="polite"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
                  The Burn
                </span>
                <span className="text-xs text-muted-foreground font-serif italic">
                  Nobody asked, but here we are.
                </span>
              </div>

              <blockquote className="font-serif text-xl sm:text-2xl text-[#1F1B16] leading-snug tracking-tight border-l-2 border-[#1F1B16] pl-4 my-2 min-h-[3rem]">
                &ldquo;{words.slice(0, wordCount).join(" ")}&rdquo;
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
                  onReport={handleOpenReportModal}
                  onPaywall={handleOpenPaywallModal}
                  onCharity={handleOpenCharityModal}
                />
              </div>
            </div>
          </div>

          {/* Side Suggestions Widget (Right Column) */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-[#14120E] border border-neutral-800 rounded-xl p-4 text-left shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base" role="img" aria-label="suggestion box">💡</span>
                <h4 className="text-sm font-semibold text-neutral-200">Have a suggestion?</h4>
              </div>
              <p className="text-xs text-neutral-400 mb-4">Reviewed with zero care.</p>
              <button
                id="suggestions-widget-btn"
                type="button"
                onClick={handleSubmitFeedback}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-white text-black hover:bg-neutral-200 active:scale-95 transition-colors cursor-pointer text-center"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {/* Full-Screen Root Modal: Hamster Meme Suggestion Troll */}
      {showSuggestionPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggestion-modal-title"
          onClick={handleCloseSuggestionPopup}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[280px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-4 text-[#FAF8F5] shadow-2xl animate-fade-in"
          >
            <div className="flex items-start justify-between gap-2">
              <p id="suggestion-modal-title" className="text-xs font-semibold text-neutral-200 leading-snug">
                Bold of you to assume anyone cares about your suggestion.
              </p>
              <button
                type="button"
                onClick={handleCloseSuggestionPopup}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex justify-center">
              <Image
                src="/Hamster_meme.jpg"
                alt="Judging hamster meme"
                width={128}
                height={128}
                className="w-32 h-32 object-contain mx-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-inner"
                priority
              />
            </div>

            <button
              type="button"
              onClick={handleCloseSuggestionPopup}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 active:scale-95 transition-all bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer text-center"
            >
              Okay whatever
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Root Modal: Destroy My Ego Honeypot */}
      {showEgoTrollPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ego-modal-title"
          onClick={() => setShowEgoTrollPopup(false)}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[320px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="ego-modal-title" className="text-xs font-semibold text-neutral-200 leading-snug text-left">
                Can&apos;t you see &apos;Enter&apos; right in front of you? Are you blind?
              </h3>
              <button
                type="button"
                onClick={() => setShowEgoTrollPopup(false)}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex justify-center">
              <Image
                src="/no_braincells.jpg"
                alt="No Braincells"
                width={160}
                height={160}
                className="mx-auto rounded-lg object-contain border border-neutral-700 bg-neutral-900"
                priority
              />
            </div>

            <button
              type="button"
              onClick={() => setShowEgoTrollPopup(false)}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 active:scale-95 transition-all bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer text-center"
            >
              I will learn to read
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Root Modal: Troll Report with Meow.jpg */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          onClick={handleCloseReportModal}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[300px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-4 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="report-modal-title" className="text-xs font-semibold text-neutral-200 leading-snug text-left">
                Reporting this? Cry to the authorities.
              </h3>
              <button
                type="button"
                onClick={handleCloseReportModal}
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
              onClick={handleCloseReportModal}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 active:scale-95 transition-all bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer text-center"
            >
              {REPORT_DISMISS_OPTIONS[reportDismissIndex]}
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Root Modal: Pay $4.99 to Erase Paywall Honeypot with mewing-hamster.jpg */}
      {showPaywallModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-modal-title"
          onClick={handleClosePaywallModal}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[350px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="paywall-modal-title" className="text-sm font-semibold text-neutral-200 leading-snug text-left">
                Card Declined: Insufficient Humility.
              </h3>
              <button
                type="button"
                onClick={handleClosePaywallModal}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-2 flex justify-center">
              <Image
                src="/mewing-hamster.jpg"
                alt="Mewing hamster"
                width={144}
                height={144}
                className="w-36 h-36 object-contain mx-auto rounded-xl my-2 border border-neutral-800 bg-neutral-900 shadow-inner"
                priority
              />
            </div>

            <div className="my-3 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-left">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Your bank blocked this charge under suspicion of pure desperation. You can&apos;t bribe your way out of reality with $4.99. This roast has already been filed into the permanent record.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClosePaywallModal}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 active:scale-95 transition-all bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer text-center"
            >
              Take my dignity, keep the change
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Root Modal: Fake Charity Honeypot with hamster-reaction.jpg */}
      {showCharityModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="charity-modal-title"
          onClick={handleCloseCharityModal}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[350px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="charity-modal-title" className="text-sm font-semibold text-neutral-200 leading-snug text-left">
                Charity? You&apos;re the one that needs saving.
              </h3>
              <button
                type="button"
                onClick={handleCloseCharityModal}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-2 flex justify-center">
              <Image
                src="/hamster-reaction.jpg"
                alt="Hamster reaction"
                width={144}
                height={144}
                className="w-36 h-36 object-contain mx-auto rounded-xl my-2 border border-neutral-800 bg-neutral-900 shadow-inner"
                priority
              />
            </div>

            <div className="my-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-left">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Nice deflection. Did you really think a fake donation would cleanse your soul after getting incinerated? Save your money, invest in some thicker skin, and learn to take an L in silence.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCloseCharityModal}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 active:scale-95 transition-all bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer text-center"
            >
              I will hold this L in silence
            </button>
          </div>
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
    </main>
  );
}