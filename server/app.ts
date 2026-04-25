import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { sessionMiddleware } from "./middleware";
import { accountRoutes } from "./routes/accounts";
import { transactionRoutes } from "./routes/transactions";
import { budgetRoutes } from "./routes/budgets";
import { categoryRoutes } from "./routes/categories";
import { portfolioRoutes } from "./routes/portfolios";
import { loanRoutes } from "./routes/loans";
import { dashboardRoutes } from "./routes/dashboard";

export const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: process.env.BETTER_AUTH_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.use("/api/*", sessionMiddleware);

app.route("/api/accounts", accountRoutes);
app.route("/api/transactions", transactionRoutes);
app.route("/api/budgets", budgetRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/portfolios", portfolioRoutes);
app.route("/api/loans", loanRoutes);
app.route("/api/dashboard", dashboardRoutes);

app.get("/api/health", (c) => c.json({ status: "ok" }));
