import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

let tableChecked = false;

async function asegurarTablaReportes(client: any) {
  if (tableChecked) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS reportes_historicos (
      id VARCHAR(100) PRIMARY KEY,
      folio VARCHAR(50) NOT NULL,
      fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      periodo_tipo VARCHAR(30) NOT NULL,
      periodo_descripcion VARCHAR(255) NOT NULL,
      mes_seleccionado VARCHAR(10),
      fecha_desde DATE NOT NULL,
      fecha_hasta DATE NOT NULL,
      nombre_iglesia VARCHAR(255) NOT NULL,
      logo_iglesia TEXT,
      secciones_incluidas JSONB NOT NULL,
      totales JSONB NOT NULL,
      desglose_categorias_gastos JSONB,
      movimientos_snapshot JSONB NOT NULL,
      proyectos_snapshot JSONB,
      creado_por VARCHAR(150),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reportes_historicos_folio ON reportes_historicos(folio);
    CREATE INDEX IF NOT EXISTS idx_reportes_historicos_fecha ON reportes_historicos(fecha_emision DESC);
  `);
  tableChecked = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getDbPool();

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        await asegurarTablaReportes(client);
        const { id } = req.query;

        if (id) {
          const result = await client.query('SELECT * FROM reportes_historicos WHERE id = $1 LIMIT 1;', [id]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
          }
          return res.status(200).json({ success: true, data: result.rows[0] });
        }

        const result = await client.query('SELECT * FROM reportes_historicos ORDER BY fecha_emision DESC LIMIT 100;');
        return res.status(200).json({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al obtener reportes históricos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const client = await pool.connect();
      try {
        await asegurarTablaReportes(client);

        const id = body.id || `rep-${Date.now()}`;
        const folio = body.folio || `TES-${Date.now()}`;
        const fechaEmision = body.fecha_emision || new Date().toISOString();
        const periodoTipo = body.periodo_tipo || 'por_mes';
        const periodoDescripcion = body.periodo_descripcion || 'Reporte Financiero';
        const mesSeleccionado = body.mes_seleccionado || null;
        const fechaDesde = body.fecha_desde;
        const fechaHasta = body.fecha_hasta;
        const nombreIglesia = body.nombre_iglesia || 'Iglesia Cristiana Evangélica';
        const logoIglesia = body.logo_iglesia || null;
        const secciones = JSON.stringify(body.secciones_incluidas || {});
        const totales = JSON.stringify(body.totales || {});
        const desgloseGastos = JSON.stringify(body.desglose_categorias_gastos || []);
        const movimientos = JSON.stringify(body.movimientos_snapshot || []);
        const proyectos = JSON.stringify(body.proyectos_snapshot || []);
        const creadoPor = body.creado_por || null;

        const query = `
          INSERT INTO reportes_historicos (
            id, folio, fecha_emision, periodo_tipo, periodo_descripcion,
            mes_seleccionado, fecha_desde, fecha_hasta, nombre_iglesia, logo_iglesia,
            secciones_incluidas, totales, desglose_categorias_gastos,
            movimientos_snapshot, proyectos_snapshot, creado_por, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            folio = EXCLUDED.folio,
            secciones_incluidas = EXCLUDED.secciones_incluidas,
            totales = EXCLUDED.totales,
            desglose_categorias_gastos = EXCLUDED.desglose_categorias_gastos,
            movimientos_snapshot = EXCLUDED.movimientos_snapshot,
            proyectos_snapshot = EXCLUDED.proyectos_snapshot
          RETURNING *;
        `;

        const values = [
          id, folio, fechaEmision, periodoTipo, periodoDescripcion,
          mesSeleccionado, fechaDesde, fechaHasta, nombreIglesia, logoIglesia,
          secciones, totales, desgloseGastos,
          movimientos, proyectos, creadoPor
        ];

        const result = await client.query(query, values);
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al guardar reporte histórico' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID de reporte requerido' });
      }
      const client = await pool.connect();
      try {
        await asegurarTablaReportes(client);
        await client.query('DELETE FROM reportes_historicos WHERE id = $1;', [id]);
        return res.status(200).json({ success: true, message: 'Reporte eliminado' });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar reporte histórico' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
