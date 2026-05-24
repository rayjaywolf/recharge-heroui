import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool, user } from "@repo/db";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error(
      "Please provide the email address of the user to promote to ADMIN.",
    );
    console.error("Usage: pnpm tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const [found] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!found) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  await db.update(user).set({ role: "ADMIN" }).where(eq(user.email, email));

  console.log(`✅ Successfully promoted ${email} to ADMIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
