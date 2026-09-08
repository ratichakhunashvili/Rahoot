import Image from "next/image";

/**
 * The Rahoot mark: the owl-with-tablet artwork with "Rahoot" baked into the
 * image (public/brand/onsite-logo.png, 1:1, background removed so it sits
 * directly on the page). One image, used everywhere - sized per context
 * via `size`.
 */
export function Logo({
  size = 96,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/onsite-logo.png"
      alt="Rahoot"
      width={size}
      height={size}
      priority={priority}
      className={`inline-block ${className}`}
    />
  );
}
