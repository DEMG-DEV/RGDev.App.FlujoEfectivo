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

  // 1. OBTENER PACTOS (con totales aportados y saldos calculados)
  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        const proyectoId = sanitizeUUID(req.query?.proyecto_id as string);

        let query = `
          SELECT 
            pm.id,
            pm.proyecto_id,
            p.nombre as proyecto_nombre,
            pm.miembro_nombre,
            pm.miembro_telefono,
            pm.monto_total_pactado,
            pm.cuota_semanal,
            pm.fecha_inicio,
            pm.estado,
            pm.created_at,
            COALESCE(SUM(t.monto), 0) as total_aportado
          FROM pactos_miembros pm
          JOIN proyectos_pactados p ON pm.proyecto_id = p.id
          LEFT JOIN transacciones t ON (t.pacto_id = pm.id AND t.tipo = 'ingreso')
        `;

        const values: any[] = [];
        if (proyectoId) {
          query += ` WHERE pm.proyecto_id = $1 `;
          values.push(proyectoId);
        }

        query += `
          GROUP BY pm.id, p.nombre
          ORDER BY pm.created_at ASC;
        `;

        const result = await client.query(query, values);

        const data = result.rows.map(row => {
          const montoTotal = parseFloat(row.monto_total_pactado) || 0;
          const cuotaSemanal = parseFloat(row.cuota_semanal) || 0;
          const totalAportado = parseFloat(row.total_aportado) || 0;
          const saldoPendiente = Math.max(0, montoTotal - totalAportado);
          const semanasEstimadas = cuotaSemanal > 0 ? Math.ceil(montoTotal / cuotaSemanal) : 0;
          const semanasPagadas = cuotaSemanal > 0 ? Math.floor(totalAportado / cuotaSemanal) : 0;
          const estado = saldoPendiente <= 0 ? 'completado' : (row.estado || 'al_dia');

          return {
            id: row.id,
            proyecto_id: row.proyecto_id,
            proyecto_nombre: row.proyecto_nombre,
            miembro_nombre: row.miembro_nombre,
            miembro_telefono: row.miembro_telefono || '',
            monto_total_pactado: montoTotal,
            cuota_semanal: cuotaSemanal,
            total_aportado: totalAportado,
            saldo_pendiente: saldoPendiente,
            fecha_inicio: row.fecha_inicio ? String(row.fecha_inicio).slice(0, 10) : new Date().toISOString().slice(0, 10),
            semanas_estimadas: semanasEstimadas,
            semanas_pagadas: semanasPagadas,
            estado
          };
        });

        return res.status(200).json({ status: 'connected', data });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message, data: [] });
    }
  }

  // 2. CREAR PACTO NUEVO
  if (req.method === 'POST') {
    try {
      const data = req.body;
      if (!data.proyecto_id || !data.miembro_nombre || !data.monto_total_pactado || !data.cuota_semanal) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: proyecto_id, miembro_nombre, monto_total_pactado, cuota_semanal' });
      }

      const client = await pool.connect();
      try {
        const id = sanitizeUUID(data.id);
        const proyectoId = sanitizeUUID(data.proyecto_id);
        if (!proyectoId) {
          return res.status(400).json({ error: 'El ID de proyecto no es un UUID válido' });
        }

        let query = '';
        let values: any[] = [];

        if (id) {
          query = `
            INSERT INTO pactos_miembros (
              id, proyecto_id, miembro_nombre, miembro_telefono, monto_total_pactado, cuota_semanal, fecha_inicio, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              miembro_nombre = EXCLUDED.miembro_nombre,
              miembro_telefono = EXCLUDED.miembro_telefono,
              monto_total_pactado = EXCLUDED.monto_total_pactado,
              cuota_semanal = EXCLUDED.cuota_semanal,
              estado = EXCLUDED.estado
            RETURNING *;
          `;
          values = [
            id,
            proyectoId,
            data.miembro_nombre,
            data.miembro_telefono || null,
            parseFloat(data.monto_total_pactado),
            parseFloat(data.cuota_semanal),
            data.fecha_inicio || new Date().toISOString().slice(0, 10),
            data.estado || 'al_dia'
          ];
        } else {
          query = `
            INSERT INTO pactos_miembros (
              proyecto_id, miembro_nombre, miembro_telefono, monto_total_pactado, cuota_semanal, fecha_inicio, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
          `;
          values = [
            proyectoId,
            data.miembro_nombre,
            data.miembro_telefono || null,
            parseFloat(data.monto_total_pactado),
            parseFloat(data.cuota_semanal),
            data.fecha_inicio || new Date().toISOString().slice(0, 10),
            data.estado || 'al_dia'
          ];
        }

        const result = await client.query(query, values);
        return res.status(201).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. EDITAR DATOS DEL PACTANTE
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const data = req.body;
      const pactoId = sanitizeUUID(data.id || req.query?.id as string);
      if (!pactoId) {
        return res.status(400).json({ error: 'ID de pacto inválido o no proporcionado' });
      }

      const client = await pool.connect();
      try {
        const query = `
          UPDATE pactos_miembros
          SET 
            miembro_nombre = COALESCE($2, miembro_nombre),
            miembro_telefono = COALESCE($3, miembro_telefono),
            monto_total_pactado = COALESCE($4, monto_total_pactado),
            cuota_semanal = COALESCE($5, cuota_semanal),
            estado = COALESCE($6, estado)
          WHERE id = $1
          RETURNING *;
        `;
        const values = [
          pactoId,
          data.miembro_nombre !== undefined ? data.miembro_nombre : null,
          data.miembro_telefono !== undefined ? data.miembro_telefono : null,
          data.monto_total_pactado !== undefined ? parseFloat(data.monto_total_pactado) : null,
          data.cuota_semanal !== undefined ? parseFloat(data.cuota_semanal) : null,
          data.estado !== undefined ? data.estado : null
        ];

        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Pacto no encontrado' });
        }
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 4. ELIMINAR PACTO
  if (req.method === 'DELETE') {
    try {
      const pactoId = sanitizeUUID(req.query?.id as string || req.body?.id);
      if (!pactoId) {
        return res.status(400).json({ error: 'ID de pacto inválido o no proporcionado' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM pactos_miembros WHERE id = $1 RETURNING *;', [pactoId]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Pacto no encontrado' });
        }
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
