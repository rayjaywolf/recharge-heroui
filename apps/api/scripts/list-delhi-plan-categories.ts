/**
 * Lists planapi.in plan category names for each operator in Delhi circle.
 * Usage: pnpm --filter api exec tsx scripts/list-delhi-plan-categories.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

import { normalizePlanapiPlansPayload } from "@repo/shared/recharge-plans";
import { fetchPlanapiMobilePlans } from "@repo/server/planapi";

config({ path: resolve(import.meta.dirname, "../.env") });

/** planapi circle code for Delhi (see @repo/shared/planapi-mapping). */
const DELHI_PLANAPI_CIRCLE_CODE = "10";

/** Preferred planapi opcodes used by the app (see planapi-mapping). */
const OPERATORS = [
  { opcode: "2", key: "AIRTEL" },
  { opcode: "11", key: "JIO" },
  { opcode: "4", key: "BSNL" },
  { opcode: "23", key: "VI" },
] as const;

async function main() {
  const results: Array<{
    operatorKey: string;
    opcode: string;
    circle: string;
    categories: string[];
    error?: string;
  }> = [];

  for (const { opcode, key } of OPERATORS) {
    try {
      const raw = await fetchPlanapiMobilePlans({
        operatorCode: opcode,
        circleCode: DELHI_PLANAPI_CIRCLE_CODE,
      });
      const catalog = normalizePlanapiPlansPayload({
        operator: raw.operator,
        circle: raw.circle,
        rdata: raw.rdata,
      });
      results.push({
        operatorKey: key,
        opcode,
        circle: raw.circle || "Delhi",
        categories: catalog.categories.map((c) => c.name),
      });
    } catch (error) {
      results.push({
        operatorKey: key,
        opcode,
        circle: "Delhi",
        categories: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        circleCode: DELHI_PLANAPI_CIRCLE_CODE,
        internalCircle: "DL",
        operators: results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
