import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';
import { R2_BUCKET_NAME } from './r2.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = await getDbPool().connect();
    try {
      const versionRes = await client.query('SELECT version();');
      const tablesRes = await client.query(`
        SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';
      `);
      return res.status(200).json({
        status: 'connected',
        message: 'Conectado exitosamente a Aiven PostgreSQL y Cloudflare R2 en Vercel',
        version: versionRes.rows[0].version,
        tablas_activas: tablesRes.rows[0].count,
        r2_bucket: R2_BUCKET_NAME,
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Error conectando a Aiven PostgreSQL',
      code: err.code
    });
  }
}
