type UserAvatarProps = {
  image: string;
  alt: string;
  size?: number;
  className?: string;
};

/** Stored `user.image` from sign-up (boring-avatars beam SVG data URL). */
export function UserAvatar({
  image,
  alt,
  size = 28,
  className,
}: UserAvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL from DB
    <img
      src={image}
      alt={alt}
      width={size}
      height={size}
      className={className ?? "size-full object-cover"}
      decoding="async"
    />
  );
}
