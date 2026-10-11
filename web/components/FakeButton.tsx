"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { quip } from "@/lib/quips";

export interface FakeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  quipKey: string;
  busy?: string;
  run?: () => Promise<Record<string, string | number> | void>;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "burn";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FakeButton({
  id,
  quipKey,
  children,
  className,
  busy = "Submitting...",
  run,
  variant = "outline",
  size = "default",
  disabled,
  onClick,
  ...props
}: FakeButtonProps) {
  const [isBusy, setIsBusy] = React.useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
    if (isBusy || disabled) return;

    setIsBusy(true);

    // Random fake delay between 500ms and 850ms
    const delayMs = 500 + Math.floor(Math.random() * 350);
    const delayPromise = new Promise((resolve) => setTimeout(resolve, delayMs));

    let runResult: Record<string, string | number> | void = undefined;
    try {
      if (run) {
        const [res] = await Promise.all([run(), delayPromise]);
        runResult = res;
      } else {
        await delayPromise;
      }
    } catch {
      // Swallowed silently
    } finally {
      setIsBusy(false);
      quip(quipKey, runResult || undefined);
    }
  };

  return (
    <Button
      id={id}
      variant={variant}
      size={size}
      className={className}
      disabled={isBusy || disabled}
      onClick={handleClick}
      {...props}
    >
      {isBusy ? busy : children}
    </Button>
  );
}
