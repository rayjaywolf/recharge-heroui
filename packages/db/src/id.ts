import { createId as cuid } from "@paralleldrive/cuid2";

export function createId() {
  return cuid();
}

export function createNumericId(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${timestamp}${random}`;
}
