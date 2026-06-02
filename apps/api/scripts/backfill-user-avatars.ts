import "dotenv/config";
import { eq, isNull, or, sql } from "drizzle-orm";
import { db, pool, user } from "@repo/db";
import {
  assignUserAvatar,
  shouldRegenerateStoredAvatar,
} from "@repo/server/user-avatar";

async function main() {
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(user);

  const needsUpdate = rows.filter((row) => {
    const img = row.image?.trim() ?? "";
    return !img || shouldRegenerateStoredAvatar(img);
  });

  if (needsUpdate.length === 0) {
    console.log("All users already have portable PNG (or OAuth) avatars.");
    return;
  }

  for (const row of needsUpdate) {
    const seed = row.name?.trim() || row.email || row.id;
    await assignUserAvatar(row.id, seed);
  }

  console.log(`✅ Assigned PNG avatars for ${needsUpdate.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
