import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET_NAME } from '../r2.js';
import { Readable } from 'stream';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { key } = req.query;
  const keyPath = Array.isArray(key) ? key.join('/') : key;

  if (!keyPath) {
    return res.status(400).send('Clave no proporcionada');
  }

  try {
    const data = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: keyPath,
    }));

    if (data.ContentType) {
      res.setHeader('Content-Type', data.ContentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (data.Body instanceof Readable) {
      data.Body.pipe(res);
    } else {
      const bytes = await data.Body?.transformToByteArray();
      if (bytes) {
        res.send(Buffer.from(bytes));
      } else {
        res.status(404).send('Objeto vacío');
      }
    }
  } catch (err: any) {
    res.status(404).send('Evidencia no encontrada en Cloudflare R2');
  }
}
