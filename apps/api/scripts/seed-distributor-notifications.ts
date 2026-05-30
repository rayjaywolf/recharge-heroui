import "dotenv/config";
import { eq } from "drizzle-orm";
import { createId, db, pool, user } from "@repo/db";
import {
  notifyDistributorDisputePending,
  notifyDistributorDisputeResolved,
  notifyDistributorFundRequestPending,
  notifyDistributorRechargeSettled,
  notifyDistributorRetailerApproved,
  notifyDistributorRetailerRejected,
  notifyDistributorRetailerRestored,
  notifyDistributorRetailerSuspended,
  notifyDistributorWalletCredited,
  notifyDistributorWalletDebited,
} from "@repo/server/notifications";

async function main() {
  const email = process.argv[2];

  const [distributor] = email
    ? await db.select().from(user).where(eq(user.email, email)).limit(1)
    : await db
        .select()
        .from(user)
        .where(eq(user.role, "DISTRIBUTOR"))
        .limit(1);

  if (!distributor) {
    console.error(
      email
        ? `No distributor found with email ${email}.`
        : "No distributor found in the database.",
    );
    process.exit(1);
  }

  const retailerId = createId();
  const disputeId = createId();
  const fundRequestId = createId();

  await notifyDistributorRetailerApproved({
    distributorId: distributor.id,
    retailerId,
    retailerName: "Demo Approved Retailer",
  });
  await notifyDistributorRetailerRejected({
    distributorId: distributor.id,
    retailerId: createId(),
    retailerName: "Demo Rejected Retailer",
  });
  await notifyDistributorRetailerSuspended({
    distributorId: distributor.id,
    retailerId: createId(),
    retailerName: "Demo Suspended Retailer",
  });
  await notifyDistributorRetailerRestored({
    distributorId: distributor.id,
    retailerId: createId(),
    retailerName: "Demo Restored Retailer",
  });
  await notifyDistributorDisputePending({
    distributorId: distributor.id,
    disputeId,
    subject: "Demo dispute — wrong recharge amount",
    retailerName: "Demo Retailer",
  });
  await notifyDistributorDisputeResolved({
    distributorId: distributor.id,
    disputeId: createId(),
    subject: "Demo dispute — resolved by admin",
  });
  await notifyDistributorFundRequestPending({
    distributorId: distributor.id,
    fundRequestId,
    retailerName: "Demo Retailer",
    amount: 1500,
  });
  await notifyDistributorWalletCredited({
    distributorId: distributor.id,
    amount: 5000,
    transactionId: createId(),
  });
  await notifyDistributorWalletDebited({
    distributorId: distributor.id,
    amount: 750,
    transactionId: createId(),
  });
  await notifyDistributorRechargeSettled({
    transactionId: createId(),
    operator: "JIO",
    amount: 199,
    targetPhone: "9876543210",
    actorName: "Demo Retailer",
    actorRole: "RETAILER",
    userId: createId(),
    distributorId: distributor.id,
    outcome: "SUCCESS",
  });
  await notifyDistributorRechargeSettled({
    transactionId: createId(),
    operator: "AIRTEL",
    amount: 99,
    targetPhone: "9876543211",
    actorName: "Demo Retailer",
    actorRole: "RETAILER",
    userId: createId(),
    distributorId: distributor.id,
    outcome: "FAILED",
  });
  await notifyDistributorRechargeSettled({
    transactionId: createId(),
    operator: "VI",
    amount: 149,
    targetPhone: "9876543212",
    actorName: "Distributor",
    actorRole: "DISTRIBUTOR",
    userId: distributor.id,
    distributorId: null,
    outcome: "REFUNDED",
  });

  console.log(
    `Seeded 12 distributor notification types for ${distributor.name} (${distributor.email}).`,
  );
  console.log("Open /distributor/notifications while logged in as this user.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
