import * as React from "react";

interface RoastCardProps {
  brag?: string;
  reflection?: string;
  roast: string;
  className?: string;
}

export function RoastCard({ brag, reflection, roast, className = "" }: RoastCardProps) {
  const userReflection = (reflection ?? brag ?? "").trim();

  return (
    <div
      id="roast-card"
      className={`w-full max-w-[540px] overflow-hidden rounded-xl border border-neutral-300 shadow-md ${className}`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      {/* Top Half: What made me happy */}
      <div
        className="p-6 sm:p-8 border-b border-neutral-200"
        style={{ backgroundColor: "#FAF8F5", color: "#1F1B16" }}
      >
        <span
          className="text-xs font-semibold tracking-wider uppercase text-neutral-500 block mb-2"
          style={{ fontFamily: "var(--font-sans), sans-serif" }}
        >
          What made me happy
        </span>
        <p
          className="text-lg sm:text-xl italic leading-relaxed"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {`“${userReflection}”`}
        </p>
      </div>

      {/* Bottom Half: The Burn */}
      <div
        className="p-6 sm:p-8 relative"
        style={{ backgroundColor: "#000000", color: "#FFFFFF" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-bold tracking-wider uppercase"
            style={{ color: "#C62828" }}
          >
            OFFICIAL CERTIFICATE OF MEDIOCRE EXISTENCE
          </span>
          <span className="text-[11px] text-neutral-400 font-serif italic">
            Nobody asked, but here we are.
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-bold leading-snug pr-12 pb-6">
          {roast}
        </p>

        {/* Watermark Bottom Right */}
        <div className="absolute bottom-4 right-5 text-[11px] font-medium tracking-wide text-neutral-500">
          lemon-aid-app.vercel.app
        </div>
      </div>
    </div>
  );
}
