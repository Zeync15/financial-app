import { Readable } from "node:stream";
import { app } from "../server/app.js";

export const config = { runtime: "nodejs" };

// Vercel's Node runtime calls our handler with a Node IncomingMessage
// (req.headers is a plain object, req.url is a relative path like
// "/api/health?..."). Hono expects a Web Request everywhere — getPath(),
// CORS middleware, c.req.header(), etc. all call req.headers.get().
// So we convert IncomingMessage -> Request before dispatching to Hono.
function toWebRequest(req: any): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, String(v));
    } else if (value != null) {
      headers.set(key, String(value));
    }
  }

  const host = headers.get("host") ?? "localhost";
  const proto = headers.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${host}${req.url ?? "/"}`;

  const method = (req.method ?? "GET").toUpperCase();
  const init: RequestInit & { duplex?: "half" } = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req) as unknown as BodyInit;
    init.duplex = "half";
  }

  return new Request(url, init);
}

export default async function handler(req: any): Promise<Response> {
  return app.fetch(toWebRequest(req));
}
