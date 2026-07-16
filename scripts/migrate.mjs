import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const db = drizzle(neon(connectionString));
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Orbit database migrations are up to date.");
