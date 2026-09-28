import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getDbPool();

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM proyectos_pactados WHERE activo = true ORDER BY fecha_inicio DESC;');
        return res.status(200).json({ status: 'connected', data: result.rows });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message, data: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO proyectos_pactados (
            nombre, descripcion, meta_total, valor_semanal_sugerido, fecha_inicio, color_acento, activo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `;
        const values = [
          data.nombre,
          data.descripcion || '',
          data.meta_total,
          data.valor_semanal_sugerido || 0,
          data.fecha_inicio || new Date().toISOString().slice(0, 10),
          data.color_acento || '#4f46e5',
          data.activo !== false
        ];
        const result = await client.query(query, values);
        return res.status(201).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
