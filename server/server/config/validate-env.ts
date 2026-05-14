import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  DATABASE_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(3000),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("\n❌ Missing or invalid environment variables:\n");
  result.error.issues.forEach((e) => {
    console.error(`  ${String(e.path[0])}: ${e.message}`);
  });
  console.error();
  process.exit(1);
}
