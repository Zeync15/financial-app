import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { category } from "../schema/app";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

export const categoryRoutes = new Hono<AppEnv>();
categoryRoutes.use(requireAuth);

// List categories (user's + system defaults)
categoryRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const categories = await db
    .select()
    .from(category)
    .where(sql`${category.userId} = ${user.id} OR ${category.userId} IS NULL`)
    .orderBy(category.sortOrder);
  return c.json(categories);
});

// Create category
categoryRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const [cat] = await db
    .insert(category)
    .values({
      userId: user.id,
      name: body.name,
      icon: body.icon || null,
      color: body.color || "#1677ff",
      type: body.type,
    })
    .returning();
  return c.json(cat, 201);
});

// Update category
categoryRoutes.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const [cat] = await db
    .update(category)
    .set({
      name: body.name,
      color: body.color,
      icon: body.icon,
      type: body.type,
    })
    .where(and(eq(category.id, id), eq(category.userId, user.id)))
    .returning();
  if (!cat) return c.json({ error: "Not found" }, 404);
  return c.json(cat);
});

// Delete category
categoryRoutes.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const [cat] = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.userId, user.id)))
    .returning();
  if (!cat) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
