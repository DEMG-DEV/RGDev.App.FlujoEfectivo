import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import busboy from 'busboy';
import { s3Client, R2_BUCKET_NAME } from './r2.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Content-Type debe ser multipart/form-data' });
  }

  const bb = busboy({ headers: req.headers });
  let uploadPromise: Promise<any> | null = null;

  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    const chunks: Buffer[] = [];

    file.on('data', (data) => {
      chunks.push(data);
    });

    file.on('end', () => {
      const fileBuffer = Buffer.concat(chunks);
      const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `comprobantes/${new Date().toISOString().slice(0, 7)}/${Date.now()}_${sanitizedName}`;

      uploadPromise = s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      })).then(() => {
        return {
          success: true,
          key,
          url: `/api/evidencia/${key}`,
          filename,
          size: fileBuffer.length,
          type: mimeType,
          storage: 'cloudflare_r2',
          bucket: R2_BUCKET_NAME,
        };
      });
    });
  });

  bb.on('finish', async () => {
    try {
      if (uploadPromise) {
        const result = await uploadPromise;
        return res.status(200).json(result);
      }
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al subir a Cloudflare R2' });
    }
  });

  bb.on('error', (err: any) => {
    return res.status(500).json({ error: err.message });
  });

  req.pipe(bb);
}
