"use client";

import type { ReactNode } from "react";

/**
 * Kahoot-style shape+color coding for multiple-choice options. The overall
 * app stays red/white branded (buttons, headers) - only the answer tiles
 * themselves get this 4-color treatment, same as Kahoot does it, so the
 * options pop without fighting the rest of the UI.
 */
const PALETTE = [
  { base: "bg-rose-500", ring: "ring-rose-200", text: "text-white", shape: "triangle" },
  { base: "bg-sky-500", ring: "ring-sky-200", text: "text-white", shape: "diamond" },
  { base: "bg-amber-400", ring: "ring-amber-100", text: "text-amber-950", shape: "circle" },
  { base: "bg-emerald-500", ring: "ring-emerald-200", text: "text-white", shape: "square" },
] as const;

export function optionPalette(index: number) {
  return PALETTE[index % PALETTE.length];
}

function ShapeIcon({ shape, className }: { shape: string; className?: string }) {
  const props = { className, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;
  switch (shape) {
    case "triangle":
      return (
        <svg {...props}>
          <polygon points="12,3 22,20 2,20" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...props}>
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      );
    case "circle":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "square":
    default:
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
  }
}

export type OptionState = "idle" | "selected" | "dimmed";

/**
 * One answer tile. `state` drives the whole feedback loop: "idle" while
 * choosing, "selected" the instant it's clicked (and it stays that way
 * through submission and the wait for others - no abrupt swap to a plain
 * text message), "dimmed" applied to every other tile once a choice is
 * locked in, so the picked one visibly stands out the whole time.
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
  const p = optionPalette(index);
  const interactive = state === "idle" && !!onClick;

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={state === "selected"}
      className={`flex min-h-16 items-center gap-3 rounded-2xl p-4 text-left font-bold shadow-sm transition-all duration-150 ease-out sm:min-h-20 ${p.base} ${p.text} ${
        interactive ? "cursor-pointer active:scale-95" : "cursor-default"
      } ${state === "selected" ? "scale-[1.03] shadow-lg ring-4 ring-white" : ""} ${
        state === "dimmed" ? "opacity-35 saturate-50" : ""
      } ${className}`}
    >
      <ShapeIcon shape={p.shape} className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
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
