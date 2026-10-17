"use client";

import * as React from "react";

interface SocialLink {
  name: string;
  url: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const SOCIALS: SocialLink[] = [
  {
    name: "GitHub",
    url: "https://github.com/wadherashivankar2-cmd/LemonAid",
    icon: ({ className = "w-4 h-4" }) => (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
  {
    name: "Twitter / X",
    url: "https://x.com/Shivankar_w",
    icon: ({ className = "w-4 h-4" }) => (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/shivankar-wadhera-564480321/",
    icon: ({ className = "w-4 h-4" }) => (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
  },
];

const ROASTS_TIER_1 = [
  "Jerry: 1. You: 0.",
  "Nice try, Tom.",
  "Too slow.",
];

const ROASTS_TIER_2 = [
  "Bro thinks he's fast.",
  "Rent-free in your cursor.",
  "Your reflexes need therapy.",
];

const ROASTS_TIER_3 = [
  "Do you have a job?",
  "This is getting embarrassing for you.",
  "Touch grass instead.",
];

const SURRENDER_ROAST = "Fine, you win. Click before I change my mind.";

export function EvasiveGithub() {
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [dodgeCount, setDodgeCount] = React.useState(0);
  const [roastMessage, setRoastMessage] = React.useState<string>("");
  const [isExhausted, setIsExhausted] = React.useState(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [mobileTapCount, setMobileTapCount] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inactivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const exhaustionTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const recoveryTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Minimum screen padding (top padding increased to 48px to accommodate the floating roast bubble)
  const paddingX = 24;
  const paddingTop = 48;
  const paddingBottom = 28;

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (exhaustionTimerRef.current) clearTimeout(exhaustionTimerRef.current);
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, []);

  // Check for touch capability (pointer: coarse or touch events)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const checkTouch = () => {
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const hasTouchPoints = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
      const hasTouchEvents = "ontouchstart" in window;
      setIsTouchDevice(Boolean(hasCoarsePointer || (hasTouchPoints && hasTouchEvents)));
    };

    checkTouch();

    const mql = window.matchMedia("(pointer: coarse)");
    if (mql?.addEventListener) {
      mql.addEventListener("change", checkTouch);
      return () => mql.removeEventListener("change", checkTouch);
    }
  }, []);

  // Initialize and keep inside viewport on mount & window resize
  React.useEffect(() => {
    const clampToSafeBounds = () => {
      if (typeof window === "undefined") return;
      const el = containerRef.current;
      const width = el ? el.offsetWidth : 144;
      const height = el ? el.offsetHeight : 44;

      const mobileMode =
        isTouchDevice ||
        window.matchMedia("(pointer: coarse)").matches ||
        window.innerWidth < 768;

      if (mobileMode) {
        // Strictly anchor to bottom corners: bottom-4 right-4 or bottom-4 left-4
        // Always strictly below top 60% of viewport
        const padX = 16;
        const padBottom = 16;
        const minX = padX;
        const maxX = Math.max(padX, window.innerWidth - width - padX);
        const bottomY = Math.max(window.innerHeight * 0.6, window.innerHeight - height - padBottom);

        setPosition((prev) => {
          if (!prev) {
            // Default initial location: bottom-4 right-4
            return { x: maxX, y: bottomY };
          }
          // Maintain strictly anchored to bottom corners
          const isLeft = prev.x < window.innerWidth / 2;
          return {
            x: isLeft ? minX : maxX,
            y: bottomY,
          };
        });
        return;
      }

      const minX = paddingX;
      const maxX = Math.max(paddingX, window.innerWidth - width - paddingX);
      const minY = paddingTop;
      const maxY = Math.max(paddingTop, window.innerHeight - height - paddingBottom);

      setPosition((prev) => {
        if (!prev) {
          // Default initial location: bottom-right corner
          return {
            x: maxX,
            y: maxY,
          };
        }
        return {
          x: Math.min(maxX, Math.max(minX, prev.x)),
          y: Math.min(maxY, Math.max(minY, prev.y)),
        };
      });
    };

    clampToSafeBounds();
    window.addEventListener("resize", clampToSafeBounds);
    return () => window.removeEventListener("resize", clampToSafeBounds);
  }, [isTouchDevice]);

  const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  // Single-hop evasion to a safe viewport quadrant on mobile touch
  const hopToSafeQuadrant = () => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    const width = el ? el.offsetWidth : 144;
    const height = el ? el.offsetHeight : 44;

    const mobileMode =
      isTouchDevice ||
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth < 768;

    if (mobileMode) {
      // On mobile/touch devices: anchor strictly to bottom corners (bottom-4 right-4 and bottom-4 left-4).
      // Prevent it from ever hopping into the top 60% of the screen.
      const padX = 16;
      const padBottom = 16;
      const minX = padX;
      const maxX = Math.max(padX, window.innerWidth - width - padX);
      const bottomY = Math.max(window.innerHeight * 0.6, window.innerHeight - height - padBottom);

      const midX = window.innerWidth / 2;
      const curX = position ? position.x : maxX;

      // Hop strictly between bottom-right and bottom-left corner
      const targetX = curX >= midX ? minX : maxX;
      setPosition({ x: targetX, y: bottomY });
      return;
    }

    const minX = paddingX;
    const maxX = Math.max(paddingX, window.innerWidth - width - paddingX);
    const minY = paddingTop;
    const maxY = Math.max(paddingTop, window.innerHeight - height - paddingBottom);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const curX = position ? position.x : maxX;
    const curY = position ? position.y : maxY;
    const curIsLeft = curX < midX;
    const curIsTop = curY < midY;

    // Define the 4 safe corner quadrants
    const quadrants = [
      { name: "top-left", x: minX, y: minY, isLeft: true, isTop: true },
      { name: "top-right", x: maxX, y: minY, isLeft: false, isTop: true },
      { name: "bottom-left", x: minX, y: maxY, isLeft: true, isTop: false },
      { name: "bottom-right", x: maxX, y: maxY, isLeft: false, isTop: false },
    ];

    // Pick a quadrant different from the current one to hop away cleanly
    const alternativeQuadrants = quadrants.filter(
      (q) => !(q.isLeft === curIsLeft && q.isTop === curIsTop)
    );

    const targetQuadrant =
      alternativeQuadrants[Math.floor(Math.random() * alternativeQuadrants.length)] ||
      quadrants[0];

    setPosition({ x: targetQuadrant.x, y: targetQuadrant.y });
  };

  // Touch device handler: does NOT hijack default window scrolling
  const handleTouchStart = () => {
    if (typeof window === "undefined") return;

    // If already exhausted, do not evade; let user tap links immediately
    if (isExhausted) return;

    // Reset inactivity and recovery timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (exhaustionTimerRef.current) clearTimeout(exhaustionTimerRef.current);
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);

    const nextTaps = mobileTapCount + 1;
    setMobileTapCount(nextTaps);

    if (nextTaps >= 2) {
      // Caught after 2 taps: stop evading and unlock links so mobile users aren't locked out!
      setIsExhausted(true);
      setRoastMessage("Caught on mobile!");

      exhaustionTimerRef.current = setTimeout(() => {
        setIsExhausted(false);
        setMobileTapCount(0);
        setRoastMessage("");
      }, 6000);
      return;
    }

    // 1st tap: hop strictly between the bottom corners and display subtle hint
    hopToSafeQuadrant();
    setRoastMessage("Caught on mobile!");

    // Reset tap count after 4.5s of inactivity
    inactivityTimerRef.current = setTimeout(() => {
      setMobileTapCount(0);
      setRoastMessage("");
    }, 4500);
  };

