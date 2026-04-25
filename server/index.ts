import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app.js";

if (process.env.NODE_ENV === "production") {
  app.use("/assets/*", serveStatic({ root: "./dist/client" }));
  app.get("*", serveStatic({ path: "./dist/client/index.html" }));
}

const port = parseInt(process.env.PORT || "3001");
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
