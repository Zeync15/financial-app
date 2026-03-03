import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as authSchema from './schema/auth';
import * as appSchema from './schema/app';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({
  client: pool,
  schema: { ...authSchema, ...appSchema },
});

export type Database = typeof db;
