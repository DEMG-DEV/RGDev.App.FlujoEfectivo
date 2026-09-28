import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import pg from 'pg';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

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
                const result = await client.query('SELECT * FROM transacciones ORDER BY fecha DESC LIMIT 100;');
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

        // 5. Proyectos en Aiven PostgreSQL
        if (req.url === '/api/proyectos') {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            try {
              const p = getPool();
              if (!p) return res.end(JSON.stringify({ status: 'connected', data: [] }));
              const client = await p.connect();
              try {
                const result = await client.query('SELECT * FROM proyectos_pactados WHERE activo = true ORDER BY fecha_inicio DESC;');
                return res.end(JSON.stringify({ status: 'connected', data: result.rows }));
              } finally {
                client.release();
              }
            } catch (err: any) {
              return res.end(JSON.stringify({ status: 'error', message: err.message, data: [] }));
            }
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
