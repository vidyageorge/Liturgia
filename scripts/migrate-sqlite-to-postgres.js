/**
 * One-time copy: local liturgia.db -> Neon/Postgres (DATABASE_URL).
 * Supports both Node schema (members, masses) and legacy Flask schema (member, mass).
 *
 * Create .env with DATABASE_URL, or:
 *   $env:DATABASE_URL = "postgresql://..."
 *   npm run migrate-to-postgres
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { initializeDatabase } = require('../server/database');

const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const databaseUrl = String(process.env.DATABASE_URL || '')
  .replace(/^["']|["']$/g, '')
  .trim();

const SQLITE_CANDIDATES = [
  process.env.DATABASE_PATH,
  path.join(projectRoot, 'liturgia.db'),
  path.join(projectRoot, 'instance', 'liturgia.db'),
].filter(Boolean);

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function openSqlite(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function detectSchema(db) {
  const tables = await sqliteAll(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  const names = new Set(tables.map((t) => t.name));
  if (names.has('members')) return 'node';
  if (names.has('member')) return 'flask';
  throw new Error('Unrecognized SQLite schema (expected members or member table).');
}

async function findSqliteDatabase() {
  for (const dbPath of SQLITE_CANDIDATES) {
    if (!fs.existsSync(dbPath)) continue;
    try {
      const db = await openSqlite(dbPath);
      const schema = await detectSchema(db);
      return { db, dbPath, schema };
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    'No liturgia.db found. Expected liturgia.db or instance/liturgia.db in the project folder.'
  );
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

async function loadSourceData(db, schema) {
  if (schema === 'node') {
    return {
      members: await sqliteAll(db, 'SELECT * FROM members'),
      priests: await sqliteAll(db, 'SELECT * FROM priests'),
      roles: await sqliteAll(db, 'SELECT * FROM community_roles'),
      memberRoles: await sqliteAll(db, 'SELECT * FROM member_roles'),
      massTypes: await sqliteAll(db, 'SELECT * FROM mass_types'),
      masses: await sqliteAll(db, 'SELECT * FROM masses'),
      assignments: await sqliteAll(db, 'SELECT * FROM mass_assignments'),
      apostles: await sqliteAll(db, 'SELECT * FROM apostles'),
      departedSouls: await sqliteAll(db, 'SELECT * FROM departed_souls'),
      changeLogs: await sqliteAll(db, 'SELECT * FROM mass_change_logs'),
    };
  }

  return {
    members: await sqliteAll(db, 'SELECT * FROM member'),
    priests: await sqliteAll(db, 'SELECT * FROM priest'),
    roles: await sqliteAll(db, 'SELECT * FROM community_role'),
    memberRoles: await sqliteAll(db, 'SELECT * FROM member_roles'),
    massTypes: await sqliteAll(db, 'SELECT * FROM mass_type'),
    masses: await sqliteAll(db, 'SELECT * FROM mass'),
    assignments: await sqliteAll(db, 'SELECT * FROM mass_assignment'),
    apostles: await sqliteAll(db, 'SELECT * FROM apostle'),
    departedSouls: await sqliteAll(db, 'SELECT * FROM departed_soul'),
    changeLogs: await sqliteAll(db, 'SELECT * FROM mass_change_log'),
  };
}

async function main() {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env in the project root, or run:\n' +
        '  $env:DATABASE_URL = "postgresql://..."\n' +
        '  npm run migrate-to-postgres'
    );
  }

  const { db, dbPath, schema } = await findSqliteDatabase();
  console.log(`Using SQLite: ${dbPath} (${schema} schema)`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('render.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await initializeDatabase();

  const data = await loadSourceData(db, schema);
  console.log(
    `Found: ${data.members.length} members, ${data.priests.length} priests, ${data.masses.length} masses`
  );

  if (data.members.length === 0 && data.masses.length === 0) {
    console.warn('Warning: local database has no members or masses to copy.');
  }

  await pool.query(
    'TRUNCATE mass_change_logs, departed_souls, apostles, mass_assignments, masses, member_roles, mass_types, community_roles, priests, members RESTART IDENTITY CASCADE'
  );

  await insertRows(
    pool,
    'members',
    ['id', 'name', 'phone', 'email', 'active', 'experience_level', 'years_of_service', 'created_at'],
    data.members
  );
  await insertRows(pool, 'priests', ['id', 'name', 'title', 'phone', 'active', 'created_at'], data.priests);
  await insertRows(pool, 'community_roles', ['id', 'name', 'category', 'description'], data.roles);
  await insertRows(pool, 'member_roles', ['member_id', 'role_id'], data.memberRoles);
  await insertRows(
    pool,
    'mass_types',
    [
      'id',
      'name',
      'default_time',
      'description',
      'is_special_event',
      'required_roles',
      'has_gospel_narration',
      'has_mc_reader',
      'has_third_reading',
      'has_apostles',
      'has_thanksgiving',
      'has_carols',
      'has_morning_adoration',
      'has_departed_souls_reader',
    ],
    data.massTypes
  );
  await insertRows(
    pool,
    'masses',
    ['id', 'mass_type_id', 'date', 'time', 'celebrant', 'notes', 'created_at'],
    data.masses
  );
  await insertRows(
    pool,
    'mass_assignments',
    ['id', 'mass_id', 'member_id', 'role', 'member_name_override', 'notes'],
    data.assignments
  );
  await insertRows(
    pool,
    'apostles',
    ['id', 'mass_id', 'apostle_name', 'member_id', 'member_name_override'],
    data.apostles
  );
  await insertRows(pool, 'departed_souls', ['id', 'mass_id', 'name', 'family_name'], data.departedSouls);
  await insertRows(
    pool,
    'mass_change_logs',
    ['id', 'mass_id', 'changed_at', 'changed_by', 'change_reason', 'field_changed', 'old_value', 'new_value'],
    data.changeLogs
  );

  db.close();
  await pool.end();
  console.log('Migration completed successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
