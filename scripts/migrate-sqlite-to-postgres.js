/**
 * One-time copy: local liturgia.db (Flask SQLite) -> Neon/Postgres (DATABASE_URL).
 *
 * PowerShell:
 *   $env:DATABASE_URL = "postgresql://neondb_owner:PASSWORD@ep-xxx-pooler....neon.tech/neondb?sslmode=require"
 *   npm run migrate-to-postgres
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { initializeDatabase } = require('../server/database');

const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const sqlitePath = process.env.DATABASE_PATH || path.join(projectRoot, 'liturgia.db');
const databaseUrl = String(process.env.DATABASE_URL || '')
  .replace(/^["']|["']$/g, '')
  .trim();

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function insertRows(pool, table, columns, rows) {
  if (!rows.length) return 0;
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
  let count = 0;
  for (const row of rows) {
    const values = columns.map((col) => row[col] ?? null);
    await pool.query(sql, values);
    count += 1;
  }
  return count;
}

async function main() {
  if (!databaseUrl) {
    throw new Error('Set DATABASE_URL to your Neon connection string before running migration.');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('render.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await initializeDatabase();

  const sqliteDb = new sqlite3.Database(sqlitePath);
  const members = await sqliteAll(sqliteDb, 'SELECT * FROM member');
  const priests = await sqliteAll(sqliteDb, 'SELECT * FROM priest');
  const roles = await sqliteAll(sqliteDb, 'SELECT * FROM community_role');
  const memberRoles = await sqliteAll(sqliteDb, 'SELECT * FROM member_roles');
  const massTypes = await sqliteAll(sqliteDb, 'SELECT * FROM mass_type');
  const masses = await sqliteAll(sqliteDb, 'SELECT * FROM mass');
  const assignments = await sqliteAll(sqliteDb, 'SELECT * FROM mass_assignment');
  const apostles = await sqliteAll(sqliteDb, 'SELECT * FROM apostle');
  const departedSouls = await sqliteAll(sqliteDb, 'SELECT * FROM departed_soul');
  const changeLogs = await sqliteAll(sqliteDb, 'SELECT * FROM mass_change_log');

  console.log(
    `Found: ${members.length} members, ${priests.length} priests, ${masses.length} masses`
  );

  await pool.query('TRUNCATE mass_change_logs, departed_souls, apostles, mass_assignments, masses, member_roles, mass_types, community_roles, priests, members RESTART IDENTITY CASCADE');

  await insertRows(pool, 'members', ['id', 'name', 'phone', 'email', 'active', 'experience_level', 'years_of_service', 'created_at'], members);
  await insertRows(pool, 'priests', ['id', 'name', 'title', 'phone', 'active', 'created_at'], priests);
  await insertRows(pool, 'community_roles', ['id', 'name', 'category', 'description'], roles);
  await insertRows(pool, 'member_roles', ['member_id', 'role_id'], memberRoles);
  await insertRows(
    pool,
    'mass_types',
    [
      'id', 'name', 'default_time', 'description', 'is_special_event', 'required_roles',
      'has_gospel_narration', 'has_mc_reader', 'has_third_reading', 'has_apostles',
      'has_thanksgiving', 'has_carols', 'has_morning_adoration', 'has_departed_souls_reader',
    ],
    massTypes
  );
  await insertRows(pool, 'masses', ['id', 'mass_type_id', 'date', 'time', 'celebrant', 'notes', 'created_at'], masses);
  await insertRows(pool, 'mass_assignments', ['id', 'mass_id', 'member_id', 'role', 'member_name_override', 'notes'], assignments);
  await insertRows(pool, 'apostles', ['id', 'mass_id', 'apostle_name', 'member_id', 'member_name_override'], apostles);
  await insertRows(pool, 'departed_souls', ['id', 'mass_id', 'name', 'family_name'], departedSouls);
  await insertRows(
    pool,
    'mass_change_logs',
    ['id', 'mass_id', 'changed_at', 'changed_by', 'change_reason', 'field_changed', 'old_value', 'new_value'],
    changeLogs
  );

  sqliteDb.close();
  await pool.end();
  console.log('Migration completed successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
