import { config } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { bootstrapDatabase } from "./services/bootstrap.js";
import { createApp } from "./app.js";

async function start() {
  try {
    await connectDatabase();
    await bootstrapDatabase();
  } catch (error) {
    console.error("[boot] failed to start:", error.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[boot] API ready on http://localhost:${config.port}/api (${config.env})`);
    console.log(`[boot] allowed origins: ${config.clientOrigins.join(", ")}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[boot] port ${config.port} is already in use.`);
      console.error("[boot] Stop the other process or set a different PORT in server/.env");
    } else {
      console.error("[boot] server error:", error.message);
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    console.log(`\n[boot] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    console.error("[boot] unhandled rejection:", reason);
  });
}

start();
