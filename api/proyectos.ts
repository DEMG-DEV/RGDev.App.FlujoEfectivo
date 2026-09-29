import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUUID(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getDbPool();

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        // Garantizar columna fecha_fin
        await client.query('ALTER TABLE proyectos_pactados ADD COLUMN IF NOT EXISTS fecha_fin DATE;');

        const query = `
          SELECT 
            p.*,
            COALESCE((SELECT SUM(monto_total_pactado) FROM pactos_miembros WHERE proyecto_id = p.id), 0) as total_pactado,
            COALESCE((SELECT SUM(monto) FROM transacciones WHERE proyecto_id = p.id AND tipo = 'ingreso'), 0) as total_recaudado,
            COALESCE((SELECT SUM(monto) FROM transacciones WHERE proyecto_id = p.id AND tipo = 'gasto'), 0) as total_gastado
          FROM proyectos_pactados p
          ORDER BY p.activo DESC, p.fecha_inicio DESC;
        `;
        const result = await client.query(query);
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
        await client.query('ALTER TABLE proyectos_pactados ADD COLUMN IF NOT EXISTS fecha_fin DATE;');

        const query = `
          INSERT INTO proyectos_pactados (
            nombre, descripcion, meta_total, valor_semanal_sugerido, fecha_inicio, fecha_fin, color_acento, activo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        const values = [
          data.nombre,
          data.descripcion || '',
          parseFloat(data.meta_total),
          parseFloat(data.valor_semanal_sugerido) || 0,
          data.fecha_inicio || new Date().toISOString().slice(0, 10),
          data.fecha_fin || null,
          data.color_acento || '#4f46e5',
          data.activo !== false
        ];
        const result = await client.query(query, values);
        const row = result.rows[0];
        row.total_pactado = 0;
        row.total_recaudado = 0;
        row.total_gastado = 0;
        return res.status(201).json({ success: true, data: row });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const data = req.body;
      const id = sanitizeUUID(data.id);
      if (!id) {
        return res.status(400).json({ error: 'ID de proyecto inválido o no proporcionado' });
      }

      const client = await pool.connect();
      try {
        await client.query('ALTER TABLE proyectos_pactados ADD COLUMN IF NOT EXISTS fecha_fin DATE;');

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.activo !== undefined) {
          updates.push(`activo = $${paramIndex++}`);
          values.push(Boolean(data.activo));
        }

        if (data.fecha_fin !== undefined) {
          updates.push(`fecha_fin = $${paramIndex++}`);
          values.push(data.fecha_fin || null);
        }

        if (data.nombre !== undefined) {
          updates.push(`nombre = $${paramIndex++}`);
          values.push(data.nombre);
        }

        if (data.descripcion !== undefined) {
          updates.push(`descripcion = $${paramIndex++}`);
          values.push(data.descripcion);
        }

        if (data.meta_total !== undefined) {
          updates.push(`meta_total = $${paramIndex++}`);
          values.push(parseFloat(data.meta_total));
        }

        if (data.valor_semanal_sugerido !== undefined) {
          updates.push(`valor_semanal_sugerido = $${paramIndex++}`);
          values.push(parseFloat(data.valor_semanal_sugerido));
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        values.push(id);
        const query = `
          UPDATE proyectos_pactados 
          SET ${updates.join(', ')} 
          WHERE id = $${paramIndex} 
          RETURNING *;
        `;
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        const row = result.rows[0];
        // Calcular métricas
        const mRes = await client.query(`
          SELECT 
            COALESCE((SELECT SUM(monto_total_pactado) FROM pactos_miembros WHERE proyecto_id = $1), 0) as total_pactado,
            COALESCE((SELECT SUM(monto) FROM transacciones WHERE proyecto_id = $1 AND tipo = 'ingreso'), 0) as total_recaudado,
            COALESCE((SELECT SUM(monto) FROM transacciones WHERE proyecto_id = $1 AND tipo = 'gasto'), 0) as total_gastado;
        `, [id]);
        
        row.total_pactado = parseFloat(mRes.rows[0]?.total_pactado || 0);
        row.total_recaudado = parseFloat(mRes.rows[0]?.total_recaudado || 0);
        row.total_gastado = parseFloat(mRes.rows[0]?.total_gastado || 0);

        return res.status(200).json({ success: true, data: row });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
