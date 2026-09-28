import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getDbPool();

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM transacciones ORDER BY fecha DESC LIMIT 200;');
        return res.status(200).json({
          status: 'connected',
          data: result.rows
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({
        status: 'error',
        message: err.message,
        data: []
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO transacciones (
            tipo, subtipo, categoria, monto, fecha, dia_semana, 
            tipo_culto, concepto, miembro_nombre, proyecto_id, 
            pacto_id, metodo_pago, evidencia_url, evidencia_nombre
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *;
        `;
        const values = [
          data.tipo,
          data.subtipo || null,
          data.categoria,
          data.monto,
          data.fecha,
          data.dia_semana,
          data.tipo_culto || 'no_aplica',
          data.concepto,
          data.miembro_nombre || null,
          data.proyecto_id || null,
          data.pacto_id || null,
          data.metodo_pago || 'efectivo',
          data.evidencia_url || null,
          data.evidencia_nombre || null
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

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta ID' });
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM transacciones WHERE id = $1;', [id]);
        return res.status(200).json({ success: true });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
