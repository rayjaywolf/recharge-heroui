import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error("Please provide the email address of the user to promote to ADMIN.");
        console.error("Usage: pnpm tsx scripts/make-admin.ts <email>");
        process.exit(1);
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    await prisma.user.update({
        where: { email },
        data: { role: "ADMIN" },
    });

    console.log(`✅ Successfully promoted ${email} to ADMIN.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        // await prisma.$disconnect();
        pool.end();
    });
