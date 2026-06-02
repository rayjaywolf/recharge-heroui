import "dotenv/config";
import { eq, isNull, or, sql } from "drizzle-orm";
import { db, pool, user } from "@repo/db";
import { assignUserAvatar } from "@repo/server/user-avatar";

async function main() {
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(
      or(
        isNull(user.image),
        eq(user.image, ""),
        sql`${user.image} LIKE 'data:image/svg+xml%'`,
      ),
    );

  if (rows.length === 0) {
    console.log("All users already have boring-avatar images.");
    return;
  }

  let updated = 0;
  for (const row of rows) {
    const seed = row.name?.trim() || row.email || row.id;
    await assignUserAvatar(row.id, seed);
    updated += 1;
  }

  console.log(`✅ Assigned avatars for ${updated} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
