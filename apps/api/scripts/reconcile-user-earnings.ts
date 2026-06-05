import "dotenv/config";
import { db, pool } from "@repo/db";
import { computeUserEarningsMap, reconcileUserEarnings } from "@repo/server/user-earnings";

async function main() {
  const before = await computeUserEarningsMap(db);
  const { updated } = await reconcileUserEarnings(db);
  const after = await computeUserEarningsMap(db);

  console.log(`Reconciled earnings for ${updated} users.`);
  console.log("Sample computed totals:");
  for (const [userId, earnings] of before) {
    if (earnings !== 0) {
      console.log(`  ${userId}: ${earnings.toFixed(2)}`);
    }
  }
  console.log("Post-reconcile matches:", before.size === after.size);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
