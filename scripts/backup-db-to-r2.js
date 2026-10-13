import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
const connString = process.env.AIVEN_PG_URL || process.env.DATABASE_URL;
const accountId = process.env.R2_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME || 'gospel';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!connString) {
  console.error('❌ Error: Falta DATABASE_URL o AIVEN_PG_URL');
  process.exit(1);
}

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Error: Faltan credenciales de Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
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

function parseConnectionString(conn) {
  const parsed = new URL(conn);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432'),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false }
  };
}

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${val.toString().replace(/'/g, "''")}'`;
}

async function exportarBaseDeDatos() {
  const client = new pg.Client(parseConnectionString(connString));
  await client.connect();

  console.log('🔄 Conectado a PostgreSQL. Obteniendo estructura y registros...');

  // 1. Obtener todas las tablas
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const backupData = {
    metadata: {
      fecha: now.toISOString(),
      timestamp: Date.now(),
      motor: 'PostgreSQL Aiven / Neon / FlujoEfectivo',
      tablas: tables,
      resumen_filas: {}
    },
    datos: {}
  };

  let sqlDump = `-- ========================================================\n`;
  sqlDump += `-- RESPALDO INTEGRAL DE BASE DE DATOS A CLOUDFLARE R2\n`;
  sqlDump += `-- Fecha: ${now.toISOString()}\n`;
  sqlDump += `-- Bucket R2: ${bucketName}\n`;
  sqlDump += `-- ========================================================\n\n`;
  sqlDump += `SET statement_timeout = 0;\n`;
  sqlDump += `SET client_encoding = 'UTF8';\n`;
  sqlDump += `SET standard_conforming_strings = on;\n\n`;

  for (const table of tables) {
    console.log(`📦 Procesando tabla: "${table}"...`);
    
    // Obtener columnas
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    
    // Obtener filas
    const rowsRes = await client.query(`SELECT * FROM "${table}"`);
    const rows = rowsRes.rows;
    
    backupData.metadata.resumen_filas[table] = rows.length;
    backupData.datos[table] = rows;

    sqlDump += `-- --------------------------------------------------------\n`;
    sqlDump += `-- Registros para la tabla "${table}" (${rows.length} filas)\n`;
    sqlDump += `-- --------------------------------------------------------\n`;

    if (rows.length > 0) {
      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const valList = cols.map(c => escapeSqlValue(row[c])).join(', ');
        sqlDump += `INSERT INTO "${table}" (${colList}) VALUES (${valList}) ON CONFLICT DO NOTHING;\n`;
      }
      sqlDump += `\n`;
    } else {
      sqlDump += `-- (Sin registros)\n\n`;
    }
  }

  await client.end();
  return { backupData, sqlDump, timestampStr, now };
}

async function subirAR2(key, body, contentType) {
  console.log(`🚀 Subiendo a Cloudflare R2: "${key}" (${Buffer.byteLength(body, 'utf-8')} bytes)...`);
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: {
      'backup-date': new Date().toISOString(),
      'system': 'flujo-efectivo-iglesia'
    }
  }));
  console.log(`✅ Subido con éxito: ${key}`);
}

async function main() {
  console.log('=== INICIANDO RESPALDO COMPLETO DE BASE DE DATOS A CLOUDFLARE R2 ===');
  const { backupData, sqlDump, timestampStr, now } = await exportarBaseDeDatos();

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const localSqlPath = path.join(backupDir, `db_backup_${timestampStr}.sql`);
  const localJsonPath = path.join(backupDir, `db_backup_${timestampStr}.json`);

  fs.writeFileSync(localSqlPath, sqlDump, 'utf-8');
  fs.writeFileSync(localJsonPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`💾 Respaldo local generado temporalmente en:\n   - ${localSqlPath}\n   - ${localJsonPath}`);

  // 1. Subir dump SQL con timestamp a R2
  const r2KeySql = `backups/db_backup_${timestampStr}.sql`;
  await subirAR2(r2KeySql, sqlDump, 'application/sql');

  // 2. Subir dump JSON con timestamp a R2
  const r2KeyJson = `backups/db_backup_${timestampStr}.json`;
  await subirAR2(r2KeyJson, JSON.stringify(backupData, null, 2), 'application/json');

  // 3. Subir enlace constante "latest" a R2 para restauraciones automatizadas
  await subirAR2('backups/latest_db_backup.sql', sqlDump, 'application/sql');
  await subirAR2('backups/latest_db_backup.json', JSON.stringify(backupData, null, 2), 'application/json');

  console.log('\n📋 Comprobando respaldos en el bucket de Cloudflare R2...');
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: 'backups/',
  }));

  console.log('🎉 Listado de respaldos confirmados en Cloudflare R2:');
  list.Contents?.forEach((obj) => {
    console.log(`   📁 ${obj.Key} (${(obj.Size / 1024).toFixed(2)} KB, modificado: ${obj.LastModified})`);
  });

  console.log('\n✅ ¡RESPALDO COMPLETO EN CLOUDFLARE R2 FINALIZADO SATISFACTORIAMENTE!');
  console.log('📊 Resumen de datos respaldados:');
  console.table(backupData.metadata.resumen_filas);
}

main().catch((err) => {
  console.error('❌ Error fatal en el respaldo:', err);
  process.exit(1);
});
