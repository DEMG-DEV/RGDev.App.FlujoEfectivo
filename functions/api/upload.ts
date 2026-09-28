// Cloudflare Pages Function: /api/upload
// Subida de evidencias (recibos, facturas, comprobantes) al Bucket "gospel" de Cloudflare R2
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface Env {
  BUCKET?: any; // Cloudflare R2 Bucket binding si se configura en Pages
  R2_PUBLIC_URL?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Content-Type debe ser multipart/form-data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No se envió ningún archivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar tipo de archivo (imágenes y PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Tipo de archivo no permitido. Solo imágenes o PDF.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limitar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'El archivo excede el límite de 10MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const key = `comprobantes/${new Date().toISOString().slice(0, 7)}/${timestamp}_${sanitizedName}`;

    // Opción A: Binding nativo de Cloudflare Pages (R2 Bucket Binding "BUCKET")
    if (env.BUCKET && typeof env.BUCKET.put === 'function') {
      const arrayBuffer = await file.arrayBuffer();
      await env.BUCKET.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

      const publicBase = env.R2_PUBLIC_URL || '';
      const fileUrl = publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : `/api/evidencia/${key}`;

      return new Response(JSON.stringify({
        success: true,
        key,
        url: fileUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        storage: 'cloudflare_r2_binding'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Opción B: Vía S3 Client compatible con Cloudflare R2
    const accountId = env.R2_ACCOUNT_ID || '';
    const bucketName = env.R2_BUCKET_NAME || 'gospel';
    const accessKeyId = env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY || '';

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: uint8,
      ContentType: file.type,
    }));

    const fileUrl = `/api/evidencia/${key}`;

    return new Response(JSON.stringify({
      success: true,
      key,
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      storage: 'cloudflare_r2_s3'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error al procesar la evidencia en Cloudflare R2' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
