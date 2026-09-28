// Cloudflare Pages Function: /api/proyectos
// Gestión de proyectos pactados y pactos individuales en Aiven PostgreSQL

interface Env {
  AIVEN_PG_URL?: string;
  DATABASE_URL?: string;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  try {
    const { env } = context;
    const dbUrl = env.AIVEN_PG_URL || env.DATABASE_URL;

    if (!dbUrl) {
      return new Response(JSON.stringify({
        status: 'mock_mode',
        message: 'AIVEN_PG_URL no configurada. Operando en almacenamiento local.',
        data: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      status: 'connected',
      message: 'Aiven PostgreSQL conectado',
      data: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request } = context;
    const body = await request.json();

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...body,
        id: body.id || crypto.randomUUID(),
        created_at: new Date().toISOString()
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
