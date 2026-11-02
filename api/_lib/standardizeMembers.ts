import pg from 'pg';

export interface CanonicalMemberMapping {
  canonical: string;
  aliases: string[];
}

export const CANONICAL_MEMBERS: CanonicalMemberMapping[] = [
  {
    canonical: 'Cristal',
    aliases: ['crystal', 'cristal', 'cristal ', 'crystal ']
  },
  {
    canonical: 'David Mendez',
    aliases: ['david mendez', 'david méndez', 'david mendez ', 'david méndez ']
  },
  {
    canonical: 'Jesus Hernandez',
    aliases: [
      'jesus hernandez',
      'jesús hernández',
      'jesus hernández',
      'jesús hernandez',
      'pastor jesus',
      'pastor jesús',
      'pastor jesus hernandez',
      'pastor jesús hernández',
      'jesus hdz',
      'jesús hdz'
    ]
  },
  {
    canonical: 'Juan',
    aliases: ['juan', 'juan ']
  },
  {
    canonical: 'Laura de Hernandez',
    aliases: [
      'laura de hernandez',
      'laura de hernández',
      'laura hernandez',
      'laura hernández',
      'laura hdz',
      'laura de hdz'
    ]
  },
  {
    canonical: 'Ma de Jesus',
    aliases: [
      'ma de jesus',
      'ma. de jesus',
      'ma de jesús',
      'ma. de jesús',
      'maria de jesus',
      'maría de jesús',
      'maria de jesus ',
      'maría de jesus'
    ]
  },
  {
    canonical: 'Nancy Hernandez',
    aliases: [
      'nancy hernandez',
      'nancy hernández',
      'nancy hdz'
    ]
  }
];

export function normalizarNombreMiembro(nombre?: string | null): string {
  if (!nombre || typeof nombre !== 'string') return '';
  const trimmed = nombre.trim();
  const lower = trimmed.toLowerCase();

  for (const m of CANONICAL_MEMBERS) {
    if (m.canonical.toLowerCase() === lower) {
      return m.canonical;
    }
    for (const a of m.aliases) {
      if (a.toLowerCase().trim() === lower) {
        return m.canonical;
      }
    }
  }

  return trimmed;
}

export async function standardizeMemberRecords(client: pg.PoolClient | pg.Client) {
  let txsUpdated = 0;
  let pactosUpdated = 0;
  let miembrosUpdated = 0;

  for (const item of CANONICAL_MEMBERS) {
    const canonical = item.canonical;
    const lowerAliases = item.aliases.map(a => a.toLowerCase().trim());

    // 1. Estandarizar transacciones con aliases hacia el nombre canónico
    const txRes = await client.query(
      `UPDATE transacciones 
       SET miembro_nombre = $1 
       WHERE LOWER(TRIM(miembro_nombre)) = ANY($2) AND miembro_nombre != $1;`,
      [canonical, lowerAliases]
    );
    txsUpdated += txRes.rowCount || 0;

    // 2. Estandarizar pactos con aliases hacia el nombre canónico
    const pactoRes = await client.query(
      `UPDATE pactos_miembros 
       SET miembro_nombre = $1 
       WHERE LOWER(TRIM(miembro_nombre)) = ANY($2) AND miembro_nombre != $1;`,
      [canonical, lowerAliases]
    );
    pactosUpdated += pactoRes.rowCount || 0;

    // 3. Estandarizar tabla miembros
    const canRes = await client.query(
      `SELECT id, nombre, telefono, email, notas, activo 
       FROM miembros 
       WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) 
       ORDER BY created_at ASC;`,
      [canonical]
    );

    let canonicalId: string;

    if (canRes.rows.length > 0) {
      canonicalId = canRes.rows[0].id;
      if (canRes.rows[0].nombre !== canonical) {
        await client.query(`UPDATE miembros SET nombre = $1 WHERE id = $2;`, [canonical, canonicalId]);
        miembrosUpdated++;
      }

      // Si hay duplicados con el mismo nombre canónico
      if (canRes.rows.length > 1) {
        for (let i = 1; i < canRes.rows.length; i++) {
          const dupId = canRes.rows[i].id;
          await client.query(`UPDATE transacciones SET miembro_id = $1 WHERE miembro_id = $2;`, [canonicalId, dupId]);
          await client.query(`DELETE FROM miembros WHERE id = $1;`, [dupId]);
          miembrosUpdated++;
        }
      }

      // Si existen filas adicionales con aliases en miembros (ej. 'Crystal' o 'Laura Hernandez' como miembro redundante)
      const aliasRows = await client.query(
        `SELECT id, nombre FROM miembros WHERE LOWER(TRIM(nombre)) = ANY($1) AND id != $2;`,
        [lowerAliases, canonicalId]
      );
      for (const aRow of aliasRows.rows) {
        await client.query(`UPDATE transacciones SET miembro_id = $1 WHERE miembro_id = $2;`, [canonicalId, aRow.id]);
        await client.query(`DELETE FROM miembros WHERE id = $1;`, [aRow.id]);
        miembrosUpdated++;
      }
    } else {
      // Buscar si existe con algún alias para renombrarlo
      const aliasMatch = await client.query(
        `SELECT id, nombre FROM miembros WHERE LOWER(TRIM(nombre)) = ANY($1) ORDER BY created_at ASC;`,
        [lowerAliases]
      );

      if (aliasMatch.rows.length > 0) {
        canonicalId = aliasMatch.rows[0].id;
        await client.query(`UPDATE miembros SET nombre = $1 WHERE id = $2;`, [canonical, canonicalId]);
        miembrosUpdated++;

        for (let i = 1; i < aliasMatch.rows.length; i++) {
          const dupId = aliasMatch.rows[i].id;
          await client.query(`UPDATE transacciones SET miembro_id = $1 WHERE miembro_id = $2;`, [canonicalId, dupId]);
          await client.query(`DELETE FROM miembros WHERE id = $1;`, [dupId]);
          miembrosUpdated++;
        }
      } else {
        // Crear el miembro canónico si no existía aún
        const newRes = await client.query(
          `INSERT INTO miembros (nombre, activo) VALUES ($1, true) RETURNING id;`,
          [canonical]
        );
        canonicalId = newRes.rows[0].id;
        miembrosUpdated++;
      }
    }

    // 4. Vincular transacciones a su miembro_id
    const linkRes = await client.query(
      `UPDATE transacciones 
       SET miembro_id = $1 
       WHERE miembro_id IS NULL AND LOWER(TRIM(miembro_nombre)) = LOWER(TRIM($2));`,
      [canonicalId, canonical]
    );
    txsUpdated += linkRes.rowCount || 0;
  }

  // 5. Vincular pactos en transacciones huérfanas
  await client.query(`
    UPDATE transacciones t
    SET pacto_id = pm.id
    FROM pactos_miembros pm
    WHERE t.proyecto_id = pm.proyecto_id
      AND t.pacto_id IS NULL
      AND t.tipo = 'ingreso'
      AND t.subtipo = 'pacto'
      AND LOWER(TRIM(COALESCE(t.miembro_nombre, ''))) = LOWER(TRIM(pm.miembro_nombre));
  `);

  return {
    success: true,
    txsUpdated,
    pactosUpdated,
    miembrosUpdated
  };
}
