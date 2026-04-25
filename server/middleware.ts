import { createMiddleware } from 'hono/factory';
import { auth } from './auth.js';
import type { AppEnv } from './types.js';

/** Populates c.get('user') and c.get('session') -- does NOT reject. */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set('user', session?.user ?? null);
  c.set('session', session?.session ?? null);
  await next();
});

/** Rejects with 401 if not authenticated. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
