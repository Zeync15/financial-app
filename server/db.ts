import 'dotenv/config';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import ws from 'ws';
import * as authSchema from './schema/auth.js';
import * as appSchema from './schema/app.js';

const schema = { ...authSchema, ...appSchema };
const url = process.env.DATABASE_URL!;
const isNeon = url.includes('neon.tech');

function makeDb() {
  if (isNeon) {
    neonConfig.webSocketConstructor = ws;
    return drizzleNeon({
      client: new NeonPool({ connectionString: url }),
      schema,
    });
  }
  return drizzlePg({
    client: new pg.Pool({ connectionString: url }),
    schema,
  });
}

export const db = makeDb();

export type Database = typeof db;
