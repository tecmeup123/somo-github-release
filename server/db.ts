import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL?.trim();
const isNeon = databaseUrl?.includes('.neon.tech');

let pool: NeonPool | PgPool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzleNode>;

if (databaseUrl && isNeon) {
  console.log('✅ Using Neon PostgreSQL from DATABASE_URL');
  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon({ client: pool as NeonPool, schema });
} else if (databaseUrl) {
  console.log('✅ Using standard PostgreSQL from DATABASE_URL');
  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzleNode({ client: pool as PgPool, schema });
} else {
  console.log('⚠️  DATABASE_URL not set, using local PostgreSQL socket...');
  pool = new PgPool({ host: '/home/runner/workspace/.postgresql/sockets', port: 5432, database: 'somo_db', user: 'runner' });
  db = drizzleNode({ client: pool as PgPool, schema });
}

export { pool, db };
