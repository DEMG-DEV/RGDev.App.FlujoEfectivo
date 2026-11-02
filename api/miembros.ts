import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './_lib/db.js';
import { standardizeMemberRecords, normalizarNombreMiembro } from './_lib/standardizeMembers.js';

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
        const { id, aportaciones, action } = req.query;

        // Estandarización automática e idempotente en cada petición o explícita
        const syncResult = await standardizeMemberRecords(client);

        if (action === 'estandarizar') {
          return res.status(200).json({
            success: true,
            message: 'Nombres estandarizados e historial contable vinculado con éxito.',
            stats: syncResult
          });
        }

        // Caso 1: Obtener detalle y todas las aportaciones de un hermano específico
        if (id && aportaciones === 'true') {
          const miembroId = sanitizeUUID(id as string);
          if (!miembroId) {
            return res.status(400).json({ error: 'ID de miembro inválido' });
          }

          const mRes = await client.query('SELECT * FROM miembros WHERE id = $1;', [miembroId]);
          if (mRes.rows.length === 0) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
          }
          const miembro = mRes.rows[0];

          // Aportaciones (transacciones tipo ingreso asociadas por ID o por coincidencia de nombre)
          const txQuery = `
            SELECT 
              t.*,
              p.nombre as proyecto_nombre
            FROM transacciones t
            LEFT JOIN proyectos_pactados p ON t.proyecto_id = p.id
            WHERE (t.miembro_id = $1 OR LOWER(TRIM(t.miembro_nombre)) = LOWER(TRIM($2)))
            ORDER BY t.fecha DESC, t.created_at DESC;
          `;
          const txRes = await client.query(txQuery, [miembro.id, miembro.nombre]);

          // Pactos asociados a este hermano
          const pactosQuery = `
            SELECT 
              pm.*,
              p.nombre as proyecto_nombre,
              COALESCE((
                SELECT SUM(t.monto) 
                FROM transacciones t 
                WHERE t.pacto_id = pm.id OR (t.proyecto_id = pm.proyecto_id AND LOWER(TRIM(t.miembro_nombre)) = LOWER(TRIM(pm.miembro_nombre)))
              ), 0)::numeric as total_aportado
            FROM pactos_miembros pm
            JOIN proyectos_pactados p ON pm.proyecto_id = p.id
            WHERE LOWER(TRIM(pm.miembro_nombre)) = LOWER(TRIM($1))
            ORDER BY pm.created_at DESC;
          `;
          const pactosRes = await client.query(pactosQuery, [miembro.nombre]);

          return res.status(200).json({
            success: true,
            data: {
              miembro,
              aportaciones: txRes.rows.map(r => ({
                ...r,
                monto: parseFloat(r.monto) || 0,
                fecha: r.fecha ? String(r.fecha).slice(0, 10) : ''
              })),
              pactos: pactosRes.rows.map(p => {
                const totalAportado = parseFloat(p.total_aportado) || 0;
                const totalPactado = parseFloat(p.monto_total_pactado) || 0;
                const cuotaSemanal = parseFloat(p.cuota_semanal) || 1;
                const saldoPendiente = Math.max(0, totalPactado - totalAportado);
                const semanasPagadas = Math.floor(totalAportado / cuotaSemanal);
                return {
                  ...p,
                  monto_total_pactado: totalPactado,
                  cuota_semanal: cuotaSemanal,
                  total_aportado: totalAportado,
                  saldo_pendiente: saldoPendiente,
                  semanas_pagadas: semanasPagadas,
                  estado: saldoPendiente <= 0 ? 'completado' : 'al_dia'
                };
              })
            }
          });
        }

        // Caso 2: Listar todos los hermanos con métricas consolidadas
        const query = `
          SELECT 
            m.id,
            m.nombre,
            m.telefono,
            m.email,
            m.notas,
            m.activo,
            m.created_at,
            COALESCE((
              SELECT COUNT(*)::int 
              FROM transacciones t 
              WHERE (t.miembro_id = m.id OR LOWER(TRIM(t.miembro_nombre)) = LOWER(TRIM(m.nombre)))
            ), 0) as total_aportaciones,
            COALESCE((
              SELECT SUM(t.monto) 
              FROM transacciones t 
              WHERE (t.miembro_id = m.id OR LOWER(TRIM(t.miembro_nombre)) = LOWER(TRIM(m.nombre)))
                AND t.tipo = 'ingreso'
            ), 0)::numeric as total_aportado,
            COALESCE((
              SELECT SUM(t.monto) 
              FROM transacciones t 
              WHERE (t.miembro_id = m.id OR LOWER(TRIM(t.miembro_nombre)) = LOWER(TRIM(m.nombre)))
                AND t.tipo = 'ingreso' AND t.subtipo = 'diezmo'
            ), 0)::numeric as total_diezmos,
            COALESCE((
              SELECT SUM(t.monto) 
              FROM transacciones t 
              WHERE (t.miembro_id = m.id OR LOWER(TRIM(t.miembro_nombre)) = LOWER(TRIM(m.nombre)))
                AND t.tipo = 'ingreso' AND t.subtipo = 'pacto'
            ), 0)::numeric as total_pactos
          FROM miembros m
          ORDER BY m.nombre ASC;
        `;
        const result = await client.query(query);

        return res.status(200).json({
          success: true,
          data: result.rows.map(r => ({
            ...r,
            total_aportaciones: parseInt(r.total_aportaciones) || 0,
            total_aportado: parseFloat(r.total_aportado) || 0,
            total_diezmos: parseFloat(r.total_diezmos) || 0,
            total_pactos: parseFloat(r.total_pactos) || 0,
          }))
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message,
        data: []
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nombre, telefono, email, notas, activo = true, action } = req.body || {};

      if (action === 'estandarizar') {
        const client = await pool.connect();
        try {
          const syncResult = await standardizeMemberRecords(client);
          return res.status(200).json({
            success: true,
            message: 'Nombres estandarizados e historial contable vinculado con éxito.',
            stats: syncResult
          });
        } finally {
          client.release();
        }
      }

      if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre del hermano es obligatorio.' });
      }

      const nombreLimpio = normalizarNombreMiembro(nombre);

      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO miembros (nombre, telefono, email, notas, activo)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const values = [
          nombreLimpio,
          telefono?.trim() || null,
          email?.trim() || null,
          notas?.trim() || null,
          activo !== false
        ];
        const result = await client.query(query, values);
        const nuevo = result.rows[0];

        // Vincular automáticamente transacciones pasadas que tengan este mismo nombre exacto sin miembro_id
        await client.query(`
          UPDATE transacciones 
          SET miembro_id = $1 
          WHERE miembro_id IS NULL AND LOWER(TRIM(miembro_nombre)) = LOWER(TRIM($2));
        `, [nuevo.id, nuevo.nombre]);

        return res.status(201).json({
          success: true,
          data: {
            ...nuevo,
            total_aportaciones: 0,
            total_aportado: 0,
            total_diezmos: 0,
            total_pactos: 0
          }
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { id, nombre, telefono, email, notas, activo } = req.body || {};
      let targetId = sanitizeUUID(id || req.query.id as string);

      const client = await pool.connect();
      try {
        if (!targetId && nombre) {
          const match = await client.query('SELECT id FROM miembros WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1;', [nombre]);
          if (match.rows.length > 0) {
            targetId = match.rows[0].id;
          }
        }

        if (!targetId) {
          // Si no tiene UUID válido y no existe aún en la BD, crearlo
          const insertRes = await client.query(`
            INSERT INTO miembros (nombre, telefono, email, notas, activo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
          `, [
            nombre?.trim() || 'Hermano',
            telefono?.trim() || null,
            email?.trim() || null,
            notas?.trim() || null,
            activo !== false
          ]);
          return res.status(200).json({ success: true, data: insertRes.rows[0] });
        }

        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (nombre !== undefined && typeof nombre === 'string') {
          const nombreLimpio = normalizarNombreMiembro(nombre);
          fields.push(`nombre = $${idx++}`);
          values.push(nombreLimpio);
        }
        if (telefono !== undefined) {
          fields.push(`telefono = $${idx++}`);
          values.push(telefono ? String(telefono).trim() : null);
        }
        if (email !== undefined) {
          fields.push(`email = $${idx++}`);
          values.push(email ? String(email).trim() : null);
        }
        if (notas !== undefined) {
          fields.push(`notas = $${idx++}`);
          values.push(notas ? String(notas).trim() : null);
        }
        if (activo !== undefined) {
          fields.push(`activo = $${idx++}`);
          values.push(Boolean(activo));
        }

        if (fields.length === 0) {
          return res.status(400).json({ error: 'No se enviaron campos para actualizar.' });
        }

        values.push(targetId);
        const query = `
          UPDATE miembros 
          SET ${fields.join(', ')}
          WHERE id = $${idx}
          RETURNING *;
        `;
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Miembro no encontrado' });
        }
        const updated = result.rows[0];

        // Si se actualizó el nombre, sincronizar transacciones y pactos si aplica
        if (nombre) {
          await client.query(`
            UPDATE transacciones 
            SET miembro_nombre = $1 
            WHERE miembro_id = $2;
          `, [updated.nombre, updated.id]);
        }

        return res.status(200).json({
          success: true,
          data: updated
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const rawId = (req.query.id as string) || (req.body?.id as string);
      const validId = sanitizeUUID(rawId);
      if (!validId) {
        return res.status(400).json({ error: 'ID de miembro inválido o ausente.' });
      }

      const client = await pool.connect();
      try {
        // Verificar si tiene transacciones registradas
        const txCheck = await client.query('SELECT count(*)::int as count FROM transacciones WHERE miembro_id = $1;', [validId]);
        const tieneTxs = (txCheck.rows[0]?.count || 0) > 0;

        if (tieneTxs) {
          // Si tiene transacciones históricas, archivamos marcándolo inactivo para no perder el registro contable
          const result = await client.query('UPDATE miembros SET activo = false WHERE id = $1 RETURNING *;', [validId]);
          return res.status(200).json({
            success: true,
            archived: true,
            message: 'El hermano tiene historial contable, por lo que fue desactivado/archivado.',
            data: result.rows[0]
          });
        }

        // Si no tiene transacciones asociadas, se puede eliminar limpiamente
        const result = await client.query('DELETE FROM miembros WHERE id = $1 RETURNING *;', [validId]);
        return res.status(200).json({
          success: true,
          deleted: true,
          data: result.rows[0]
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  return res.status(405).end(`Método ${req.method} no permitido`);
}
