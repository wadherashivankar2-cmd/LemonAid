"use client";

import * as React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Volume2, VolumeX, Loader2, ArrowLeft, HeartHandshake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoastActions } from "@/components/RoastActions";
import { RoastCard } from "@/components/RoastCard";
import { setMuted, playTick, playBoom } from "@/lib/sound";
import { quip } from "@/lib/quips";
import { downloadCard, shareX, setCurrentShare } from "@/lib/share";
import { GoogleAuthTrap } from "@/components/GoogleAuthTrap";
import { ThemeToggle } from "@/components/Chrome";
import { SponsorCard } from "@/components/SponsorCard";

const GridPulse = dynamic(() => import("@/components/ui/grid-pulse"), { ssr: false });
const EvasiveGithub = dynamic(() => import("@/components/EvasiveGithub"), { ssr: false });

type AppState = "idle" | "loading" | "reveal" | "gentle" | "error";

interface RoastResponse {
  kind: "roast" | "gentle";
  text: string;
  roast?: string;
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

const LOADING_MESSAGES = [
  "Waking up the server from a coma...",
  "Analyzing your questionable life choices...",
  "Formulating maximum emotional damage...",
  "Consulting the elders of disrespect...",
  "Almost done cooking you...",
];

const getProgressMilestoneMessage = (progress: number) => {
  if (progress >= 100) return "Enlightenment achieved.";
  if (progress >= 75) return "Manifesting your reflection into reality...";
  if (progress >= 50) return "Consulting universal energy for maximum accuracy...";
  if (progress >= 25) return "Filtering out toxic optimism...";
  return "Calibrating emotional baseline...";
};

const COUNTER_QUIPS = {
  zero: [
    "Blank screen, blank mind.",
    "Type something or leave.",
    "Not even a single thought?",
  ],
  chars15: [
    "Already skimming.",
    "Wrap it up.",
    "Boring start, but continue.",
  ],
  chars50: [
    "The yap begins.",
    "Nobody asked for lore.",
    "Who is this for?",
  ],
  chars100: [
    "Midway through a whole novel.",
    "Are we venting now?",
    "Deep breaths. Less typing.",
  ],
  chars150: [
    "Unchecked yapping.",
    "Save some for your group chat.",
    "Almost at the ceiling.",
  ],
  max200: [
    "Hit the 200 cap. Hit Enter already.",
    "Maxed out. Cease typing.",
  ],
};

const CLIENT_FALLBACKS = [
  "Having an identity still isn't a substitute for having an actual personality.",
  "Announcing that to an algorithm is not the courageous flex you think it is.",
  "Even an artificial intelligence couldn't find anything interesting in that statement.",
  "Your desperate search for validation broke the model's capacity to care.",
  "Nobody is shocked, nobody is impressed, and nobody asked.",
];

export default function Home() {
  const [state, setState] = React.useState<AppState>("idle");
  const [input, setInput] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [loadingSeconds, setLoadingSeconds] = React.useState(0);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [roastData, setRoastData] = React.useState<RoastResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [warningPill, setWarningPill] = React.useState<string | null>(null);
  const [soundMuteAttempt, setSoundMuteAttempt] = React.useState(false);
  const [muteToast, setMuteToast] = React.useState<string | null>(null);
  const muteTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const muteToastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const soundAttemptCountRef = React.useRef(0);
  const [selectedMood, setSelectedMood] = React.useState<number | null>(null);
  const [hoveredMood, setHoveredMood] = React.useState<number | null>(null);
  const [isShaking, setIsShaking] = React.useState(false);
  const [zeroQuipIndex, setZeroQuipIndex] = React.useState(0);
  const [isMounted, setIsMounted] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setIsMounted(true);
    setZeroQuipIndex(Math.floor(Math.random() * COUNTER_QUIPS.zero.length));
  }, []);

  // Typewriter effect state
  const [wordCount, setWordCount] = React.useState(0);
  const [isTypingComplete, setIsTypingComplete] = React.useState(false);
  const [showSuggestionPopup, setShowSuggestionPopup] = React.useState(false);
  const [showPaywallModal, setShowPaywallModal] = React.useState(false);
  const [showCharityModal, setShowCharityModal] = React.useState(false);
  const [showProceedPrankModal, setShowProceedPrankModal] = React.useState(false);
  const [showCrateModal, setShowCrateModal] = React.useState(false);
  const [splashes, setSplashes] = React.useState<{ id: number; x: number; y: number }[]>([]);
  const splashCounter = React.useRef(0);
  const [hoverSplashActive, setHoverSplashActive] = React.useState(false);
  const isSubmittingRef = React.useRef(false);

  const words = React.useMemo(() => {
    if (!roastData?.text) return [];
    const cleanText = roastData.text.trim().replace(/^["'“”`]+|["'“”`]+$/g, "").trim();
    return cleanText ? cleanText.split(/\s+/) : [];
  }, [roastData?.text]);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleLemonClick = React.useCallback((e: React.MouseEvent) => {
    const id = ++splashCounter.current;
    setSplashes((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setSplashes((prev) => prev.filter((s) => s.id !== id)), 800);
  }, []);

  const handleLemonMouseEnter = React.useCallback(() => {
    setHoverSplashActive(true);
    setTimeout(() => setHoverSplashActive(false), 1000);
  }, []);

  // Initialize sound mute preference and wake backend (if external API URL provided)
  React.useEffect(() => {
    setMuted(false);
    if (process.env.NEXT_PUBLIC_API_URL) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
      fetch(`${apiUrl}/health`, { mode: "cors" }).catch(() => { });
    }
  }, []);

  // Progressive loading timer and animated milestone progress bar
  React.useEffect(() => {
    if (state !== "loading") {
      setLoadingSeconds(0);
      setLoadingProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setLoadingSeconds(Math.floor(elapsed / 1000));

      // Dynamically simulate progress up to 90-95% over ~8-12 seconds
      let p = 0;
      if (elapsed <= 10000) {
        p = Math.floor((elapsed / 10000) * 90);
      } else {
        p = Math.min(95, 90 + Math.floor((elapsed - 10000) / 2000));
      }
      setLoadingProgress(p);
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  const getLoadingMessage = (seconds: number) => {
    const index = Math.floor(seconds / 3) % LOADING_MESSAGES.length;
    return LOADING_MESSAGES[index];
  };

  const getInputLengthInsult = (len: number) => {
    if (len >= 200) {
      return COUNTER_QUIPS.max200[len % COUNTER_QUIPS.max200.length];
    }
    if (len >= 150) {
      return COUNTER_QUIPS.chars150[len % COUNTER_QUIPS.chars150.length];
    }
    if (len >= 100) {
      return COUNTER_QUIPS.chars100[len % COUNTER_QUIPS.chars100.length];
    }
    if (len >= 50) {
      return COUNTER_QUIPS.chars50[len % COUNTER_QUIPS.chars50.length];
    }
    if (len >= 15) {
      return COUNTER_QUIPS.chars15[len % COUNTER_QUIPS.chars15.length];
    }
    if (len > 0) {
      return COUNTER_QUIPS.chars15[len % COUNTER_QUIPS.chars15.length];
    }
    return COUNTER_QUIPS.zero[zeroQuipIndex % COUNTER_QUIPS.zero.length];
  };

  const currentQuip = isMounted ? getInputLengthInsult(input.length) : COUNTER_QUIPS.zero[0];

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

  const handleSoundToggleAttempt = () => {
    playTick();
    soundAttemptCountRef.current += 1;
    setSoundMuteAttempt(true);

    const replies = [
      "You can't mute the truth. Sound stays on.",
      "Silence is earned, not toggled.",
      "Nice try. Face the music.",
    ];

    let reply = replies[0];
    if (soundAttemptCountRef.current === 2) {
      reply = replies[1];
    } else if (soundAttemptCountRef.current > 2) {
      reply = replies[Math.floor(Math.random() * replies.length)];
    }
    setMuteToast(reply);

    if (muteTimeoutRef.current) clearTimeout(muteTimeoutRef.current);
    if (muteToastTimeoutRef.current) clearTimeout(muteToastTimeoutRef.current);

    muteTimeoutRef.current = setTimeout(() => {
      setSoundMuteAttempt(false);
    }, 200);

    muteToastTimeoutRef.current = setTimeout(() => {
      setMuteToast(null);
    }, 2500);
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
    if (val.length > 200) {
      val = val.slice(0, 200);
      setValidationError("Hit the 200 cap. Hit Enter already.");
    } else if (validationError) {
      setValidationError(null);
    }
    if (warningPill) {
      setWarningPill(null);
    }
    setInput(val);
    try {
      playTick();
    } catch {
      // AudioContext fallback
    }
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
    setWarningPill(null);
    setSelectedMood(null);
    setHoveredMood(null);
    setWordCount(0);
    setIsTypingComplete(false);
    setShowSuggestionPopup(false);
    setShowPaywallModal(false);
    setShowCharityModal(false);
    setShowProceedPrankModal(false);
    isSubmittingRef.current = false;
    setLoadingProgress(0);
    setZeroQuipIndex((prev) => (prev + 1) % COUNTER_QUIPS.zero.length);
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

  const handleOpenCrateModal = () => {
    setShowCrateModal(true);
  };

  const handleCloseCrateModal = () => {
    setShowCrateModal(false);
  };

  // Modal Body Scroll Lock & Esc Key Listener
  const isAnyModalOpen =
    showSuggestionPopup ||
    showPaywallModal ||
    showCharityModal ||
    showProceedPrankModal ||
    showCrateModal;

  React.useEffect(() => {
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCrateModal) {
          handleCloseCrateModal();
        } else if (showProceedPrankModal) {
          handleCloseProceedPrankModal();
        } else if (showSuggestionPopup) {
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
    showCrateModal,
    showProceedPrankModal,
    showSuggestionPopup,
    showPaywallModal,
    showCharityModal,
  ]);

  const isLoading = state === "loading";

  const handleRealSubmit = () => {
    if (isLoading || isSubmittingRef.current) return;
    handleSubmit();
  };

  const handleProceedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    playTick();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    const trollMsg = "Literally just press Enter.";
    setValidationError(trollMsg);
    quip(trollMsg, undefined, { duration: 5000 });
    setShowProceedPrankModal(true);
  };

  const handleCloseProceedPrankModal = () => {
    setShowProceedPrankModal(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state === "loading" || isSubmittingRef.current) return;

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
      setValidationError("Hit the 200 cap. Hit Enter already.");
      return;
    }

    isSubmittingRef.current = true;
    setValidationError(null);
    setWarningPill(null);
    setState("loading");
    setLoadingSeconds(0);
    setLoadingProgress(0);
    setRoastData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const roastEndpoint = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}/roast`
      : "/api/roast";

    try {
      const response = await fetch(roastEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ happy_thought: trimmed }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        let msg = "Our GPU cluster overheated roasting fragile egos. Cool down for 30 seconds and try again.";
        try {
          const errData = await response.json();
          if (errData?.message && typeof errData.message === "string") {
            msg = errData.message;
          } else if (errData?.detail && typeof errData.detail === "string") {
            msg = errData.detail;
          }
        } catch {
          // fallback to default msg
        }
        setState("idle");
        setLoadingSeconds(0);
        setLoadingProgress(0);
        setWarningPill(msg);
        return;
      }

      if (!response.ok) {
        const fallbackText = CLIENT_FALLBACKS[Math.floor(Math.random() * CLIENT_FALLBACKS.length)];
        const fallbackData: RoastResponse = {
          kind: "roast",
          text: fallbackText,
          roast: fallbackText,
          category: "dynamic_burn",
          brag: trimmed,
        };
        setRoastData(fallbackData);
        setLoadingProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 400));
        setState("reveal");
        playBoom();
        return;
      }

      const data: RoastResponse = await response.json();
      let roastText = data?.text || data?.roast || "";
      if (roastText) {
        roastText = roastText.trim().replace(/^["'“”`]+|["'“”`]+$/g, "").trim();
      }
      if (!roastText && data?.kind !== "gentle") {
        roastText = CLIENT_FALLBACKS[Math.floor(Math.random() * CLIENT_FALLBACKS.length)];
      }
      data.text = roastText;
      data.roast = roastText;
      setRoastData(data);

      // Snap loading progress to 100% on completion
      setLoadingProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 400));

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
      const fallbackText = CLIENT_FALLBACKS[Math.floor(Math.random() * CLIENT_FALLBACKS.length)];
      const fallbackData: RoastResponse = {
        kind: "roast",
        text: fallbackText,
        roast: fallbackText,
        category: "dynamic_burn",
        brag: trimmed,
      };
      setRoastData(fallbackData);
      setLoadingProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setState("reveal");
      playBoom();
    } finally {
      isSubmittingRef.current = false;
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
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-transparent text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Citrus splash ripples */}
      {splashes.map((s) => (
        <div
          key={s.id}
          aria-hidden="true"
          className="pointer-events-none fixed rounded-full w-[650px] h-[650px] bg-[radial-gradient(circle,rgba(250,204,21,0.45)_0%,rgba(245,158,11,0.25)_40%,transparent_75%)] animate-citrus-splash z-40"
          style={{ left: s.x, top: s.y }}
        />
      ))}
      {/* Fixed bottom-right floating crate — visible on reveal (hidden on mobile < 768px) */}
      {state === "reveal" && (
        <div className="hidden md:flex fixed bottom-48 right-6 sm:bottom-52 sm:right-8 z-30">
          <div
            id="crate-coming-soon-btn"
            role="button"
            tabIndex={0}
            className="relative group cursor-pointer"
            onClick={handleOpenCrateModal}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenCrateModal();
              }
            }}
          >
            <div className="p-3.5 rounded-2xl border border-neutral-700/60 bg-neutral-900/80 backdrop-blur-md hover:border-neutral-500 hover:bg-neutral-800/90 transition-all duration-300 shadow-xl flex flex-col items-center gap-1.5 text-center min-w-[130px]">
              <span className="text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                📦
              </span>
              
              <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                COMING SOON
              </span>

              <div className="space-y-0.5">
                <div className="text-[11px] font-mono font-bold tracking-wider text-neutral-200">
                  DO NOT OPEN
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  98% regret clicking
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 3D hover splash wave */}
      {hoverSplashActive && (
        <div
          key={String(hoverSplashActive)}
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center overflow-hidden animate-hover-splash-3d"
        >
          <div className="w-[120vmax] h-[120vmax] rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.32)_0%,rgba(245,158,11,0.18)_35%,transparent_70%)]" />
        </div>
      )}
      {/* 1-second lemon-yellow viewport flash on load */}
      <div className="fixed inset-0 pointer-events-none z-50 animate-yellow-flash" aria-hidden="true" />
      {/* Ambient citrus radial glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(250,204,21,0.18),rgba(10,10,10,0))]" aria-hidden="true" />
      {/* Top Right Header Controls */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
        <ThemeToggle />
        <GoogleAuthTrap />
        <div className="relative">
          <button
            id="sound-toggle-btn"
            onClick={handleSoundToggleAttempt}
            type="button"
            aria-label="Sound toggle"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm cursor-pointer select-none ${soundMuteAttempt ? "animate-shake border-neutral-400" : ""
              }`}
          >
            {soundMuteAttempt ? (
              <VolumeX className="h-3.5 w-3.5 text-neutral-500 shrink-0 transition-transform scale-95" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-neutral-800 dark:text-neutral-200 shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {soundMuteAttempt ? "Sound off" : "Sound on"}
            </span>

            {/* Switch indicator fixed in ON state, momentarily flicks to OFF */}
            <div
              className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-150 flex items-center ${soundMuteAttempt
                  ? "bg-neutral-300 dark:bg-neutral-700 justify-start"
                  : "bg-neutral-900 dark:bg-neutral-100 justify-end"
                }`}
            >
              <div
                className={`w-3 h-3 rounded-full shadow-xs transition-transform duration-150 ${soundMuteAttempt ? "bg-neutral-500" : "bg-white dark:bg-neutral-900"
                  }`}
              />
            </div>
          </button>

          {/* Temporary witty toast / popover beneath button */}
          {muteToast && (
            <div
              role="alert"
              className="absolute top-full right-0 mt-2 w-64 p-2.5 rounded-xl bg-neutral-900 text-white text-[11px] font-medium shadow-xl border border-neutral-800 text-center animate-fade-in z-50 pointer-events-none"
            >
              <div className="absolute -top-1 right-6 w-2 h-2 bg-neutral-900 border-t border-l border-neutral-800 rotate-45" />
              {muteToast}
            </div>
          )}
        </div>
      </div>

      {state !== "reveal" ? (
        /* Main Container for Idle / Loading / Gentle / Error */
        <div className="relative z-10 w-full max-w-xl mx-auto my-auto space-y-6 animate-fade-in bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-xl">
          <header className="space-y-2">
            <h1 className="group text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-2 select-none lemon-wobble transition-all duration-300 drop-shadow-xs hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] cursor-pointer">
              <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 group-hover:from-yellow-200 group-hover:to-lime-300 bg-clip-text text-transparent transition-all duration-300">
                LemonAid
              </span>{" "}
              <span
                className="inline-flex items-center animate-lemon-pop lemon-3d cursor-pointer"
                onClick={handleLemonClick}
                onMouseEnter={handleLemonMouseEnter}
                role="button"
                aria-label="Tap the lemon"
              >🍋</span>
            </h1>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight leading-snug font-normal">
              Take a deep breath. Reflect on the light in your life.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              What brought you genuine peace or pride today?
            </p>
            <p className="text-neutral-500 text-xs mb-4 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRealSubmit}
                disabled={input.trim().length === 0 || isLoading}
                title="Submit reflection"
                className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-300 text-neutral-700 shadow-xs cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                Enter
              </button>
              <span>your achievement or whatever.</span>
            </p>
          </header>

          {/* Input Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Styled amber/rose warning pill for 429 Rate Limits / Errors above the input area */}
            {warningPill && (
              <div
                id="rate-limit-warning-pill"
                role="alert"
                aria-live="polite"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="flex-1 leading-snug">{warningPill}</span>
                <button
                  id="dismiss-warning-pill-btn"
                  type="button"
                  onClick={() => setWarningPill(null)}
                  className="text-amber-700 dark:text-amber-300 hover:text-rose-500 p-0.5 rounded-full transition-colors cursor-pointer shrink-0"
                  aria-label="Dismiss warning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
                            className={`p-1 rounded-md transition-transform hover:scale-125 focus:outline-none cursor-pointer inline-flex items-center justify-center ${isSelected ? "bg-neutral-200/90 ring-1 ring-neutral-400" : ""
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
                      className={`text-xs text-neutral-600 font-mono tracking-tight transition-opacity duration-150 pl-0.5 ${hoveredMood !== null || selectedMood !== null ? "opacity-100" : "opacity-0"
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
                  placeholder="Today I felt grateful for..."
                  aria-label="What brought you genuine peace or pride today?"
                  className="w-full resize-none rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-4 text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="mt-1.5 flex justify-between items-center gap-2">
                  <span className="text-neutral-400 text-xs italic">{currentQuip}</span>
                  <span className="text-neutral-400 text-xs font-mono shrink-0">{input.length}/200</span>
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
                disabled={!input.trim() || isLoading}
                className="rounded-xl bg-[#2D2823] hover:bg-[#3D3630] text-[#FAF8F5] border border-[#433B33] font-medium px-6 py-2.5 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out select-none"
              >
                Proceed ✨
              </Button>
            )}
          </form>

          {/* Cold-Start Progressive Loading State */}
          {state === "loading" && (
            <div className="w-full py-4 text-center animate-fade-in" aria-live="polite">
              {/* Dynamic Milestone & Percentage Label above the bar */}
              <div className="flex items-center justify-between text-xs font-mono text-neutral-600 mb-1.5 px-0.5">
                <span className="font-medium tracking-tight">
                  {getProgressMilestoneMessage(loadingProgress)}
                </span>
                <span className="font-semibold text-neutral-700">{loadingProgress}%</span>
              </div>

              {/* Thick Yellow Loading Bar */}
              <div className="w-full h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden my-4 border border-neutral-300 dark:border-neutral-700">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              {/* Server Wakeup / Disrespect Quip */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-600" aria-hidden="true" />
                <span className="text-xs text-neutral-500 font-mono tracking-tight animate-pulse">
                  {getLoadingMessage(loadingSeconds)}
                </span>
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
        </div>
      ) : roastData ? (
        /* Permanent Zero-Overlap Flexbox Layout on Reveal */
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full max-w-7xl mx-auto my-auto py-8 animate-fade-in px-4">
          {/* Main Roast Card (Center Column on Desktop, First on Mobile) */}
          <div className="w-full max-w-xl order-1 lg:order-2">
            <div
              id="roast-reveal-container"
              className="space-y-5 rounded-xl bg-white dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 shadow-xl p-6 sm:p-7"
              aria-live="polite"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="group text-base font-black tracking-tight select-none lemon-wobble transition-all duration-300 cursor-pointer">
                    <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 group-hover:from-yellow-200 group-hover:to-lime-300 bg-clip-text text-transparent transition-all duration-300">
                      LemonAid
                    </span>{" "}
                    <span className="inline-block">🍋</span>
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
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-900 text-yellow-300 border border-yellow-400/30 hover:border-yellow-400 hover:bg-yellow-400/10 hover:scale-105 transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer select-none"
                    title="What did I do wrong?"
                  >
                    <span>🔍 What did I do wrong?</span>
                    <span className="text-[10px] text-yellow-400/70 font-normal">Spill the tea</span>
                  </a>
                </div>
              </div>

              <div className="relative my-2">
                <blockquote className="font-serif text-xl sm:text-2xl text-[#1F1B16] dark:text-neutral-100 leading-snug tracking-tight border-l-2 border-[#1F1B16] dark:border-neutral-200 pl-4 min-h-[3rem] pr-4">
                  {words.slice(0, wordCount).join(" ")}
                  {!isTypingComplete && <span className="inline-block w-1.5 h-5 bg-[#1F1B16] dark:bg-neutral-100 ml-1 animate-pulse align-middle" />}
                </blockquote>
              </div>

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

          {/* Sponsor Card (Positioned on the Left Flank on Desktop, Stacked Beneath Main Card on Mobile) */}
          <div className="w-full max-w-xl lg:w-72 shrink-0 order-2 lg:order-1 flex justify-center">
            <SponsorCard className="w-full" />
          </div>

          {/* Side Suggestions Widget (Right Column on Desktop, Stacked Beneath Sponsor Card on Mobile) */}
          <div className="w-full max-w-xl lg:w-64 shrink-0 order-3">
            <div className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-left shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base" role="img" aria-label="suggestion box">💡</span>
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Have a suggestion?</h4>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">Reviewed with zero care.</p>
              <button
                id="suggestions-widget-btn"
                type="button"
                onClick={handleSubmitFeedback}
                className="w-full py-2.5 px-3 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 border border-neutral-900 dark:border-neutral-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
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

      {/* Full-Screen Root Modal: Proceed Honeypot Prank Trap */}
      {showProceedPrankModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="proceed-prank-title"
          onClick={handleCloseProceedPrankModal}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[340px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="proceed-prank-title" className="text-xs font-semibold text-neutral-300 uppercase tracking-wider text-left">
                SERIOUSLY?
              </h3>
              <button
                type="button"
                onClick={handleCloseProceedPrankModal}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex justify-center">
              <Image
                src="/no_braincells.jpg"
                alt="Seriously?"
                width={150}
                height={150}
                className="max-h-44 w-auto object-contain mx-auto rounded-xl border border-neutral-700 bg-neutral-900 shadow-inner"
                priority
              />
            </div>

            <p className="text-sm font-medium text-neutral-200 my-2 leading-relaxed px-1">
              Are you blind? Can&apos;t you see &apos;Enter&apos;? Stop clicking buttons like an NPC.
            </p>

            <button
              id="proceed-prank-dismiss-btn"
              type="button"
              onClick={handleCloseProceedPrankModal}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl mt-4 border border-neutral-700/60 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
            >
              Fine, I&apos;ll hit Enter
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Root Modal: Industrial Crate Prank Trap */}
      {showCrateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="crate-prank-title"
          onClick={handleCloseCrateModal}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[350px] max-w-[90vw] rounded-2xl border-2 border-neutral-800 bg-[#14120E] p-5 text-[#FAF8F5] shadow-2xl animate-fade-in text-center"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="crate-prank-title" className="text-xs font-semibold text-neutral-300 uppercase tracking-wider text-left">
                EARLY ACCESS DENIED
              </h3>
              <button
                type="button"
                onClick={handleCloseCrateModal}
                className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex justify-center">
              <Image
                src="/wasnt_ready.jpg"
                alt="He wasn't ready"
                width={220}
                height={220}
                className="max-h-52 w-auto object-contain mx-auto rounded-xl border border-neutral-700 bg-neutral-900 shadow-inner"
                priority
              />
            </div>

            <div className="py-2 text-center space-y-1.5">
              <p className="text-sm font-semibold text-neutral-200">
                You saw a box stamped &ldquo;COMING SOON&rdquo; and still clicked it expecting secret DLC.
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                There is no roadmap. There is no feature drop. Just pure, unadulterated FOMO and zero impulse control.
              </p>
            </div>

            <button
              id="crate-prank-dismiss-btn"
              type="button"
              onClick={handleCloseCrateModal}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl mt-4 border border-neutral-700/60 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer text-center"
            >
              I Have Learned Nothing 📦
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

      {/* Dynamic Client-Only Components */}
      <GridPulse className="fixed inset-0 -z-10 pointer-events-none [mask-image:none] [--grid-pulse-line:rgb(255_255_255/0.12)]" />
      <EvasiveGithub />
    </main>
  );
}
