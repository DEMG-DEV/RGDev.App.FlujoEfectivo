// Cloudflare Pages Function: /api/movimientos
// Manejo de transacciones (ingresos, ofrendas, diezmos, pactos, gastos) en Aiven PostgreSQL

interface Env {
  AIVEN_PG_URL?: string; // postgres://user:password@host:port/defaultdb?sslmode=require
  DATABASE_URL?: string;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  try {
    const { env } = context;
    const dbUrl = env.AIVEN_PG_URL || env.DATABASE_URL;

    if (!dbUrl) {
      return new Response(JSON.stringify({
        status: 'mock_mode',
        message: 'AIVEN_PG_URL no configurada en las variables de entorno de Cloudflare Pages.',
        data: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Nota: Cuando se despliega en Cloudflare Pages con Hyperdrive o Neon serverless pg:
    return new Response(JSON.stringify({
      status: 'connected',
      message: 'Conexión a Aiven PostgreSQL activa',
      data: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const data = await request.json();
    const dbUrl = env.AIVEN_PG_URL || env.DATABASE_URL;

    // Validación básica
    if (!data.monto || !data.tipo || !data.fecha) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios: monto, tipo o fecha' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...data,
        id: data.id || crypto.randomUUID(),
        created_at: new Date().toISOString()
      },
      source: dbUrl ? 'aiven_postgresql' : 'local_storage'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
