import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as authSchema from "../db/auth-schema.js";
import { events } from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...authSchema },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {

        // not awaiting as it will slow down UX, sign up process should be smooth
        db.update(events)
          .set({ creatorId: newUser.user.id })
          .where(eq(events.creatorId, anonymousUser.user.id))
          .execute()
          .catch(() => {
            // Intentionally swallowed, dont break sign up for failed migration
          });
      },
    }),
  ],
});
