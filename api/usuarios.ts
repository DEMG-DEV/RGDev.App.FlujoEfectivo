import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDbPool } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getDbPool();

  // 1. LISTAR USUARIOS DEL SISTEMA
  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT id, email, nombre, rol, activo, created_at, updated_at
          FROM usuarios
          ORDER BY created_at ASC;
        `);
        return res.status(200).json({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al obtener usuarios' });
    }
  }

  // 2. CREAR USUARIO DESDE DENTRO DEL SISTEMA (ADMINISTRACIÓN)
  if (req.method === 'POST') {
    try {
      const { email, password, nombre, rol = 'tesorero', activo = true } = req.body;

      if (!email || !password || !nombre) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe contener al menos 6 caracteres.' });
      }

      const client = await pool.connect();
      try {
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanNombre = String(nombre).trim();

        // Validar si ya existe
        const check = await client.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        if (check.rows.length > 0) {
          return res.status(400).json({ error: 'Ya existe un usuario con ese correo electrónico.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await client.query(
          `INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, email, nombre, rol, activo, created_at;`,
          [cleanEmail, password_hash, cleanNombre, rol, Boolean(activo)]
        );

        return res.status(201).json({
          success: true,
          message: 'Usuario creado exitosamente. Ya puede iniciar sesión con Auth.js.',
          user: result.rows[0]
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear usuario' });
    }
  }

  // 3. ACTUALIZAR ESTADO O ROL
  if (req.method === 'PATCH') {
    try {
      const { id, rol, activo, password } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'ID de usuario requerido.' });
      }

      const client = await pool.connect();
      try {
        if (password) {
          if (password.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
          }
          const salt = await bcrypt.genSalt(10);
          const password_hash = await bcrypt.hash(password, salt);
          await client.query(
            'UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [password_hash, id]
          );
        }

        if (rol !== undefined || activo !== undefined) {
          await client.query(
            `UPDATE usuarios 
             SET rol = COALESCE($1, rol), 
                 activo = COALESCE($2, activo),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3;`,
            [rol !== undefined ? rol : null, activo !== undefined ? activo : null, id]
          );
        }

        const updated = await client.query(
          'SELECT id, email, nombre, rol, activo, created_at, updated_at FROM usuarios WHERE id = $1',
          [id]
        );

        return res.status(200).json({ success: true, user: updated.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al actualizar usuario' });
    }
  }

  // 4. ELIMINAR USUARIO
  if (req.method === 'DELETE') {
    try {
      const id = req.query.id as string || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ error: 'ID de usuario requerido.' });
      }

      const client = await pool.connect();
      try {
        await client.query('DELETE FROM usuarios WHERE id = $1', [id]);
        return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar usuario' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
