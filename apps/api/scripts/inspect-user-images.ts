import "dotenv/config";
import { db, pool, user } from "@repo/db";

async function main() {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user);

  console.log(`Users: ${rows.length}\n`);

  for (const row of rows) {
    const img = row.image?.trim() ?? "";
    let kind = "NULL/empty";
    let preview = "";
    if (img) {
      if (img.startsWith("data:image/png;base64,")) {
        kind = "PNG data URL";
        preview = `len=${img.length} b64=${img.length - 22}`;
      } else if (img.startsWith("data:image/svg+xml")) {
        kind = "SVG data URL (legacy)";
        preview = `len=${img.length}`;
      } else if (img.startsWith("http://") || img.startsWith("https://")) {
        kind = "HTTP URL";
        preview = img.slice(0, 80);
      } else {
        kind = "OTHER";
        preview = img.slice(0, 80);
      }
    }
    console.log(`- ${row.name} <${row.email}>`);
    console.log(`  id: ${row.id}`);
    console.log(`  image: ${kind} ${preview}\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
