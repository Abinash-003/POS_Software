import mongoose from "mongoose";
import { config } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDatabase() {
  mongoose.connection.on("connected", () => {
    console.log(`[db] connected to "${mongoose.connection.name}"`);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });
  mongoose.connection.on("error", (error) => {
    console.error("[db] connection error:", error.message);
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}
