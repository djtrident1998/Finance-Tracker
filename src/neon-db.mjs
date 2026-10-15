import { neon } from '@neondatabase/serverless';

// The ledger uses a small D1 interface; keep its parameterized SQL and atomic batches.
export function postgresSQL(source) {
  let index = 0;
  const ignore = /^INSERT OR IGNORE\b/i.test(source);
  let sql = source.replace(/^INSERT OR IGNORE\b/i, 'INSERT');
  sql = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g, token => token === '?' ? '$' + ++index : token);
  if (ignore) sql += ' ON CONFLICT DO NOTHING';
  return sql;
}

export class NeonDB {
  constructor(url, client) {
    if (!client && (!url || url === '[SENSITIVE]')) throw new Error('Database is not configured');
    this.sql = client || neon(url);
  }
  prepare(source) {
    const sql = postgresSQL(source);
    return {bind: (...args) => ({
      _sql: sql, _args: args,
      all: async () => ({results: await this.sql.query(sql, args)}),
      run: async () => this.sql.query(sql, args),
    })};
  }
  async batch(statements) {
    if (!statements.length) return [];
    return this.sql.transaction(statements.map(s => this.sql.query(s._sql, s._args)));
  }
}
