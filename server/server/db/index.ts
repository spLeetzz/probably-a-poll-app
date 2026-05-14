import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "../../node_modules/@types/pg/index.js";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxLifetimeSeconds: 3600,
});

export const db = drizzle(pool);
