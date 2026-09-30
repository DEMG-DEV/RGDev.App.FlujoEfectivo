import pg from 'pg';

const AIVEN_CONNECTION_STRING = process.env.AIVEN_PG_URL || process.env.DATABASE_URL;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL || process.env.AIVEN_PG_URL;
  if (!connectionString) {
    throw new Error('Variable de entorno DATABASE_URL o AIVEN_PG_URL no configurada.');
  }

  if (!pool) {
    const parsed = new URL(connectionString);
    const isSsl = parsed.searchParams.get('sslmode') === 'require' || (
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      parsed.hostname !== 'db' &&
      parsed.searchParams.get('sslmode') !== 'disable'
    );
    pool = new pg.Pool({
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: isSsl ? {
        rejectUnauthorized: false
      } : false,
      connectionTimeoutMillis: 5000,
      max: 10
    });
  }
  return pool;
}
