import { Pool } from 'pg';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return _pool;
}

const pool = new Proxy({} as Pool, {
  get(_target, prop: string | symbol) {
    const p = getPool();
    const value = (p as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(p) : value;
  },
});

export default pool;
