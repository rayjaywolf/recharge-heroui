import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Single-line date + time for dense table rows */
export function formatTableDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  })
}
