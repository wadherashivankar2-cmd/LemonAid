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
import { GoogleAuthTrap } from "@/components/GoogleAuthTrap";

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
  { emoji: "😆", label: "Ecstatic", reaction: "Laughing through the pain won't fix your hairline or your life." },
  { emoji: "🙂", label: "Happy", reaction: "That fake smile is a desperate cry for psychiatric intervention." },
  { emoji: "😐", label: "Neutral", reaction: "Numb and dead inside. Just like your personality." },
  { emoji: "😟", label: "Anxious", reaction: "Anxious? Good. You should be, looking at where your life is heading." },
  { emoji: "😳", label: "Embarrassed", reaction: "Embarrassed? You should be ashamed of your entire existence." },
];

const URL_REGEX = /(https?:\/\/|www\.|\.[a-z]{2,}(\/|\s|$))/i;


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
  const [isShaking, setIsShaking] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Typewriter effect state
  const [wordCount, setWordCount] = React.useState(0);
  const [isTypingComplete, setIsTypingComplete] = React.useState(false);
  const [showSuggestionPopup, setShowSuggestionPopup] = React.useState(false);
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
    if (len >= 200) return "200 characters maxed. Stop typing and click proceed.";
    if (len >= 160) return "Pure unadulterated yapping. Almost at the cap.";
    if (len >= 120) return "Are you drafting an autobiography? Wrap it up.";
    if (len >= 80) return "Nobody is reading all this yapping.";
    if (len >= 40) return "Look at you typing whole sentences. Who cares?";
    if (len >= 15) return "Already boring. Get to the point.";
    if (len === 0) return "Not even your delusions can fit in 0 characters. Type something.";
    return "Already boring. Get to the point.";
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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    playTick();
    const insult = "Type it out yourself, you lazy parasite. We don't accept copied delusions.";
    setValidationError(insult);
    quip(insult, undefined, { duration: 5000 });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    const delta = val.length - input.length;
    // Fallback guard: reject sudden chunk insertions without normal keystroke cadence (>20 chars)
    // Allows mobile autocorrect, virtual keyboard suggestions, and swipe gestures
    if (delta > 20) {
      playTick();
      const insult = "Type it out yourself, you lazy parasite. We don't accept copied delusions.";
      setValidationError(insult);
      quip(insult, undefined, { duration: 5000 });
      e.target.value = input;
      return;
    }
    if (val.length > 200) {
      val = val.slice(0, 200);
      setInput(val);
      setValidationError("200 characters maxed. Stop typing and click proceed.");
      return;
    }

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
    setSelectedMood(null);
    setHoveredMood(null);
    setWordCount(0);
    setIsTypingComplete(false);
    setShowSuggestionPopup(false);
    setShowPaywallModal(false);
    setShowCharityModal(false);
    setIsShaking(false);
  };

  const handleMoodClick = (index: number) => {
    setSelectedMood(index);
    quip("mood");
  };

  const handleSubmitFeedback = () => {
    quip("suggestions");
    setShowSuggestionPopup(true);
  };

  const handleCloseSuggestionPopup = () => {
    setShowSuggestionPopup(false);
    quip("closeSuggestion");
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
    showPaywallModal,
    showCharityModal,
  ]);

  const handleCamouflagedEnter = () => {
    if (state === "loading") return;
    const trimmed = input.trim();
    if (URL_REGEX.test(trimmed)) {
      playTick();
      setValidationError("Nice try. We don't read your links or debug your profiles. Use your words.");
      quip("urlBlock", undefined, { duration: 5000 });
      return;
    }
    if (trimmed.length < 3) {
      quip("camouflagedEnter");
      setValidationError("Even a humblebrag needs at least 3 characters.");
    } else {
      handleSubmit();
    }
  };

  const handleProceedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    playTick();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    const trollMsg = "Nice try. Hit 'Enter' on your keyboard like a normal human.";
    setValidationError(trollMsg);
    quip(trollMsg, undefined, { duration: 5000 });
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state === "loading") return;

    const trimmed = input.trim();
    if (URL_REGEX.test(trimmed)) {
      playTick();
      setValidationError("Nice try. We don't read your links or debug your profiles. Use your words.");
      quip("urlBlock", undefined, { duration: 5000 });
      return;
    }
    if (trimmed.length < 3) {
      setValidationError("Even a humblebrag needs at least 3 characters.");
      return;
    }
    if (trimmed.length > 200) {
      setValidationError("200 characters maxed. Stop typing and click proceed.");
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
        let msg = "Rate limit exceeded. Your desperation is exhausting our servers. Wait a minute before asking for another burn.";
        try {
          const errData = await response.json();
          if (errData?.detail && typeof errData.detail === "string") {
            msg = errData.detail;
          }
        } catch {
          // fallback to default msg
        }
        setState("error");
        setErrorMessage(msg);
        return;
      }

      if (!response.ok) {
        let msg = "The universe is buffering. Try again in a moment.";
        try {
          const errData = await response.json();
          if (errData?.detail && typeof errData.detail === "string") {
            msg = errData.detail;
          }
        } catch {
          // fallback to default msg
        }
        setState("error");
        setErrorMessage(msg);
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
    <main className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-4 sm:p-6 text-neutral-900 font-sans">
      {/* Top Right Header Controls */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
        <GoogleAuthTrap />
        <button
          id="sound-toggle-btn"
          onClick={toggleSound}
          type="button"
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm cursor-pointer select-none"
        >
          {muted ? (
            <>
              <VolumeX className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-200 shrink-0" aria-hidden="true" />
              <span className="text-neutral-700 dark:text-neutral-200">Sound off</span>
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-200 shrink-0" aria-hidden="true" />
              <span className="text-neutral-700 dark:text-neutral-200">Sound on</span>
            </>
          )}
        </button>
      </div>

      {state !== "reveal" ? (
        /* Main Container for Idle / Loading / Gentle / Error */
        <div className="w-full max-w-xl mx-auto my-auto py-8 space-y-6 animate-fade-in">
          <header className="space-y-2">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-rose-600 dark:text-rose-500 drop-shadow-sm mb-2 select-none">
              LoveBite
            </h1>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight leading-snug font-normal">
              Take a deep breath. Reflect on the light in your life.
            </h2>
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
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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

              <div className={`relative transition-transform ${isShaking ? "animate-shake" : ""}`}>
                <textarea
                  ref={textareaRef}
                  id="gratitude-entry"
                  rows={4}
                  value={input}
                  maxLength={200}
                  disabled={state === "loading"}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  onDrop={(e) => {
                    e.preventDefault();
                    playTick();
                    const insult = "Type it out yourself, you lazy parasite. We don't accept copied delusions.";
                    setValidationError(insult);
                    quip(insult, undefined, { duration: 5000 });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
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
                  <span className="tabular-nums shrink-0">{input.length}/200 characters</span>
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
                id="proceed-btn"
                type="button"
                onClick={handleProceedClick}
                disabled={input.trim().length === 0}
                className="rounded-xl bg-[#2D2823] hover:bg-[#3D3630] text-[#FAF8F5] border border-[#433B33] font-medium px-6 py-2.5 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out select-none"
              >
                Proceed &rarr;
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
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black tracking-tight text-rose-600 dark:text-rose-500 select-none">
                    LoveBite
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
                    The Burn
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    id="roast-header-know-more"
                    href="https://youtu.be/Aq5WXmQQooo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors inline-flex items-center gap-1 cursor-pointer select-none"
                    title="How this works"
                  >
                    <span>Know More</span>
                    <span className="text-xs">ℹ️</span>
                  </a>
                  <span className="text-xs text-muted-foreground font-serif italic hidden sm:inline">
                    Nobody asked, but here we are.
                  </span>
                </div>
              </div>

              <blockquote className="font-serif text-xl sm:text-2xl text-[#1F1B16] leading-snug tracking-tight border-l-2 border-[#1F1B16] pl-4 my-2 min-h-[3rem]">
                &ldquo;{words.slice(0, wordCount).join(" ")}&rdquo;
                {!isTypingComplete && <span className="inline-block w-1.5 h-5 bg-[#1F1B16] ml-1 animate-pulse align-middle" />}
              </blockquote>

              <div className="transition-opacity duration-300 opacity-100">
                <RoastActions
                  roastId={roastData.id}
                  roastText={roastData.text}
                  bragText={roastData.brag || input}
                  onReset={handleReset}
                  onDownloadCard={handleDownloadCard}
                  onShareX={handleShareX}
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
                className="w-full py-2.5 px-3 text-xs font-semibold rounded-lg bg-white text-black hover:bg-neutral-200 border border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
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
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 border border-neutral-700/60 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
            >
              Okay whatever
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
                Your bank blocked this charge under suspicion of pure desperation. You can&apos;t bribe your way out of reality with ₹499. This roast has already been filed into the permanent record.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClosePaywallModal}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 border border-neutral-700/60 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
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
                Moral Laundering: Denied.
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
                You can&apos;t bribe karma to undo emotional damage. Keep your money—you need it more than they do.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCloseCharityModal}
              className="w-full py-3 px-5 text-sm font-semibold rounded-xl mt-4 border border-neutral-700/60 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
            >
              I will suffer for free
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