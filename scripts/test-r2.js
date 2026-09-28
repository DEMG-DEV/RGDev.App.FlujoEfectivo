import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME || 'gospel';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Error: Debes definir R2_ACCOUNT_ID, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en tu entorno.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  console.log(`🔄 Conectando a Cloudflare R2 Bucket: "${bucketName}"...`);

  // 1. Subir un archivo de prueba
  const testKey = `test_conexion_${Date.now()}.txt`;
  console.log(`📤 Subiendo archivo de prueba: ${testKey}...`);

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    Body: 'Prueba de conexión exitosa desde Sistema de Flujo de Efectivo Eclesiástico',
    ContentType: 'text/plain',
  }));

  console.log('✅ Archivo subido exitosamente a Cloudflare R2.');

  // 2. Listar objetos para confirmar
  console.log('📋 Listando objetos en el bucket...');
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName,
    MaxKeys: 10,
  }));

  console.log(`🎉 Total de objetos listados: ${list.KeyCount || 0}`);
  list.Contents?.forEach((obj) => {
    console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
  });
}

main().catch((err) => {
  console.error('❌ Error con Cloudflare R2:', err);
  process.exit(1);
});
