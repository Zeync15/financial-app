import { handle } from "hono/vercel";
import { app } from "../server/app.js";

export const config = { runtime: "nodejs" };

const honoHandler = handle(app);

export default async function handler(req: Request) {
  // Vercel's Node runtime passes `req.url` as a relative path
  // (e.g. "/api/health?..."). Hono's getPath() assumes a full URL
  // and mis-parses relative URLs, treating "/api" as the host and
  // routing to "/health" — causing every route to 404.
  // Wrap the request with a synthesized origin so getPath works.
  if (!/^https?:\/\//.test(req.url)) {
    const host = req.headers.get("host") ?? "localhost";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    req = new Request(`${proto}://${host}${req.url}`, req);
  }
  return honoHandler(req);
}
