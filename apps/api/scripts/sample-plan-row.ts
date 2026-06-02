import { config } from "dotenv";
import { resolve } from "node:path";
import { fetchPlanapiMobilePlans } from "@repo/server/planapi";

config({ path: resolve(import.meta.dirname, "../.env") });

async function main() {
  for (const operatorCode of ["2", "4", "11", "23"]) {
    const raw = await fetchPlanapiMobilePlans({
      operatorCode,
      circleCode: "10",
    });
    const [name, value] = Object.entries(raw.rdata).find(([, v]) =>
      Array.isArray(v),
    ) ?? ["?", []];
    console.log("operator", operatorCode, "category", name);
    console.log(JSON.stringify((value as unknown[])[0], null, 2));
  }
}

main();
