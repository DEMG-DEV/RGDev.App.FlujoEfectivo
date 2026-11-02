import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './_lib/db.js';
import { normalizarNombreMiembro } from './_lib/standardizeMembers.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        const query = `
          SELECT 
            t.*,
            p.nombre as proyecto_nombre
          FROM transacciones t
          LEFT JOIN proyectos_pactados p ON t.proyecto_id = p.id
          ORDER BY t.fecha DESC, t.created_at DESC 
          LIMIT 200;
        `;
        const result = await client.query(query);
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
        const proyectoId = sanitizeUUID(data.proyecto_id);
        let pactoId = sanitizeUUID(data.pacto_id);
        let miembroId = sanitizeUUID(data.miembro_id);

        if (data.miembro_nombre) {
          data.miembro_nombre = normalizarNombreMiembro(data.miembro_nombre);
        }

        if (!miembroId && data.miembro_nombre && data.miembro_nombre.trim().toLowerCase() !== 'anónimo' && data.miembro_nombre.trim().toLowerCase() !== 'anonimo') {
          const mMatch = await client.query(
            'SELECT id FROM miembros WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1;',
            [data.miembro_nombre]
          );
          if (mMatch.rows.length > 0) {
            miembroId = mMatch.rows[0].id;
          }
        }

        // Si no se proporcionó pacto_id pero sí proyecto, buscar el pacto registrado
        if (!pactoId && proyectoId) {
          if (data.miembro_nombre) {
            const matchPacto = await client.query(
              'SELECT id FROM pactos_miembros WHERE proyecto_id = $1 AND LOWER(TRIM(miembro_nombre)) = LOWER(TRIM($2)) LIMIT 1;',
              [proyectoId, data.miembro_nombre]
            );
            if (matchPacto.rows.length > 0) {
              pactoId = matchPacto.rows[0].id;
            }
          }
          // Si aún no hay pactoId y el proyecto solo tiene UN pactante registrado, asociarlo automáticamente
          if (!pactoId) {
            const singlePacto = await client.query(
              'SELECT id FROM pactos_miembros WHERE proyecto_id = $1;',
              [proyectoId]
            );
            if (singlePacto.rows.length === 1) {
              pactoId = singlePacto.rows[0].id;
            }
          }
        }

        const query = `
          INSERT INTO transacciones (
            tipo, subtipo, categoria, monto, fecha, dia_semana, 
            tipo_culto, concepto, miembro_id, miembro_nombre, proyecto_id, 
            pacto_id, metodo_pago, evidencia_url, evidencia_nombre
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *;
        `;
        const values = [
          data.tipo,
          data.subtipo || null,
          data.categoria,
          parseFloat(data.monto),
          data.fecha,
          data.dia_semana,
          data.tipo_culto || 'no_aplica',
          data.concepto,
          miembroId,
          data.miembro_nombre || null,
          proyectoId,
          pactoId,
          data.metodo_pago || 'efectivo',
          data.evidencia_url || null,
          data.evidencia_nombre || null
        ];
        const result = await client.query(query, values);
        const row = result.rows[0];

        if (row.proyecto_id) {
          const pRes = await client.query('SELECT nombre FROM proyectos_pactados WHERE id = $1;', [row.proyecto_id]);
          if (pRes.rows.length > 0) {
            row.proyecto_nombre = pRes.rows[0].nombre;
          }
        }

        return res.status(201).json({
          success: true,
          data: {
            ...row,
            monto: parseFloat(row.monto) || 0,
            fecha: row.fecha ? String(row.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10)
          }
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const data = req.body;
      const { id } = data;
      if (!id) return res.status(400).json({ error: 'Falta ID de movimiento' });
      const client = await pool.connect();
      try {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.categoria !== undefined) {
          fields.push(`categoria = $${idx++}`);
          values.push(data.categoria);
        }
        if (data.concepto !== undefined) {
          fields.push(`concepto = $${idx++}`);
          values.push(data.concepto);
        }
        if (data.subtipo !== undefined) {
          fields.push(`subtipo = $${idx++}`);
          values.push(data.subtipo);
        }
        if (data.monto !== undefined) {
          fields.push(`monto = $${idx++}`);
          values.push(parseFloat(data.monto));
        }
        if (data.fecha !== undefined) {
          fields.push(`fecha = $${idx++}`);
          values.push(data.fecha);
        }
        if (data.dia_semana !== undefined) {
          fields.push(`dia_semana = $${idx++}`);
          values.push(data.dia_semana);
        }
        if (data.tipo_culto !== undefined) {
          fields.push(`tipo_culto = $${idx++}`);
          values.push(data.tipo_culto);
        }
        if (data.metodo_pago !== undefined) {
          fields.push(`metodo_pago = $${idx++}`);
          values.push(data.metodo_pago);
        }
        if (data.evidencia_url !== undefined) {
          fields.push(`evidencia_url = $${idx++}`);
          values.push(data.evidencia_url || null);
        }
        if (data.evidencia_nombre !== undefined) {
          fields.push(`evidencia_nombre = $${idx++}`);
          values.push(data.evidencia_nombre || null);
        }
        if (data.evidencia_tipo !== undefined) {
          fields.push(`evidencia_tipo = $${idx++}`);
          values.push(data.evidencia_tipo || null);
        }
        if (data.miembro_id !== undefined) {
          fields.push(`miembro_id = $${idx++}`);
          values.push(sanitizeUUID(data.miembro_id));
        }
        if (data.miembro_nombre !== undefined) {
          const mNombreNorm = data.miembro_nombre ? normalizarNombreMiembro(data.miembro_nombre) : null;
          fields.push(`miembro_nombre = $${idx++}`);
          values.push(mNombreNorm);
        }
        if (data.proyecto_id !== undefined) {
          fields.push(`proyecto_id = $${idx++}`);
          values.push(sanitizeUUID(data.proyecto_id));
        }
        if (data.pacto_id !== undefined) {
          fields.push(`pacto_id = $${idx++}`);
          values.push(sanitizeUUID(data.pacto_id));
        }

        if (fields.length === 0) {
          return res.status(400).json({ error: 'No se enviaron campos a actualizar' });
        }

        const validUuid = sanitizeUUID(id);
        if (!validUuid) {
          return res.status(200).json({ success: true, localOnly: true, data: { id, ...data } });
        }

        values.push(validUuid);
        const query = `
          UPDATE transacciones 
          SET ${fields.join(', ')} 
          WHERE id = $${idx}
          RETURNING *;
        `;
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Movimiento no encontrado' });
        }
        const row = result.rows[0];
        const normalizado = {
          ...row,
          monto: parseFloat(row.monto) || 0,
          fecha: row.fecha ? String(row.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10)
        };
        return res.status(200).json({ success: true, data: normalizado });
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
