import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getDbPool();

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        const configRes = await client.query("SELECT valor FROM configuracion_sistema WHERE clave = 'registro_habilitado'");
        const usersCountRes = await client.query('SELECT count(*)::int as count FROM usuarios');

        const totalUsuarios = usersCountRes.rows[0]?.count || 0;
        // Si no hay usuarios aún, el registro siempre debe ser accesible para crear el primer admin
        const registroHabilitadoEnDb = configRes.rows[0]?.valor !== 'false';
        const registroHabilitado = totalUsuarios === 0 ? true : registroHabilitadoEnDb;

        return res.status(200).json({
          success: true,
          registro_habilitado: registroHabilitado,
          total_usuarios: totalUsuarios
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al obtener configuración' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { clave = 'registro_habilitado', valor } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const valorStr = String(valor);

      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO configuracion_sistema (clave, valor, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (clave) 
          DO UPDATE SET valor = $2, updated_at = CURRENT_TIMESTAMP;
        `, [clave, valorStr]);

        return res.status(200).json({
          success: true,
          clave,
          valor: valorStr === 'true'
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al guardar configuración' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
