import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { bootstrapDatabase } from "../services/bootstrap.js";

async function run() {
  await connectDatabase();
  await bootstrapDatabase();
  console.log("[seed] done");
  await disconnectDatabase();
  process.exit(0);
}

run().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
