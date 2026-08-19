import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(apiRoot, ".env") });

import { performRealRoboRecharge } from "@repo/server/realrobo";

async function main() {
  process.env.REALROBO_LAPU_ID = "582630";
  
  console.log("Starting test recharge...");
  console.log("Parameters:");
  console.log("- Phone: 8580902202");
  console.log("- Operator: Jio");
  console.log("- Amount: 11");
  console.log("- Circle: HP");
  console.log("- Lapu ID:", process.env.REALROBO_LAPU_ID);

  try {
    const res = await performRealRoboRecharge(
      "8580902202",
      "Jio",
      11,
      "HP"
    );
    console.log("Recharge Response:", JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Recharge failed:", error);
  }
}

main();
