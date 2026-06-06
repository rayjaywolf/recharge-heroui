import "dotenv/config";
import { eq } from "drizzle-orm";
import { createId, db, pool, user } from "@repo/db";
import {
  notifyDistributorRechargeSettled,
  notifyRetailerAccountApproved,
  notifyRetailerAccountRejected,
  notifyRetailerAccountRestored,
  notifyRetailerAccountSuspended,
  notifyRetailerDisputeResolved,
  notifyRetailerFundRequestApproved,
  notifyRetailerFundRequestRejected,
  notifyRetailerWalletCredited,
  notifyRetailerWalletDebited,
} from "@repo/server/notifications";

async function main() {
  const email = process.argv[2];

  const [retailer] = email
    ? await db.select().from(user).where(eq(user.email, email)).limit(1)
    : await db
        .select()
        .from(user)
        .where(eq(user.role, "RETAILER"))
        .limit(1);

  if (!retailer) {
    console.error(
      email
        ? `No retailer found with email ${email}.`
        : "No retailer found in the database.",
    );
    process.exit(1);
  }

  const fundRequestId = createId();
  const disputeId = createId();

  await notifyRetailerAccountApproved({ retailerId: retailer.id });
  await notifyRetailerAccountRejected({ retailerId: retailer.id });
  await notifyRetailerAccountSuspended({ retailerId: retailer.id });
  await notifyRetailerAccountRestored({ retailerId: retailer.id });
  await notifyRetailerFundRequestApproved({
    retailerId: retailer.id,
    fundRequestId,
    amount: 2000,
    approverName: "Demo Distributor",
  });
  await notifyRetailerFundRequestRejected({
    retailerId: retailer.id,
    fundRequestId: createId(),
    amount: 500,
    approverName: "Demo Distributor",
  });
  await notifyRetailerWalletCredited({
    retailerId: retailer.id,
    amount: 1500,
    transactionId: createId(),
    sourceLabel: "Demo Distributor",
  });
  await notifyRetailerWalletDebited({
    retailerId: retailer.id,
    amount: 200,
    transactionId: createId(),
  });
  await notifyRetailerDisputeResolved({
    retailerId: retailer.id,
    disputeId,
    subject: "Demo dispute — resolved by admin",
  });
  await notifyDistributorRechargeSettled({
    transactionId: createId(),
    operator: "JIO",
    amount: 199,
    targetPhone: "9876543210",
    actorName: retailer.name,
    actorRole: "RETAILER",
    userId: retailer.id,
    distributorId: retailer.distributorId,
    outcome: "SUCCESS",
  });
  await notifyDistributorRechargeSettled({
    transactionId: createId(),
    operator: "AIRTEL",
    amount: 99,
    targetPhone: "9876543211",
    actorName: retailer.name,
    actorRole: "RETAILER",
    userId: retailer.id,
    distributorId: retailer.distributorId,
    outcome: "FAILED",
  });
  await notifyDistributorRechargeSettled({
    transactionId: createId(),
    operator: "VI",
    amount: 149,
    targetPhone: "9876543212",
    actorName: retailer.name,
    actorRole: "RETAILER",
    userId: retailer.id,
    distributorId: retailer.distributorId,
    outcome: "REFUNDED",
  });

  console.log(
    `Seeded 12 retailer notification types for ${retailer.name} (${retailer.email}).`,
  );
  console.log("Open /retailer/notifications while logged in as this user.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
