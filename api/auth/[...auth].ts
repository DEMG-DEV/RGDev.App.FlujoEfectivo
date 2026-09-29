import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Auth } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDbPool } from '../db.js';

export const authConfig: any = {
  basePath: '/api/auth',
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'flujo-efectivo-iglesia-authjs-secret-key-32chars',
  trustHost: true,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credenciales',
      credentials: {
        email: { label: 'Correo Electrónico', type: 'email' },
        password: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const emailStr = String(credentials.email).trim().toLowerCase();
        const passStr = String(credentials.password);

        const pool = getDbPool();
        const client = await pool.connect();
        try {
          const res = await client.query(
            'SELECT id, email, password_hash, nombre, rol, activo FROM usuarios WHERE LOWER(email) = LOWER($1)',
            [emailStr]
          );
          if (res.rows.length === 0) return null;
          const user = res.rows[0];
          if (!user.activo) return null;

          const match = await bcrypt.compare(passStr, user.password_hash);
          if (!match) return null;

          return {
            id: user.id,
            name: user.nombre,
            email: user.email,
            role: user.rol,
          };
        } catch (err) {
          console.error('Error en authorize de Auth.js:', err);
          return null;
        } finally {
          client.release();
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const fullUrl = new URL(req.url!, `${protocol}://${host}`);

  // Endpoint de Registro de Usuarios (/api/auth/register)
  if (fullUrl.pathname === '/api/auth/register' || fullUrl.pathname.endsWith('/register')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    try {
      const { email, password, nombre, rol } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!email || !password || !nombre) {
        return res.status(400).json({ error: 'Email, nombre y contraseña son requeridos.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      }

      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanNombre = String(nombre).trim();

        // Verificar si ya existe
        const exists = await client.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        if (exists.rows.length > 0) {
          return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
        }

        // Si es el primer usuario, se le otorga rol 'admin'
        const countRes = await client.query('SELECT COUNT(*)::int as count FROM usuarios');
        const totalUsers = countRes.rows[0].count;

        // Validar si el registro público está deshabilitado
        if (totalUsers > 0) {
          const configRes = await client.query("SELECT valor FROM configuracion_sistema WHERE clave = 'registro_habilitado'");
          if (configRes.rows.length > 0 && configRes.rows[0].valor === 'false') {
            return res.status(403).json({
              error: 'El registro público de usuarios ha sido deshabilitado por el administrador. Solicita tus credenciales al pastor o administrador.'
            });
          }
        }

        const rolAsignado = totalUsers === 0 ? 'admin' : (rol || 'tesorero');

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const insertRes = await client.query(
          `INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id, email, nombre, rol, activo, created_at;`,
          [cleanEmail, password_hash, cleanNombre, rolAsignado]
        );

        return res.status(201).json({
          success: true,
          message: totalUsers === 0 ? '¡Usuario Administrador inicial creado con éxito!' : 'Usuario registrado exitosamente',
          user: insertRes.rows[0]
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Error registrando usuario:', err);
      return res.status(500).json({ error: err.message || 'Error interno del servidor al registrar.' });
    }
  }

  // Rutas estándar de Auth.js (/api/auth/csrf, /api/auth/session, /api/auth/callback/credentials, etc.)
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        body = req.body;
      } else if (req.body) {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(req.body)) {
            params.append(k, String(v));
          }
          body = params.toString();
        } else {
          body = JSON.stringify(req.body);
        }
      }
    }

    const request = new Request(fullUrl.toString(), {
      method: req.method,
      headers,
      body
    });

    const response = await Auth(request, authConfig);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        const rawCookies = (response.headers as any).getSetCookie ? (response.headers as any).getSetCookie() : [val];
        res.setHeader('Set-Cookie', rawCookies);
      } else {
        res.setHeader(key, val);
      }
    });

    const responseData = await response.text();
    return res.send(responseData);
  } catch (err: any) {
    console.error('Error procesando request Auth.js:', err);
    return res.status(500).json({ error: err.message || 'Error en Auth.js' });
  }
}
