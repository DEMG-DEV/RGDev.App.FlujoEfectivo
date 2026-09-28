import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Debes definir la variable DATABASE_URL en tu entorno.');
  process.exit(1);
}

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

async function clean() {
  const client = await pool.connect();
  try {
    console.log('🔄 Conectando a Aiven para limpiar datos seed de prueba...');
    
    // Limpiar transacciones, pactos, proyectos y miembros
    await client.query('TRUNCATE TABLE transacciones, pactos_miembros, proyectos_pactados, miembros CASCADE;');
    console.log('✅ Tablas transacciones, pactos_miembros, proyectos_pactados y miembros vaciadas.');

    // Verificar conteos
    const tx = await client.query('SELECT COUNT(*) FROM transacciones;');
    const pmt = await client.query('SELECT COUNT(*) FROM pactos_miembros;');
    const proj = await client.query('SELECT COUNT(*) FROM proyectos_pactados;');
    const m = await client.query('SELECT COUNT(*) FROM miembros;');
    const cat = await client.query('SELECT COUNT(*) FROM categorias;');

    console.log('\n📊 Estado actual en Aiven PostgreSQL:');
    console.log(`   - Transacciones: ${tx.rows[0].count}`);
    console.log(`   - Pactos de Miembros: ${pmt.rows[0].count}`);
    console.log(`   - Proyectos Pactados: ${proj.rows[0].count}`);
    console.log(`   - Miembros: ${m.rows[0].count}`);
    console.log(`   - Categorías catálogo base: ${cat.rows[0].count}`);

    console.log('\n🎉 ¡Base de datos limpia y lista para uso en producción!');
  } catch (err) {
    console.error('❌ Error limpiando la base de datos:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clean();
