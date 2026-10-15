import {readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';

export async function migrateNeon(url) {
  if (!url || url === '[SENSITIVE]') throw new Error('A real DATABASE_URL is required');
  const sql = neon(url);
  const source = await readFile(new URL('../drizzle/0000_ledger.sql',import.meta.url),'utf8');
  const statements = source.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
    .map(s => s.replace(/^CREATE TABLE /,'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE INDEX /,'CREATE INDEX IF NOT EXISTS '));
  await sql.transaction(statements.map(s => sql.query(s)));
  console.log('Postgres ledger schema verified.');
}
