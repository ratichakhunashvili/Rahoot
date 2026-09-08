const SIZES = {
  sm: { icon: 22, text: "text-xl" },
  md: { icon: 28, text: "text-2xl" },
  lg: { icon: 36, text: "text-3xl" },
  xl: { icon: 56, text: "text-6xl" },
} as const;

/**
 * The Rahoot mark: a red rounded-square badge with a white bolt (speed /
 * live-answer scoring is the whole gimmick) plus the wordmark. Used
 * everywhere the app previously just rendered the word "Rahoot" as text.
 */
export function Logo({
  size = "md",
  withWordmark = true,
  className = "",
}: {
  size?: keyof typeof SIZES;
  withWordmark?: boolean;
  className?: string;
}) {
  const { icon, text } = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={icon} />
      {withWordmark && (
        <span className={`font-black tracking-tight text-rahoot-red ${text}`}>
          Rahoot
        </span>
      )}
    </span>
  );
}

const BOLT_PATH = "M17.7 4.5 8.3 17.4h6.4l-1.1 10.1L23.7 14.6h-6.4l0.4-10.1Z";

/**
 * `variant="badge"` (default) is the red-square-with-white-bolt mark, for use
 * on white/light backgrounds. `variant="bolt"` drops the square and renders
 * just the white bolt, for use directly on rahoot-red backgrounds - a badge
 * there would be the same color as the page behind it.
 */
export function LogoMark({
  size = 28,
  variant = "badge",
}: {
  size?: number;
  variant?: "badge" | "bolt";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {variant === "badge" && <rect width="32" height="32" rx="8" fill="#F97316" />}
      <path d={BOLT_PATH} fill="white" />
    </svg>
  );
}
