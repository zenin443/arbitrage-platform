import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const { rows: executed } = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    const executedSet = new Set(executed.map((r: any) => r.filename));

    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`SKIP: ${file} (already executed)`);
        continue;
      }

      console.log(`RUNNING: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`DONE: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`FAILED: ${file}`, err);
        throw err;
      }
    }

    console.log('\nAll migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
