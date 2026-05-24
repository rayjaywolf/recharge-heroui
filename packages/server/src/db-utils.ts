import { sql } from "drizzle-orm";
import { user } from "@repo/db";

export function incrementBalance(amount: number) {
  return { balance: sql`${user.balance} + ${amount}` };
}

export function decrementBalance(amount: number) {
  return { balance: sql`${user.balance} - ${amount}` };
}
