require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const { rows } = await pool.query(
    'SELECT id, date::text AS date, notes FROM masses ORDER BY date, id'
  );
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date).push(row);
  }

  const toDelete = [];
  for (const [, masses] of byDate) {
    if (masses.length > 1) {
      masses.sort((a, b) => a.id - b.id);
      toDelete.push(...masses.slice(0, -1).map((m) => m.id));
    }
  }

  if (!toDelete.length) {
    console.log('No duplicate masses found.');
    await pool.end();
    return;
  }

  await pool.query(`DELETE FROM masses WHERE id IN (${toDelete.join(',')})`);
  const count = await pool.query('SELECT COUNT(*) FROM masses');
  console.log(`Deleted ${toDelete.length} duplicate masses. Remaining: ${count.rows[0].count}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
