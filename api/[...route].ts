console.log("[probe] file evaluation start");

import { handle } from "hono/vercel";
console.log("[probe] hono/vercel imported");

let appPromise: Promise<any> | null = null;
function loadApp() {
  if (!appPromise) {
    console.log("[probe] starting dynamic import of server/app");
    appPromise = import("../server/app.js")
      .then((m) => {
        console.log("[probe] server/app imported");
        return m.app;
      })
      .catch((err) => {
        console.error("[probe] server/app import FAILED:", err);
        throw err;
      });
  }
  return appPromise;
}

export const config = { runtime: "nodejs" };

export default async function handler(req: Request) {
  console.log("[probe] handler invoked, url:", req.url);
  try {
    const app = await loadApp();
    console.log("[probe] calling handle(app)");
    return await handle(app)(req);
  } catch (err) {
    console.error("[probe] handler error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
