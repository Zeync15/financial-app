import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";
import { db } from "./db.js";

// Resolve baseURL: explicit env > Vercel preview URL > localhost.
// VERCEL_URL is auto-injected on every Vercel deploy (host only, no protocol).
const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL,
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 5,
  },
  plugins: [
    username({
      minUsernameLength: 5,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  trustedOrigins: [baseURL],
});
