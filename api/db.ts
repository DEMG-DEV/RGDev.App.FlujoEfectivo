import pg from 'pg';

const AIVEN_CONNECTION_STRING = process.env.AIVEN_PG_URL || process.env.DATABASE_URL;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!AIVEN_CONNECTION_STRING) {
    throw new Error('Variable de entorno AIVEN_PG_URL o DATABASE_URL no configurada.');
  }

  if (!pool) {
    const parsed = new URL(AIVEN_CONNECTION_STRING);
    pool = new pg.Pool({
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000,
      max: 10
    });
  }
  return pool;
}
