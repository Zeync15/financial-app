import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { sessionMiddleware } from "./middleware";
import { accountRoutes } from "./routes/accounts";
import { transactionRoutes } from "./routes/transactions";
import { budgetRoutes } from "./routes/budgets";
import { portfolioRoutes } from "./routes/portfolios";
import { loanRoutes } from "./routes/loans";
import { dashboardRoutes } from "./routes/dashboard";

const app = new Hono();

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: process.env.BETTER_AUTH_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// ─── Auth routes (Better Auth handles these) ────────────────────────────────
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// ─── Session middleware for all /api/* routes ───────────────────────────────
app.use("/api/*", sessionMiddleware);

// ─── API routes ─────────────────────────────────────────────────────────────
app.route("/api/accounts", accountRoutes);
app.route("/api/transactions", transactionRoutes);
app.route("/api/budgets", budgetRoutes);
app.route("/api/portfolios", portfolioRoutes);
app.route("/api/loans", loanRoutes);
app.route("/api/dashboard", dashboardRoutes);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ status: "ok" }));

// ─── Production: serve Vite build output ────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use("/assets/*", serveStatic({ root: "./dist/client" }));
  app.get("*", serveStatic({ path: "./dist/client/index.html" }));
}

// ─── Start server ───────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "3001");
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
