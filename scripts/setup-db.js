import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Debes definir la variable DATABASE_URL en tu entorno.');
  process.exit(1);
}

console.log('🔄 Conectando a Aiven PostgreSQL...');

const parsed = new URL(connectionString);

const pool = new pg.Pool({
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  host: parsed.hostname,
  port: parseInt(parsed.port || '5432'),
  database: parsed.pathname.replace(/^\//, ''),
  ssl: {
    rejectUnauthorized: false
  }
});

async function setup() {
  const client = await pool.connect();
  try {
    console.log('✅ Conexión establecida con éxito a Aiven.');
    const versionRes = await client.query('SELECT version()');
    console.log('📌 Versión de PostgreSQL:', versionRes.rows[0].version);

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    console.log(`📖 Leyendo schema desde: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Ejecutando script DDL de creación de tablas...');
    await client.query(sql);
    console.log('✅ Schema ejecutado correctamente.');

    // Verificar tablas creadas
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Tablas creadas en Aiven PostgreSQL:');
    tablesRes.rows.forEach(r => console.log(`   - ${r.table_name}`));

    // Contar categorías y proyectos
    const catCount = await client.query('SELECT COUNT(*) FROM categorias');
    const projCount = await client.query('SELECT COUNT(*) FROM proyectos_pactados');
    const txCount = await client.query('SELECT COUNT(*) FROM transacciones');

    console.log('\n📈 Registros en base de datos:');
    console.log(`   - Categorías: ${catCount.rows[0].count}`);
    console.log(`   - Proyectos pactados: ${projCount.rows[0].count}`);
    console.log(`   - Transacciones: ${txCount.rows[0].count}`);

  } catch (err) {
    console.error('❌ Error al configurar la base de datos:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🎉 ¡Base de datos de Aiven configurada e inicializada al 100%!');
  }
}

setup();