  const handleEvade = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    // On touch devices or mobile viewports (< 768px), evasion is handled exclusively by onTouchStart to prevent stuttering
    const mobileMode =
      isTouchDevice ||
      (typeof window !== "undefined" &&
        (window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches));

    if (mobileMode || isExhausted || !containerRef.current || typeof window === "undefined") {
      return;
    }

    // Reset inactivity and recovery timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
    }

    const nextCount = dodgeCount + 1;
    setDodgeCount(nextCount);

    // Pick contextual witty micro-roast
    let nextRoast = "";
    if (nextCount >= 12) {
      nextRoast = SURRENDER_ROAST;
      setIsExhausted(true);

      // Start 4-second exhaustion countdown
      if (exhaustionTimerRef.current) {
        clearTimeout(exhaustionTimerRef.current);
      }
      exhaustionTimerRef.current = setTimeout(() => {
        setIsExhausted(false);
        setDodgeCount(0);
        setRoastMessage("Here we go again...");

        if (recoveryTimerRef.current) {
          clearTimeout(recoveryTimerRef.current);
        }
        recoveryTimerRef.current = setTimeout(() => {
          setRoastMessage((current) => (current === "Here we go again..." ? "" : current));
        }, 2000);
      }, 4000);
    } else if (nextCount >= 8) {
      nextRoast = getRandomItem(ROASTS_TIER_3);
    } else if (nextCount >= 4) {
      nextRoast = getRandomItem(ROASTS_TIER_2);
    } else {
      nextRoast = getRandomItem(ROASTS_TIER_1);
    }

    setRoastMessage(nextRoast);

    // If not surrendered, set 3.5s inactivity cooldown to reset chase
    if (nextCount < 12) {
      inactivityTimerRef.current = setTimeout(() => {
        setDodgeCount(0);
        setRoastMessage("");
      }, 3500);
    }

    // Perform evasion jump
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Strict boundary limits
    const minX = paddingX;
    const maxX = Math.max(paddingX, window.innerWidth - width - paddingX);
    const minY = paddingTop;
    const maxY = Math.max(paddingTop, window.innerHeight - height - paddingBottom);

    // Dock center coordinates
    const centerX = rect.left + width / 2;
    const centerY = rect.top + height / 2;

    // Deflection vector directly away from incoming pointer
    let dirX = centerX - e.clientX;
    let dirY = centerY - e.clientY;
    const dist = Math.hypot(dirX, dirY) || 1;
    dirX /= dist;
    dirY /= dist;

    // Angular jitter for natural evasive movement
    const jitter = (Math.random() - 0.5) * (Math.PI * 0.4);
    const cosJ = Math.cos(jitter);
    const sinJ = Math.sin(jitter);
    const rotDirX = dirX * cosJ - dirY * sinJ;
    const rotDirY = dirX * sinJ + dirY * cosJ;

    // Jump distance (140px - 240px)
    const jumpDistance = 140 + Math.random() * 100;

    let targetX = rect.left + rotDirX * jumpDistance;
    let targetY = rect.top + rotDirY * jumpDistance;

    // Inward bounce reflection if approaching borders
    if (targetX < minX || targetX > maxX) {
      const safeWidth = maxX - minX;
      targetX = minX + safeWidth * (0.2 + Math.random() * 0.6);
    }
    if (targetY < minY || targetY > maxY) {
      const safeHeight = maxY - minY;
      targetY = minY + safeHeight * (0.2 + Math.random() * 0.6);
    }

    // Absolute strict clamping: guaranteed to remain strictly in viewport
    const clampedX = Math.min(maxX, Math.max(minX, targetX));
    const clampedY = Math.min(maxY, Math.max(minY, targetY));

    setPosition({ x: clampedX, y: clampedY });
  };

  // Visual exhaustion styling progression
  let moodClasses = "border-neutral-800/90 shadow-2xl shadow-black/70";
  let toastClasses = "bg-neutral-900/90 text-neutral-300 border-neutral-800";

  if (isExhausted) {
    moodClasses = "border-emerald-500/80 shadow-emerald-500/25 shadow-xl ring-2 ring-emerald-500/60 opacity-95 animate-pulse";
    toastClasses = "bg-emerald-950/95 text-emerald-200 border-emerald-500/80 font-semibold shadow-emerald-950/50";
  } else if (roastMessage === "Caught on mobile!") {
    moodClasses = "border-amber-500/80 shadow-amber-500/20 shadow-lg ring-1 ring-amber-500/40";
    toastClasses = "bg-amber-950/95 text-amber-200 border-amber-600/70 font-semibold shadow-amber-950/40";
  } else if (roastMessage === "Here we go again...") {
    moodClasses = "border-cyan-500/70 shadow-cyan-500/20 shadow-lg ring-1 ring-cyan-500/40";
    toastClasses = "bg-neutral-900/95 text-cyan-300 border-cyan-500/70 font-medium shadow-cyan-950/40";
  } else if (dodgeCount >= 8) {
    moodClasses = "border-rose-500 shadow-rose-500/30 shadow-xl ring-2 ring-rose-500/60 animate-pulse";
    toastClasses = "bg-rose-950/90 text-rose-200 border-rose-600/80 font-medium";
  } else if (dodgeCount >= 4) {
    moodClasses = "border-amber-500/80 shadow-amber-500/20 shadow-lg ring-1 ring-amber-500/40 animate-pulse";
    toastClasses = "bg-amber-950/90 text-amber-200 border-amber-600/70 font-medium";
  }

  return (
    <div
      ref={containerRef}
      onPointerEnter={isTouchDevice ? undefined : handleEvade}
      onPointerOver={isTouchDevice ? undefined : handleEvade}
      onTouchStart={isTouchDevice ? handleTouchStart : undefined}
      className={`fixed left-0 top-0 z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-neutral-900/85 hover:bg-neutral-900/95 text-neutral-400 border backdrop-blur-md select-none transition-all duration-300 touch-manipulation ${moodClasses}`}
      style={{
        transform: position
          ? `translate3d(${position.x}px, ${position.y}px, 0)`
          : `translate3d(calc(100vw - 100% - 16px), calc(100vh - 100% - 16px), 0)`,
        transition: isExhausted
          ? "transform 0.2s ease-out, border-color 0.3s ease, box-shadow 0.3s ease"
          : "transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease",
        willChange: "transform",
      }}
      role="region"
      aria-label="Creator Social Links"
    >
      {/* Floating Sarcastic Toast Bubble Above Capsule */}
      {roastMessage && (
        <div
          className={`absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] border shadow-lg backdrop-blur-md pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95 ${toastClasses}`}
          role="status"
          aria-live="polite"
        >
          {roastMessage}
        </div>
      )}

      {SOCIALS.map((social) => {
        const Icon = social.icon;
        return (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={social.name}
            aria-label={social.name}
            className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-400/80 focus:ring-offset-1 focus:ring-offset-neutral-950 active:scale-95"
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}
