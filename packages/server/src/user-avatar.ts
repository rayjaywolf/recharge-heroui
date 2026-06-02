import boring from "boring-avatars-vanilla";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db, user } from "@repo/db";

/** Matches web header: `boring-avatars` variant `beam`. */
const AVATAR_VARIANT = "beam" as const;
const AVATAR_SIZE = 80;

/** Default boring-avatars palette (same as the React library). */
const AVATAR_COLORS = [
  "#92A1C6",
  "#146A7C",
  "#F0AB3D",
  "#C271B4",
  "#C20D90",
];

function buildAvatarSvg(name: string): string {
  const seed = name.trim() || "User";
  return boring({
    name: seed,
    variant: AVATAR_VARIANT,
    size: AVATAR_SIZE,
    colors: AVATAR_COLORS,
  });
}

/** Deterministic PNG avatar stored in `user.image` (data URL). */
export async function buildUserAvatarDataUrl(name: string): Promise<string> {
  const svg = buildAvatarSvg(name);
  const png = await sharp(Buffer.from(svg))
    .resize(AVATAR_SIZE, AVATAR_SIZE)
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function assignUserAvatar(
  userId: string,
  name: string,
): Promise<string> {
  const image = await buildUserAvatarDataUrl(name);
  await db.update(user).set({ image }).where(eq(user.id, userId));
  return image;
}

function isPngDataUrl(image: string): boolean {
  return image.startsWith("data:image/png;base64,");
}

function isExternalImageUrl(image: string): boolean {
  return image.startsWith("http://") || image.startsWith("https://");
}

/** Broken or dev-only URLs that must not be returned to clients (e.g. Flutter on device). */
export function shouldRegenerateStoredAvatar(image: string): boolean {
  if (isPngDataUrl(image)) return false;
  if (image.startsWith("data:image/svg+xml")) return true;
  if (image.includes("/api/avatars/")) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(image)) {
    return true;
  }
  return !isExternalImageUrl(image);
}

function isTrustedExternalAvatar(image: string): boolean {
  return isExternalImageUrl(image) && !shouldRegenerateStoredAvatar(image);
}

/** Backfill when `image` is missing or not a portable PNG / OAuth URL. */
export async function ensureUserAvatar(
  userId: string,
  name: string,
  image: string | null | undefined,
): Promise<string> {
  const trimmed = image?.trim();
  if (trimmed && isPngDataUrl(trimmed)) {
    return trimmed;
  }
  if (trimmed && isTrustedExternalAvatar(trimmed)) {
    return trimmed;
  }
  return assignUserAvatar(userId, name);
}
