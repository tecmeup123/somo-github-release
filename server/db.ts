import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set and not empty
const databaseUrl = process.env.DATABASE_URL?.trim();

// Fallback to local PostgreSQL if DATABASE_URL is not set
const useLocalPostgres = !databaseUrl;
const localDbConfig = {
  host: '/home/runner/workspace/.postgresql/sockets',
  port: 5432,
  database: 'somo_db',
  user: 'runner',
};

let pool: NeonPool | PgPool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzleNode>;

if (useLocalPostgres) {
  console.log('⚠️  DATABASE_URL not set, using local PostgreSQL...');
  console.log(`📦 Connecting to local database: ${localDbConfig.database}`);
  pool = new PgPool(localDbConfig);
  db = drizzleNode({ client: pool as PgPool, schema });
} else {
  console.log('✅ Using Neon PostgreSQL from DATABASE_URL');
  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon({ client: pool as NeonPool, schema });
}

export { pool, db };
