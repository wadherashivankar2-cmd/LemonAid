"use client";

import * as React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-amber-400 selection:text-neutral-950 relative overflow-hidden font-sans">
      {/* Subtle Atmospheric Backdrop Gradients */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(245,158,11,0.08),rgba(0,0,0,0))]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(14,165,233,0.05),rgba(0,0,0,0))]"
        aria-hidden="true"
      />

      {/* Header with LemonAid Branding */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between z-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-amber-400/60 rounded-lg p-1 transition-transform active:scale-95"
          aria-label="LemonAid Home"
        >
          <span className="text-2xl transition-transform group-hover:rotate-12 duration-200">
            🍋
          </span>
          <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-white group-hover:text-amber-300 transition-colors">
            LemonAid
          </span>
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm text-xs font-mono text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>ROUTE_NULL_EXCEPTION</span>
        </div>
      </header>

      {/* Main Two-Column Stage */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 sm:py-16 my-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Typography & Action */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6 text-left">
            {/* Small tracking pre-title */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono uppercase tracking-[0.22em] font-semibold">
              <span>ERROR 404</span>
              <span>•</span>
              <span>LOST SERENITY</span>
            </div>

            {/* Large Serif Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-normal tracking-tight leading-[1.12]">
              This route lost its momentum.
            </h1>

            {/* Witty Satirical Body Copy */}
            <p className="text-base sm:text-lg text-neutral-400 max-w-xl leading-relaxed">
              You navigated into the digital ether with unearned confidence, expecting enlightenment or a working endpoint. Instead, the page has dissolved into thin air, taking whatever fragile sense of direction you had with it. No amount of positive affirmation will render this URL.
            </p>

            {/* Pill 'Back to Home' Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-medium bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-950 font-sans"
              >
                <span>Back to Home</span>
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/changelog"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium border border-neutral-800 hover:border-neutral-700 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-all active:scale-[0.98]"
              >
                View Changelog
              </Link>
            </div>
          </div>

          {/* Right Column: Newton's Cradle Animated Artwork */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center pt-4 lg:pt-0">
            <div className="relative w-full max-w-[380px] p-8 rounded-3xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md shadow-2xl flex flex-col items-center">
              {/* Cradle Top Suspension Bar */}
              <div className="relative w-[280px] h-3 bg-gradient-to-r from-neutral-700 via-neutral-500 to-neutral-700 rounded-full shadow-md flex items-center justify-between px-6 z-20">
                <div className="w-2 h-2 rounded-full bg-neutral-950 border border-neutral-600" />
                <div className="w-2 h-2 rounded-full bg-neutral-950 border border-neutral-600" />
                <div className="w-2 h-2 rounded-full bg-neutral-950 border border-neutral-600" />
                <div className="w-2 h-2 rounded-full bg-neutral-950 border border-neutral-600" />
                <div className="w-2 h-2 rounded-full bg-neutral-950 border border-neutral-600" />
              </div>

              {/* Newton's Cradle Pendulums Container */}
              <div className="relative flex items-start justify-center h-[200px] w-[260px] pt-0">
                {/* Ball 1 (Leftmost): Swings left via animate-cradle-left */}
                <div className="w-12 flex flex-col items-center origin-top animate-cradle-left">
                  {/* Monofilament String */}
                  <div className="w-[1.5px] h-36 bg-gradient-to-b from-neutral-400 via-neutral-500 to-amber-300/80" />
                  {/* Sphere: Warm Citrus Gold Glow */}
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_10px_25px_-4px_rgba(245,158,11,0.5),inset_-3px_-3px_6px_rgba(180,83,9,0.8),inset_3px_3px_6px_rgba(254,243,199,0.8)] relative flex items-center justify-center"
                    title="Citrus Kinetic Ball 1"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/70 absolute top-2 left-2 blur-[0.5px]" />
                  </div>
                </div>

                {/* Ball 2: Static Middle Citrus */}
                <div className="w-12 flex flex-col items-center origin-top">
                  <div className="w-[1.5px] h-36 bg-gradient-to-b from-neutral-400 via-neutral-500 to-yellow-300/80" />
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 via-yellow-300 to-amber-500 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.35),inset_-3px_-3px_6px_rgba(180,83,9,0.6),inset_3px_3px_6px_rgba(255,255,255,0.7)] relative flex items-center justify-center"
                    title="Citrus Kinetic Ball 2"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/70 absolute top-2 left-2 blur-[0.5px]" />
                  </div>
                </div>

                {/* Ball 3: Static Center Silver Nexus */}
                <div className="w-12 flex flex-col items-center origin-top">
                  <div className="w-[1.5px] h-36 bg-gradient-to-b from-neutral-400 via-neutral-500 to-neutral-300/80" />
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-100 via-neutral-300 to-neutral-500 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),inset_-3px_-3px_6px_rgba(64,64,64,0.6),inset_3px_3px_6px_rgba(255,255,255,0.8)] relative flex items-center justify-center"
                    title="Chrome Nexus Ball 3"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/70 absolute top-2 left-2 blur-[0.5px]" />
                  </div>
                </div>

                {/* Ball 4: Static Sky Azure */}
                <div className="w-12 flex flex-col items-center origin-top">
                  <div className="w-[1.5px] h-36 bg-gradient-to-b from-neutral-400 via-neutral-500 to-sky-300/80" />
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 via-sky-300 to-sky-500 shadow-[0_8px_20px_-4px_rgba(14,165,233,0.35),inset_-3px_-3px_6px_rgba(3,105,161,0.6),inset_3px_3px_6px_rgba(255,255,255,0.7)] relative flex items-center justify-center"
                    title="Sky Kinetic Ball 4"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/70 absolute top-2 left-2 blur-[0.5px]" />
                  </div>
                </div>

                {/* Ball 5 (Rightmost): Swings right via animate-cradle-right */}
                <div className="w-12 flex flex-col items-center origin-top animate-cradle-right">
                  <div className="w-[1.5px] h-36 bg-gradient-to-b from-neutral-400 via-neutral-500 to-sky-300/80" />
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-200 via-sky-400 to-blue-600 shadow-[0_10px_25px_-4px_rgba(14,165,233,0.5),inset_-3px_-3px_6px_rgba(29,78,216,0.8),inset_3px_3px_6px_rgba(224,242,254,0.8)] relative flex items-center justify-center"
                    title="Sky Kinetic Ball 5"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/70 absolute top-2 left-2 blur-[0.5px]" />
                  </div>
                </div>
              </div>

              {/* Pedestal Base with Ground Reflection */}
              <div className="w-[240px] h-2 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 rounded-full mt-3 shadow-inner opacity-60" />
              <div className="text-[11px] font-mono text-neutral-500 tracking-wider uppercase mt-4">
                Conservation of Cynicism • 0J Dissipated
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-neutral-500 font-mono z-10 border-t border-neutral-900">
        LemonAid • Omniscient Satirical Engineering • No routes were harmed in the making of this error.
      </footer>
    </div>
  );
}
