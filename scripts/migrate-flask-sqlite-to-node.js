/**
 * Copy data from old Flask SQLite tables (member, mass, ...) into Node tables (members, masses, ...).
 * Checks both liturgia.db and instance/liturgia.db for Flask schema.
 *
 * Usage: node scripts/migrate-flask-sqlite-to-node.js [path-to-sqlite]
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { initializeDatabase, dbRun, dbGet, dbAll } = require('../server/database');

const projectRoot = path.join(__dirname, '..');
const candidates = [
  process.argv[2],
  path.join(projectRoot, 'instance', 'liturgia.db'),
  path.join(projectRoot, 'liturgia.db'),
].filter(Boolean);

function openSqlite(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function findFlaskDatabase() {
  for (const dbPath of candidates) {
    try {
      const db = await openSqlite(dbPath);
      const tables = await sqliteAll(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='member'"
      );
      db.close();
      if (tables.length > 0) {
        const db2 = await openSqlite(dbPath);
        const memberCount = await sqliteAll(db2, 'SELECT COUNT(*) AS c FROM member');
        const massCount = await sqliteAll(db2, 'SELECT COUNT(*) AS c FROM mass');
        db2.close();
        return {
          path: dbPath,
          members: memberCount[0]?.c || 0,
          masses: massCount[0]?.c || 0,
        };
      }
    } catch {
      // try next path
    }
  }
  return null;
}

async function migrateFromFlask(sqlitePath) {
  const source = await openSqlite(sqlitePath);
  await initializeDatabase();

  const members = await sqliteAll(source, 'SELECT * FROM member');
  const priests = await sqliteAll(source, 'SELECT * FROM priest');
  const roles = await sqliteAll(source, 'SELECT * FROM community_role');
  const memberRoles = await sqliteAll(source, 'SELECT * FROM member_roles');
  const massTypes = await sqliteAll(source, 'SELECT * FROM mass_type');
  const masses = await sqliteAll(source, 'SELECT * FROM mass');
  const assignments = await sqliteAll(source, 'SELECT * FROM mass_assignment');
  const apostles = await sqliteAll(source, 'SELECT * FROM apostle');
  const departedSouls = await sqliteAll(source, 'SELECT * FROM departed_soul');
  const changeLogs = await sqliteAll(source, 'SELECT * FROM mass_change_log');

  console.log(
    `Source ${sqlitePath}: ${members.length} members, ${masses.length} masses, ${assignments.length} assignments`
  );

  if (members.length === 0 && masses.length === 0) {
    source.close();
    throw new Error('No member or mass data found in Flask database.');
  }

  const existingMembers = await dbGet('SELECT COUNT(*) AS c FROM members');
  if (Number(existingMembers?.c || 0) > 0) {
    console.log('Node tables already have data. Clearing before import...');
    await dbRun('DELETE FROM mass_change_logs');
    await dbRun('DELETE FROM departed_souls');
    await dbRun('DELETE FROM apostles');
    await dbRun('DELETE FROM mass_assignments');
    await dbRun('DELETE FROM masses');
    await dbRun('DELETE FROM member_roles');
    await dbRun('DELETE FROM members');
    await dbRun('DELETE FROM priests');
  }

  for (const m of members) {
    await dbRun(
      'INSERT INTO members (id, name, phone, email, active, experience_level, years_of_service, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        m.id,
        m.name,
        m.phone,
        m.email,
        m.active ? 1 : 0,
        m.experience_level,
        m.years_of_service,
        m.created_at,
      ]
    );
  }

  for (const p of priests) {
    await dbRun(
      'INSERT INTO priests (id, name, title, phone, active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [p.id, p.name, p.title, p.phone, p.active ? 1 : 0, p.created_at]
    );
  }

  for (const r of roles) {
    const exists = await dbGet('SELECT id FROM community_roles WHERE id = ?', [r.id]);
    if (!exists) {
      await dbRun(
        'INSERT INTO community_roles (id, name, category, description) VALUES (?, ?, ?, ?)',
        [r.id, r.name, r.category, r.description]
      );
    }
  }

  for (const mr of memberRoles) {
    await dbRun('INSERT OR IGNORE INTO member_roles (member_id, role_id) VALUES (?, ?)', [
      mr.member_id,
      mr.role_id,
    ]);
  }

  for (const mt of massTypes) {
    const exists = await dbGet('SELECT id FROM mass_types WHERE id = ?', [mt.id]);
    if (!exists) {
      await dbRun(
        `INSERT INTO mass_types (
          id, name, default_time, description, is_special_event, required_roles,
          has_gospel_narration, has_mc_reader, has_third_reading, has_apostles,
          has_thanksgiving, has_carols, has_morning_adoration, has_departed_souls_reader
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mt.id,
          mt.name,
          mt.default_time,
          mt.description,
          mt.is_special_event ? 1 : 0,
          mt.required_roles,
          mt.has_gospel_narration ? 1 : 0,
          mt.has_mc_reader ? 1 : 0,
          mt.has_third_reading ? 1 : 0,
          mt.has_apostles ? 1 : 0,
          mt.has_thanksgiving ? 1 : 0,
          mt.has_carols ? 1 : 0,
          mt.has_morning_adoration ? 1 : 0,
          mt.has_departed_souls_reader ? 1 : 0,
        ]
      );
    }
  }

  for (const mass of masses) {
    await dbRun(
      'INSERT INTO masses (id, mass_type_id, date, time, celebrant, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        mass.id,
        mass.mass_type_id,
        mass.date,
        mass.time,
        mass.celebrant,
        mass.notes,
        mass.created_at,
      ]
    );
  }

  for (const a of assignments) {
    await dbRun(
      'INSERT INTO mass_assignments (id, mass_id, member_id, role, member_name_override, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [a.id, a.mass_id, a.member_id, a.role, a.member_name_override, a.notes]
    );
  }

  for (const a of apostles) {
    await dbRun(
      'INSERT INTO apostles (id, mass_id, apostle_name, member_id, member_name_override) VALUES (?, ?, ?, ?, ?)',
      [a.id, a.mass_id, a.apostle_name, a.member_id, a.member_name_override]
    );
  }

  for (const s of departedSouls) {
    await dbRun(
      'INSERT INTO departed_souls (id, mass_id, name, family_name) VALUES (?, ?, ?, ?)',
      [s.id, s.mass_id, s.name, s.family_name]
    );
  }

  for (const log of changeLogs) {
    await dbRun(
      `INSERT INTO mass_change_logs
       (id, mass_id, changed_at, changed_by, change_reason, field_changed, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.mass_id,
        log.changed_at,
        log.changed_by,
        log.change_reason,
        log.field_changed,
        log.old_value,
        log.new_value,
      ]
    );
  }

  source.close();

  const summary = await dbAll(
    `SELECT
      (SELECT COUNT(*) FROM members) AS members,
      (SELECT COUNT(*) FROM masses) AS masses,
      (SELECT COUNT(*) FROM mass_assignments) AS assignments`
  );
  console.log('Import complete:', summary[0]);
}

async function main() {
  const found = await findFlaskDatabase();
  if (!found) {
    console.error('No Flask database (member table) found in:');
    candidates.forEach((p) => console.error('  -', p));
    process.exit(1);
  }

  console.log(`Using Flask DB: ${found.path} (${found.members} members, ${found.masses} masses)`);
  if (found.members === 0 && found.masses === 0) {
    console.error(
      '\nBoth local SQLite files only contain default seed data (mass types & roles), not your members/masses.'
    );
    console.error('If you used Neon or another PC, data may be there — not in these local files.');
    process.exit(1);
  }

  await migrateFromFlask(found.path);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
