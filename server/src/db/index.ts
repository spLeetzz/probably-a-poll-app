import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 10000,       // retire idle connections after 10s (before Postgres kills them)
  connectionTimeoutMillis: 8000,  // wait up to 8s for a new connection
  maxLifetimeSeconds: 300,        // recycle connections every 5 min
  keepAlive: true,                // send TCP keepalive pings to detect dead connections early
  keepAliveInitialDelayMillis: 5000,
});

export const db = drizzle(pool);
