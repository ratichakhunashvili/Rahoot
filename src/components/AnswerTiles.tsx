"use client";

import type { ReactNode } from "react";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type OptionState = "idle" | "selected" | "dimmed";

/**
 * One answer tile: black surface with an orange outline while choosing,
 * turning fully solid orange (with a bouncy pop animation) the instant
 * it's picked - `state` drives it. "selected" stays applied through
 * submission and the wait for others, so the choice keeps reading clearly
 * rather than being replaced by a plain text message. "dimmed" fades every
 * other tile once a choice is locked in.
 */
export function OptionTile({
  index,
  children,
  state = "idle",
  onClick,
  className = "",
}: {
  index: number;
  children: ReactNode;
  state?: OptionState;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = state === "idle" && !!onClick;
  const letter = LETTERS[index % LETTERS.length];

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={state === "selected"}
      className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition-all duration-150 ease-out sm:min-h-20 ${
        state === "selected"
          ? "border-rahoot-red bg-rahoot-red text-[#1a1005] shadow-lg"
          : "border-rahoot-red bg-black text-rahoot-red"
      } ${interactive ? "cursor-pointer hover:bg-rahoot-red-light active:scale-95" : "cursor-default"} ${
        state === "dimmed" ? "opacity-30" : ""
      } ${state === "selected" ? "tile-pop" : ""} ${className}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs sm:h-8 sm:w-8 ${
          state === "selected" ? "border-[#1a1005] text-[#1a1005]" : "border-rahoot-red text-rahoot-red"
        }`}
      >
        {letter}
      </span>
      <span className="flex-1 text-sm leading-snug sm:text-base">{children}</span>
      {state === "selected" && (
        <span className="shrink-0 text-xl leading-none" aria-hidden>
          ✓
        </span>
      )}
    </button>
  );
}

/** Always 2 columns, even on mobile - answer tiles read fine at that width and it keeps the 2x2 layout for the common 4-option case on every screen size. */
export function OptionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
