type UserAvatarProps = {
  image?: string | null;
  alt: string;
  size?: number;
  className?: string;
};

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stored `user.image` from sign-up (boring-avatars beam PNG data URL). */
export function UserAvatar({
  image,
  alt,
  size = 28,
  className,
}: UserAvatarProps) {
  const trimmed = image?.trim();

  if (trimmed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL from DB
      <img
        src={trimmed}
        alt={alt}
        width={size}
        height={size}
        className={className ?? "size-full object-cover"}
        decoding="async"
      />
    );
  }

  const fontSize = Math.max(10, Math.round(size * 0.36));

  return (
    <span
      aria-hidden
      className={
        className ??
        "flex size-full items-center justify-center bg-content2 font-semibold uppercase text-muted"
      }
      style={{ fontSize }}
    >
      {nameInitials(alt)}
    </span>
  );
}
