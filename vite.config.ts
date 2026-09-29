import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import pg from 'pg';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import bcrypt from 'bcryptjs';
import { Auth } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';

function aivenDbDevPlugin(env: Record<string, string>) {
  let pool: pg.Pool | null = null;
  const AIVEN_CONNECTION_STRING = env.AIVEN_PG_URL || env.DATABASE_URL || '';
  const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID || '';
  const R2_BUCKET_NAME = env.R2_BUCKET_NAME || 'gospel';
  const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID || '';
  const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY || '';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  function getPool() {
    if (!pool && AIVEN_CONNECTION_STRING) {
      const parsed = new URL(AIVEN_CONNECTION_STRING);
      pool = new pg.Pool({
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432'),
        database: parsed.pathname.replace(/^\//, ''),
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000
      });
    }
    return pool;
  }

  return {
    name: 'aiven-db-and-r2-dev-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // 1. Health check de Aiven y R2
        if (req.url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const p = getPool();
            if (!p) {
              return res.end(JSON.stringify({ status: 'warning', message: 'AIVEN_PG_URL no configurada en .env' }));
            }
            const client = await p.connect();
            try {
              const versionRes = await client.query('SELECT version();');
              const tablesRes = await client.query(`
                SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';
              `);
              return res.end(JSON.stringify({
                status: 'connected',
                message: 'Conectado exitosamente a Aiven PostgreSQL y Cloudflare R2',
                version: versionRes.rows[0].version,
                tablas_activas: tablesRes.rows[0].count,
                r2_bucket: R2_BUCKET_NAME
              }));
            } finally {
              client.release();
            }
          } catch (err: any) {
            return res.end(JSON.stringify({
              status: 'error',
              message: err.message || 'No se pudo conectar a Aiven PostgreSQL.',
              code: err.code
            }));
          }
        }

        // 2. Subida de Evidencia a Cloudflare R2 (/api/upload)
        if (req.url === '/api/upload' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const chunks: any[] = [];
          req.on('data', (chunk: any) => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              const contentTypeHeader = req.headers['content-type'] || '';
              
              let fileBuffer: Buffer = buffer;
              let filename = `evidencia_${Date.now()}.jpg`;
              let fileType = 'image/jpeg';

              if (contentTypeHeader.includes('multipart/form-data')) {
                const boundary = contentTypeHeader.split('boundary=')[1];
                if (boundary) {
                  const parts = buffer.toString('binary').split(`--${boundary}`);
                  for (const part of parts) {
                    if (part.includes('filename="')) {
                      const matchName = part.match(/filename="([^"]+)"/);
                      if (matchName) filename = matchName[1];
                      const matchType = part.match(/Content-Type:\s*([^\r\n]+)/);
                      if (matchType) fileType = matchType[1];

                      const fileStart = part.indexOf('\r\n\r\n') + 4;
                      const fileEnd = part.lastIndexOf('\r\n');
                      const fileBinary = part.substring(fileStart, fileEnd);
                      fileBuffer = Buffer.from(fileBinary, 'binary');
                      break;
                    }
                  }
                }
              }

              const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
              const key = `comprobantes/${new Date().toISOString().slice(0, 7)}/${Date.now()}_${sanitizedName}`;

              await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: fileBuffer,
                ContentType: fileType,
              }));

              const fileUrl = `/api/evidencia/${key}`;

              return res.end(JSON.stringify({
                success: true,
                key,
                url: fileUrl,
                filename,
                size: fileBuffer.length,
                type: fileType,
                storage: 'cloudflare_r2',
                bucket: R2_BUCKET_NAME
              }));

            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message || 'Error al subir a Cloudflare R2' }));
            }
          });
          return;
        }

        // 3. Servir Evidencia desde Cloudflare R2 (/api/evidencia/...)
        if (req.url.startsWith('/api/evidencia/') && req.method === 'GET') {
          const key = decodeURIComponent(req.url.replace('/api/evidencia/', ''));
          try {
            const data = await s3.send(new GetObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
            }));

            if (data.ContentType) {
              res.setHeader('Content-Type', data.ContentType);
            }
            res.setHeader('Cache-Control', 'public, max-age=31536000');

            if (data.Body) {
              const stream = data.Body as any;
              return stream.pipe(res);
            }
            res.statusCode = 404;
            return res.end('Archivo no encontrado');
          } catch (err: any) {
            res.statusCode = 404;
            return res.end('No se pudo obtener el archivo de Cloudflare R2');
          }
        }

        // 4. Movimientos / Transacciones en Aiven PostgreSQL
        if (req.url === '/api/movimientos') {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            try {
              const p = getPool();
              if (!p) return res.end(JSON.stringify({ status: 'connected', data: [] }));
              const client = await p.connect();
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
                return res.end(JSON.stringify({
                  status: 'connected',
                  data: result.rows
                }));
              } finally {
                client.release();
              }
            } catch (err: any) {
              return res.end(JSON.stringify({
                status: 'error',
                message: err.message,
                data: []
              }));
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const p = getPool();
                if (!p) throw new Error('Base de datos no configurada');
                const client = await p.connect();
                try {
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                  const sanitizeDevUUID = (val: any) => (val && typeof val === 'string' && uuidRegex.test(val.trim())) ? val.trim() : null;

                  const proyectoId = sanitizeDevUUID(data.proyecto_id);
                  let pactoId = sanitizeDevUUID(data.pacto_id);

                  if (!pactoId && proyectoId && data.miembro_nombre) {
                    const matchPacto = await client.query(
                      'SELECT id FROM pactos_miembros WHERE proyecto_id = $1 AND LOWER(TRIM(miembro_nombre)) = LOWER(TRIM($2)) LIMIT 1;',
                      [proyectoId, data.miembro_nombre]
                    );
                    if (matchPacto.rows.length > 0) {
                      pactoId = matchPacto.rows[0].id;
                    }
                  }

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
                    parseFloat(data.monto),
                    data.fecha,
                    data.dia_semana,
                    data.tipo_culto || 'no_aplica',
                    data.concepto,
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

                  res.statusCode = 201;
                  return res.end(JSON.stringify({ success: true, data: row }));
                } finally {
                  client.release();
                }
              } catch (err: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // 5. Proyectos en Aiven PostgreSQL
        if (req.url === '/api/proyectos') {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            try {
              const p = getPool();
              if (!p) return res.end(JSON.stringify({ status: 'connected', data: [] }));
              const client = await p.connect();
              try {
                const query = `
                  SELECT 
                    p.*,
                    COALESCE((SELECT SUM(monto_total_pactado) FROM pactos_miembros WHERE proyecto_id = p.id), 0) as total_pactado,
                    COALESCE((SELECT SUM(monto) FROM transacciones WHERE proyecto_id = p.id AND tipo = 'ingreso'), 0) as total_recaudado
                  FROM proyectos_pactados p
                  WHERE p.activo = true
                  ORDER BY p.fecha_inicio DESC;
                `;
                const result = await client.query(query);
                return res.end(JSON.stringify({ status: 'connected', data: result.rows }));
              } finally {
                client.release();
              }
            } catch (err: any) {
              return res.end(JSON.stringify({ status: 'error', message: err.message, data: [] }));
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const p = getPool();
                if (!p) return res.end(JSON.stringify({ success: true, data }));
                const client = await p.connect();
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
                  res.statusCode = 201;
                  return res.end(JSON.stringify({ success: true, data: result.rows[0] }));
                } finally {
                  client.release();
                }
              } catch (err: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        // 5.1. Pactos en Aiven PostgreSQL (/api/pactos)
        if (req.url.startsWith('/api/pactos')) {
          res.setHeader('Content-Type', 'application/json');
          const p = getPool();
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const sanitizeDevUUID = (val: any) => (val && typeof val === 'string' && uuidRegex.test(val.trim())) ? val.trim() : null;

          if (req.method === 'GET') {
            try {
              if (!p) return res.end(JSON.stringify({ status: 'connected', data: [] }));
              const client = await p.connect();
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const proyectoId = sanitizeDevUUID(parsedUrl.searchParams.get('proyecto_id'));

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
                query += ` GROUP BY pm.id, p.nombre ORDER BY pm.created_at ASC; `;

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

                return res.end(JSON.stringify({ status: 'connected', data }));
              } finally {
                client.release();
              }
            } catch (err: any) {
              return res.end(JSON.stringify({ status: 'error', message: err.message, data: [] }));
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                if (!p) return res.end(JSON.stringify({ success: true, data }));
                const client = await p.connect();
                try {
                  const id = sanitizeDevUUID(data.id);
                  const proyectoId = sanitizeDevUUID(data.proyecto_id);
                  if (!proyectoId) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: 'UUID de proyecto inválido' }));
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
                        cuota_semanal = EXCLUDED.cuota_semanal
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
                  res.statusCode = 201;
                  return res.end(JSON.stringify({ success: true, data: result.rows[0] }));
                } finally {
                  client.release();
                }
              } catch (err: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          if (req.method === 'PATCH' || req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const pactoId = sanitizeDevUUID(data.id);
                if (!p || !pactoId) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'ID de pacto inválido' }));
                }
                const client = await p.connect();
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
                  return res.end(JSON.stringify({ success: true, data: result.rows[0] }));
                } finally {
                  client.release();
                }
              } catch (err: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          if (req.method === 'DELETE') {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              const pactoId = sanitizeDevUUID(parsedUrl.searchParams.get('id'));
              if (!p || !pactoId) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'ID inválido' }));
              }
              const client = await p.connect();
              try {
                const result = await client.query('DELETE FROM pactos_miembros WHERE id = $1 RETURNING *;', [pactoId]);
                return res.end(JSON.stringify({ success: true, data: result.rows[0] }));
              } finally {
                client.release();
              }
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        // 6. Autenticación con Auth.js (/api/auth/...)
        if (req.url.startsWith('/api/auth')) {
          const authConfigDev: any = {
            basePath: '/api/auth',
            secret: env.AUTH_SECRET || 'flujo-efectivo-iglesia-authjs-secret-key-32chars',
            trustHost: true,
            providers: [
              Credentials({
                id: 'credentials',
                name: 'Credenciales',
                credentials: {
                  email: { label: 'Correo', type: 'email' },
                  password: { label: 'Contraseña', type: 'password' }
                },
                async authorize(credentials) {
                  if (!credentials?.email || !credentials?.password) return null;
                  const p = getPool();
                  if (!p) return null;
                  const client = await p.connect();
                  try {
                    const res = await client.query(
                      'SELECT id, email, password_hash, nombre, rol, activo FROM usuarios WHERE LOWER(email) = LOWER($1)',
                      [String(credentials.email).trim()]
                    );
                    if (res.rows.length === 0) return null;
                    const user = res.rows[0];
                    if (!user.activo) return null;

                    const match = await bcrypt.compare(String(credentials.password), user.password_hash);
                    if (!match) return null;

                    return {
                      id: user.id,
                      name: user.nombre,
                      email: user.email,
                      role: user.rol,
                    };
                  } catch (e) {
                    console.error('Error authorize dev:', e);
                    return null;
                  } finally {
                    client.release();
                  }
                }
              })
            ],
            session: { strategy: 'jwt' },
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

          const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5173'}`);

          // Registro de usuario en dev
          if (fullUrl.pathname === '/api/auth/register') {
            res.setHeader('Content-Type', 'application/json');
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', async () => {
              try {
                const { email, password, nombre, rol } = JSON.parse(body || '{}');
                if (!email || !password || !nombre) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'Nombre, email y contraseña son obligatorios.' }));
                }
                if (password.length < 6) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }));
                }

                const p = getPool();
                if (!p) throw new Error('Base de datos no conectada');
                const client = await p.connect();
                try {
                  const cleanEmail = String(email).trim().toLowerCase();
                  const exists = await client.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
                  if (exists.rows.length > 0) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: 'Ya existe un usuario con este correo electrónico.' }));
                  }

                  const countRes = await client.query('SELECT COUNT(*)::int as count FROM usuarios');
                  const isFirst = countRes.rows[0].count === 0;

                  if (!isFirst) {
                    const cfgRes = await client.query("SELECT valor FROM configuracion_sistema WHERE clave = 'registro_habilitado'");
                    if (cfgRes.rows.length > 0 && cfgRes.rows[0].valor === 'false') {
                      res.statusCode = 403;
                      return res.end(JSON.stringify({
                        error: 'El registro público de usuarios ha sido deshabilitado por el administrador. Solicita tus credenciales al pastor o administrador.'
                      }));
                    }
                  }

                  const rolAsignado = isFirst ? 'admin' : (rol || 'tesorero');

                  const hash = await bcrypt.hash(password, 10);
                  const result = await client.query(
                    `INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
                     VALUES ($1, $2, $3, $4, true)
                     RETURNING id, email, nombre, rol, activo, created_at;`,
                    [cleanEmail, hash, String(nombre).trim(), rolAsignado]
                  );

                  res.statusCode = 201;
                  return res.end(JSON.stringify({
                    success: true,
                    message: isFirst ? 'Usuario Administrador inicial creado con éxito' : 'Usuario registrado exitosamente',
                    user: result.rows[0]
                  }));
                } finally {
                  client.release();
                }
              } catch (e: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          // Otras rutas de Auth.js
          const chunks: any[] = [];
          req.on('data', (chunk: any) => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) {
                if (value) {
                  if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
                  else headers.set(key, String(value));
                }
              }

              const webReq = new Request(fullUrl.toString(), {
                method: req.method,
                headers,
                body: (req.method !== 'GET' && req.method !== 'HEAD') ? bodyBuffer : undefined
              });

              const response = await Auth(webReq, authConfigDev);
              res.statusCode = response.status;
              response.headers.forEach((val, key) => {
                if (key.toLowerCase() === 'set-cookie') {
                  const raw = (response.headers as any).getSetCookie ? (response.headers as any).getSetCookie() : [val];
                  res.setHeader('Set-Cookie', raw);
                } else {
                  res.setHeader(key, val);
                }
              });
              const text = await response.text();
              return res.end(text);
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 7. Gestión de Usuarios (/api/usuarios)
        if (req.url.startsWith('/api/usuarios')) {
          res.setHeader('Content-Type', 'application/json');
          const p = getPool();
          if (!p) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: 'Base de datos no configurada' }));
          }

          if (req.method === 'GET') {
            try {
              const client = await p.connect();
              try {
                const result = await client.query('SELECT id, email, nombre, rol, activo, created_at, updated_at FROM usuarios ORDER BY created_at ASC;');
                return res.end(JSON.stringify({ success: true, data: result.rows }));
              } finally {
                client.release();
              }
            } catch (e: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: e.message }));
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (c: any) => { body += c; });
            req.on('end', async () => {
              try {
                const { email, password, nombre, rol = 'tesorero', activo = true } = JSON.parse(body || '{}');
                if (!email || !password || !nombre) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'Nombre, email y contraseña requeridos.' }));
                }
                const client = await p.connect();
                try {
                  const cleanEmail = String(email).trim().toLowerCase();
                  const exists = await client.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
                  if (exists.rows.length > 0) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: 'Ya existe un usuario con ese correo.' }));
                  }
                  const hash = await bcrypt.hash(password, 10);
                  const result = await client.query(
                    `INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, email, nombre, rol, activo, created_at;`,
                    [cleanEmail, hash, String(nombre).trim(), rol, Boolean(activo)]
                  );
                  res.statusCode = 201;
                  return res.end(JSON.stringify({ success: true, user: result.rows[0] }));
                } finally {
                  client.release();
                }
              } catch (e: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          if (req.method === 'PATCH') {
            let body = '';
            req.on('data', (c: any) => { body += c; });
            req.on('end', async () => {
              try {
                const { id, nombre, email, rol, activo, password } = JSON.parse(body || '{}');
                if (!id) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'ID requerido' }));
                }
                const client = await p.connect();
                try {
                  if (email) {
                    const cleanEmail = String(email).trim().toLowerCase();
                    const check = await client.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND id != $2', [cleanEmail, id]);
                    if (check.rows.length > 0) {
                      res.statusCode = 400;
                      return res.end(JSON.stringify({ error: 'Ya existe otro usuario registrado con ese correo.' }));
                    }
                    await client.query('UPDATE usuarios SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [cleanEmail, id]);
                  }

                  if (nombre) {
                    await client.query('UPDATE usuarios SET nombre = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [String(nombre).trim(), id]);
                  }

                  if (password) {
                    if (password.length < 6) {
                      res.statusCode = 400;
                      return res.end(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }));
                    }
                    const hash = await bcrypt.hash(password, 10);
                    await client.query('UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, id]);
                  }

                  if (rol !== undefined || activo !== undefined) {
                    await client.query(
                      `UPDATE usuarios 
                       SET rol = COALESCE($1, rol), activo = COALESCE($2, activo), updated_at = CURRENT_TIMESTAMP
                       WHERE id = $3`,
                      [rol !== undefined ? rol : null, activo !== undefined ? activo : null, id]
                    );
                  }
                  const updated = await client.query('SELECT id, email, nombre, rol, activo, created_at, updated_at FROM usuarios WHERE id = $1', [id]);
                  return res.end(JSON.stringify({ success: true, user: updated.rows[0], message: 'Usuario actualizado exitosamente' }));
                } finally {
                  client.release();
                }
              } catch (e: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          if (req.method === 'DELETE') {
            const urlObj = new URL(req.url, 'http://localhost');
            const id = urlObj.searchParams.get('id');
            if (!id) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'ID requerido' }));
            }
            try {
              const client = await p.connect();
              try {
                await client.query('DELETE FROM usuarios WHERE id = $1', [id]);
                return res.end(JSON.stringify({ success: true, message: 'Usuario eliminado' }));
              } finally {
                client.release();
              }
            } catch (e: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: e.message }));
            }
          }
        }

        // 8. Configuración del Sistema (/api/configuracion)
        if (req.url.startsWith('/api/configuracion')) {
          res.setHeader('Content-Type', 'application/json');
          const p = getPool();
          if (!p) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: 'Base de datos no conectada' }));
          }

          if (req.method === 'GET') {
            try {
              const client = await p.connect();
              try {
                const configRes = await client.query("SELECT valor FROM configuracion_sistema WHERE clave = 'registro_habilitado'");
                const countRes = await client.query('SELECT count(*)::int as count FROM usuarios');
                const total = countRes.rows[0]?.count || 0;
                const habilitadoEnDb = configRes.rows[0]?.valor !== 'false';
                const habilitado = total === 0 ? true : habilitadoEnDb;
                return res.end(JSON.stringify({
                  success: true,
                  registro_habilitado: habilitado,
                  total_usuarios: total
                }));
              } finally {
                client.release();
              }
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (c: any) => { body += c; });
            req.on('end', async () => {
              try {
                const { clave = 'registro_habilitado', valor } = JSON.parse(body || '{}');
                const valorStr = String(valor);
                const client = await p.connect();
                try {
                  await client.query(`
                    INSERT INTO configuracion_sistema (clave, valor, updated_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = CURRENT_TIMESTAMP;
                  `, [clave, valorStr]);
                  return res.end(JSON.stringify({ success: true, clave, valor: valorStr === 'true' }));
                } finally {
                  client.release();
                }
              } catch (err: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), aivenDbDevPlugin(env)],
    server: {
      port: 5173,
      host: true
    }
  };
});
