import { config } from "dotenv";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, asc, sql } from "drizzle-orm";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
for (const envPath of [
  join(repoRoot, "apps/api/.env"),
  join(repoRoot, "apps/web/.env.local"),
  join(repoRoot, ".env"),
]) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    if (process.env.DATABASE_URL) break;
  }
}

async function main() {
  console.log("Starting backfill of opening and closing balances...");
  const { db, transaction, user } = await import("../src/index");
  
  // 1. Get all users
  const allUsers = await db.select({ id: user.id, balance: user.balance }).from(user);
  console.log(`Found ${allUsers.length} users to process.`);
  
  for (const u of allUsers) {
    // 2. Fetch all transactions for this user, ordered by createdAt asc
    const txs = await db
      .select()
      .from(transaction)
      .where(eq(transaction.userId, u.id))
      .orderBy(asc(transaction.createdAt));
      
    if (txs.length === 0) continue;
    
    console.log(`Processing ${txs.length} transactions for user: ${u.id}...`);
    
    await db.transaction(async (dbTx) => {
      let currentBalance = u.balance;
      const txsDesc = [...txs].reverse();
      const updatesList: Array<{ id: string; opening: number; closing: number }> = [];
      
      for (const txRow of txsDesc) {
        const amount = txRow.amount;
        const isCredit = txRow.operator === "MANUAL_CREDIT" || txRow.operator === "FUNDS_RECEIVED";
        const isRefunded = txRow.status === "FAILED" || txRow.status === "REFUNDED";
        const isDebit = txRow.operator === "MANUAL_DEBIT" || txRow.operator === "FUNDS_SENT" || (!isCredit && !isRefunded);
        
        let opening = currentBalance;
        let closing = currentBalance;
        
        if (isRefunded) {
          opening = currentBalance;
          closing = currentBalance;
        } else if (isCredit) {
          opening = currentBalance - amount;
          closing = currentBalance;
          currentBalance = opening;
        } else if (isDebit) {
          opening = currentBalance + amount;
          closing = currentBalance;
          currentBalance = opening;
        }
        
        updatesList.push({ id: txRow.id, opening, closing });
      }

      if (updatesList.length > 0) {
        const valueStrings = updatesList.map(
          (item) => `('${item.id}', ${item.opening}, ${item.closing})`
        );
        const query = `
          UPDATE "transaction" AS t
          SET
            "openingBalance" = v.opening,
            "closingBalance" = v.closing
          FROM (VALUES
            ${valueStrings.join(",\n")}
          ) AS v(id, opening, closing)
          WHERE t.id = v.id;
        `;
        await dbTx.execute(sql.raw(query));
      }
      
      console.log(`Finished user ${u.id}. Reconstructed initial balance: ${currentBalance}`);
    });
  }
  
  console.log("Backfill completed successfully!");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
