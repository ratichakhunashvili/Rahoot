import Image from "next/image";

/**
 * The Rahoot mark: the owl-with-tablet artwork with "Rahoot" baked into the
 * image (public/brand/onsite-logo.jpeg, 1:1). One image, used everywhere -
 * sized per context via `size`.
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
      src="/brand/onsite-logo.jpeg"
      alt="Rahoot"
      width={size}
      height={size}
      priority={priority}
      className={`inline-block rounded-xl ${className}`}
    />
  );
}
