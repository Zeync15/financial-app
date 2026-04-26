import { handle } from "hono/vercel";
import { app } from "../server/app.js";

export const config = { runtime: "nodejs" };

const honoHandler = handle(app);

// Vercel's Node runtime passes a Node IncomingMessage (not a Web Request),
// so req.headers is a plain object and req.url is a relative path like
// "/api/health?...". Hono's getPath() assumes a full URL and would mis-parse
// the relative form, treating "/api" as the host and routing to "/health".
// Read the host the IncomingMessage way and rewrite req.url to a full URL.
function readHeader(headers: any, name: string): string | undefined {
  if (typeof headers?.get === "function") return headers.get(name) ?? undefined;
  return headers?.[name.toLowerCase()];
}

export default async function handler(req: any) {
  if (typeof req.url === "string" && !/^https?:\/\//.test(req.url)) {
    const host = readHeader(req.headers, "host") ?? "localhost";
    const proto = readHeader(req.headers, "x-forwarded-proto") ?? "https";
    req.url = `${proto}://${host}${req.url}`;
  }
  return honoHandler(req);
}
