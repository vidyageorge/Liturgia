const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { DEFAULT_MASS_TYPES, DEFAULT_COMMUNITY_ROLES } = require('./seedData');
const {
  toDateString,
  mapMassTypeRow,
  buildMassResponse,
} = require('./massHelpers');

const rawUrl = process.env.DATABASE_URL;
const databaseUrl = rawUrl ? String(rawUrl).replace(/^["']|["']$/g, '').trim() : '';
const usePg = Boolean(databaseUrl);

function toPgPlaceholders(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

let db;
let dbRun;
let dbGet;
let dbAll;
let initializeDatabase;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    active INTEGER DEFAULT 1,
    experience_level TEXT,
    years_of_service INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS priests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Fr.',
    phone TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS community_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS member_roles (
    member_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (member_id, role_id),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES community_roles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mass_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_time TEXT,
    description TEXT,
    is_special_event INTEGER DEFAULT 0,
    required_roles TEXT,
    has_gospel_narration INTEGER DEFAULT 0,
    has_mc_reader INTEGER DEFAULT 0,
    has_third_reading INTEGER DEFAULT 0,
    has_apostles INTEGER DEFAULT 0,
    has_thanksgiving INTEGER DEFAULT 0,
    has_carols INTEGER DEFAULT 0,
    has_morning_adoration INTEGER DEFAULT 0,
    has_departed_souls_reader INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS masses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mass_type_id INTEGER NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    celebrant TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mass_type_id) REFERENCES mass_types(id)
  );

  CREATE TABLE IF NOT EXISTS mass_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mass_id INTEGER NOT NULL,
    member_id INTEGER,
    role TEXT NOT NULL,
    member_name_override TEXT,
    notes TEXT,
    FOREIGN KEY (mass_id) REFERENCES masses(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS apostles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mass_id INTEGER NOT NULL,
    apostle_name TEXT NOT NULL,
    member_id INTEGER,
    member_name_override TEXT,
    FOREIGN KEY (mass_id) REFERENCES masses(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS departed_souls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mass_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    family_name TEXT,
    FOREIGN KEY (mass_id) REFERENCES masses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mass_change_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mass_id INTEGER NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT,
    change_reason TEXT NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    FOREIGN KEY (mass_id) REFERENCES masses(id) ON DELETE CASCADE
  );
`;

const PG_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    active INTEGER DEFAULT 1,
    experience_level TEXT,
    years_of_service INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS priests (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Fr.',
    phone TEXT,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS community_roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS member_roles (
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES community_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, role_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mass_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    default_time TEXT,
    description TEXT,
    is_special_event INTEGER DEFAULT 0,
    required_roles TEXT,
    has_gospel_narration INTEGER DEFAULT 0,
    has_mc_reader INTEGER DEFAULT 0,
    has_third_reading INTEGER DEFAULT 0,
    has_apostles INTEGER DEFAULT 0,
    has_thanksgiving INTEGER DEFAULT 0,
    has_carols INTEGER DEFAULT 0,
    has_morning_adoration INTEGER DEFAULT 0,
    has_departed_souls_reader INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS masses (
    id SERIAL PRIMARY KEY,
    mass_type_id INTEGER NOT NULL REFERENCES mass_types(id),
    date DATE NOT NULL,
    time TEXT,
    celebrant TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS mass_assignments (
    id SERIAL PRIMARY KEY,
    mass_id INTEGER NOT NULL REFERENCES masses(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id),
    role TEXT NOT NULL,
    member_name_override TEXT,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS apostles (
    id SERIAL PRIMARY KEY,
    mass_id INTEGER NOT NULL REFERENCES masses(id) ON DELETE CASCADE,
    apostle_name TEXT NOT NULL,
    member_id INTEGER REFERENCES members(id),
    member_name_override TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS departed_souls (
    id SERIAL PRIMARY KEY,
    mass_id INTEGER NOT NULL REFERENCES masses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    family_name TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS mass_change_logs (
    id SERIAL PRIMARY KEY,
    mass_id INTEGER NOT NULL REFERENCES masses(id) ON DELETE CASCADE,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT,
    change_reason TEXT NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT
  )`,
];

async function seedDefaults() {
  const massTypeCount = await dbGet('SELECT COUNT(*) AS count FROM mass_types');
  if (Number(massTypeCount?.count || 0) === 0) {
    for (const mt of DEFAULT_MASS_TYPES) {
      await dbRun(
        `INSERT INTO mass_types (
          name, default_time, description, is_special_event, required_roles,
          has_gospel_narration, has_mc_reader, has_third_reading, has_apostles,
          has_thanksgiving, has_carols, has_morning_adoration, has_departed_souls_reader
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mt.name,
          mt.default_time || '',
          mt.description || '',
          mt.is_special_event ? 1 : 0,
          JSON.stringify(mt.required_roles || []),
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

  const roleCount = await dbGet('SELECT COUNT(*) AS count FROM community_roles');
  if (Number(roleCount?.count || 0) === 0) {
    for (const role of DEFAULT_COMMUNITY_ROLES) {
      await dbRun(
        'INSERT INTO community_roles (name, category, description) VALUES (?, ?, ?)',
        [role.name, role.category, role.description]
      );
    }
  }
}

if (usePg) {
  const { Pool } = require('pg');
  const needsSsl = databaseUrl.includes('render.com') || databaseUrl.includes('neon.tech');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  dbRun = (sql, params = []) => {
    const pgSql = sql.trim().toUpperCase().startsWith('INSERT') && !sql.includes('RETURNING')
      ? `${toPgPlaceholders(sql)} RETURNING id`
      : toPgPlaceholders(sql);
    return pool.query(pgSql, params).then((result) => ({
      lastID: result.rows[0]?.id ?? null,
      changes: result.rowCount ?? 0,
    }));
  };

  dbGet = (sql, params = []) =>
    pool.query(toPgPlaceholders(sql), params).then((r) => r.rows[0] ?? null);

  dbAll = (sql, params = []) =>
    pool.query(toPgPlaceholders(sql), params).then((r) => r.rows ?? []);

  db = pool;

  initializeDatabase = async () => {
    for (const statement of PG_SCHEMA_STATEMENTS) {
      await pool.query(statement);
    }
    await seedDefaults();
    const hostLabel = (() => {
      try {
        return new URL(databaseUrl).hostname;
      } catch {
        return 'postgresql';
      }
    })();
    console.log(`Database initialized (PostgreSQL @ ${hostLabel})`);
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'liturgia.db');
  const dbDir = path.dirname(dbPath);
  if (dbDir && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new sqlite3.Database(dbPath);

  dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });

  dbGet = promisify(db.get.bind(db));
  dbAll = promisify(db.all.bind(db));

  initializeDatabase = async () => {
    const statements = SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await dbRun(statement);
    }
    await seedDefaults();
    console.log(`Database initialized (SQLite @ ${dbPath})`);
  };
}

const yearFilterSql = usePg
  ? 'EXTRACT(YEAR FROM masses.date) = ?'
  : "strftime('%Y', masses.date) = ?";

async function getMemberRoles(memberId) {
  const rows = await dbAll(
    `SELECT cr.name FROM community_roles cr
     JOIN member_roles mr ON mr.role_id = cr.id
     WHERE mr.member_id = ?`,
    [memberId]
  );
  return rows.map((r) => r.name);
}

const memberQueries = {
  getAll: async () => {
    const members = await dbAll('SELECT * FROM members WHERE active = 1 ORDER BY name');
    const currentYear = String(new Date().getFullYear());
    const result = [];
    for (const m of members) {
      const currentYearRow = await dbGet(
        `SELECT COUNT(*) AS count FROM mass_assignments ma
         JOIN masses ON masses.id = ma.mass_id
         WHERE ma.member_id = ? AND ${yearFilterSql}`,
        [m.id, currentYear]
      );
      const totalRow = await dbGet(
        'SELECT COUNT(*) AS count FROM mass_assignments WHERE member_id = ?',
        [m.id]
      );
      const roles = await getMemberRoles(m.id);
      const createdAt = toDateString(m.created_at);
      result.push({
        id: m.id,
        name: m.name,
        phone: m.phone,
        email: m.email,
        active: Boolean(m.active),
        experience_level: m.experience_level,
        years_of_service: m.years_of_service,
        roles,
        reading_count: Number(totalRow?.count || 0),
        current_year_count: Number(currentYearRow?.count || 0),
        total_readings: Number(totalRow?.count || 0),
        created_at: createdAt,
        member_since: createdAt
          ? new Date(createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : 'Unknown',
      });
    }
    return result;
  },
  getById: async (id) => {
    const m = await dbGet('SELECT * FROM members WHERE id = ?', [id]);
    if (!m) return null;
    return {
      id: m.id,
      name: m.name,
      phone: m.phone,
      email: m.email,
      active: Boolean(m.active),
      experience_level: m.experience_level,
      years_of_service: m.years_of_service,
      roles: await getMemberRoles(m.id),
    };
  },
  create: (name, phone, email) =>
    dbRun('INSERT INTO members (name, phone, email) VALUES (?, ?, ?)', [name, phone || null, email || null]),
  update: (id, data) =>
    dbRun(
      `UPDATE members SET name = ?, phone = ?, email = ?, active = ?,
       experience_level = ?, years_of_service = ? WHERE id = ?`,
      [
        data.name,
        data.phone || null,
        data.email || null,
        data.active === false ? 0 : 1,
        data.experience_level || null,
        data.years_of_service ?? null,
        id,
      ]
    ),
  deactivate: (id) => dbRun('UPDATE members SET active = 0 WHERE id = ?', [id]),
  addRole: (memberId, roleId) => {
    if (usePg) {
      return dbRun(
        'INSERT INTO member_roles (member_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [memberId, roleId]
      );
    }
    return dbRun('INSERT OR IGNORE INTO member_roles (member_id, role_id) VALUES (?, ?)', [
      memberId,
      roleId,
    ]);
  },
  removeRole: (memberId, roleId) =>
    dbRun('DELETE FROM member_roles WHERE member_id = ? AND role_id = ?', [memberId, roleId]),
  getHistory: async (id) => {
    const rows = await dbAll(
      `SELECT m.date, mt.name AS mass_type, ma.role
       FROM mass_assignments ma
       JOIN masses m ON m.id = ma.mass_id
       LEFT JOIN mass_types mt ON mt.id = m.mass_type_id
       WHERE ma.member_id = ?
       ORDER BY m.date DESC`,
      [id]
    );
    return rows.map((r) => ({
      date: toDateString(r.date),
      mass_type: r.mass_type || 'Unknown',
      role: r.role,
    }));
  },
};

const priestQueries = {
  getAll: async () => {
    const rows = await dbAll('SELECT * FROM priests WHERE active = 1 ORDER BY name');
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title || 'Fr.',
      full_name: p.title ? `${p.title} ${p.name}` : p.name,
      phone: p.phone,
      active: Boolean(p.active),
    }));
  },
  create: (name, title, phone) =>
    dbRun('INSERT INTO priests (name, title, phone) VALUES (?, ?, ?)', [name, title || 'Fr.', phone || null]),
  update: (id, data) =>
    dbRun('UPDATE priests SET name = ?, title = ?, phone = ?, active = ? WHERE id = ?', [
      data.name,
      data.title || 'Fr.',
      data.phone || null,
      data.active === false ? 0 : 1,
      id,
    ]),
  deactivate: (id) => dbRun('UPDATE priests SET active = 0 WHERE id = ?', [id]),
};

const roleQueries = {
  getAll: async () => {
    const roles = await dbAll('SELECT * FROM community_roles ORDER BY category, name');
    const result = [];
    for (const role of roles) {
      const members = await dbAll(
        `SELECT m.name FROM members m
         JOIN member_roles mr ON mr.member_id = m.id
         WHERE mr.role_id = ? AND m.active = 1
         ORDER BY m.name`,
        [role.id]
      );
      result.push({
        id: role.id,
        name: role.name,
        category: role.category,
        description: role.description,
        members: members.map((m) => m.name),
      });
    }
    return result;
  },
  create: (name, category, description) =>
    dbRun('INSERT INTO community_roles (name, category, description) VALUES (?, ?, ?)', [
      name,
      category || null,
      description || null,
    ]),
};

const massTypeQueries = {
  getAll: async () => {
    const rows = await dbAll('SELECT * FROM mass_types ORDER BY name');
    return rows.map(mapMassTypeRow);
  },
  getById: async (id) => mapMassTypeRow(await dbGet('SELECT * FROM mass_types WHERE id = ?', [id])),
  create: async (data) => {
    const result = await dbRun(
      `INSERT INTO mass_types (
        name, default_time, description, is_special_event, required_roles,
        has_gospel_narration, has_mc_reader, has_third_reading, has_apostles,
        has_thanksgiving, has_carols, has_morning_adoration, has_departed_souls_reader
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.default_time || '',
        data.description || '',
        data.is_special_event ? 1 : 0,
        JSON.stringify(data.required_roles || []),
        data.has_gospel_narration ? 1 : 0,
        data.has_mc_reader ? 1 : 0,
        data.has_third_reading ? 1 : 0,
        data.has_apostles ? 1 : 0,
        data.has_thanksgiving ? 1 : 0,
        data.has_carols ? 1 : 0,
        data.has_morning_adoration ? 1 : 0,
        data.has_departed_souls_reader ? 1 : 0,
      ]
    );
    return massTypeQueries.getById(result.lastID);
  },
};

async function loadMassDetails(massRow) {
  const massType = mapMassTypeRow(
    await dbGet('SELECT * FROM mass_types WHERE id = ?', [massRow.mass_type_id])
  );
  const assignments = await dbAll(
    `SELECT ma.*, m.name AS member_name
     FROM mass_assignments ma
     LEFT JOIN members m ON m.id = ma.member_id
     WHERE ma.mass_id = ?
     ORDER BY ma.id`,
    [massRow.id]
  );
  const apostles = await dbAll(
    `SELECT a.*, m.name AS member_name
     FROM apostles a
     LEFT JOIN members m ON m.id = a.member_id
     WHERE a.mass_id = ?
     ORDER BY a.id`,
    [massRow.id]
  );
  const departedSouls = await dbAll('SELECT * FROM departed_souls WHERE mass_id = ? ORDER BY id', [
    massRow.id,
  ]);
  return buildMassResponse(massRow, massType, assignments, apostles, departedSouls);
}

const massQueries = {
  getAll: async () => {
    const rows = await dbAll('SELECT * FROM masses ORDER BY date DESC');
    const result = [];
    for (const row of rows) {
      result.push(await loadMassDetails(row));
    }
    return result;
  },
  getUpcoming: async () => {
    const today = new Date().toISOString().split('T')[0];
    const rows = await dbAll('SELECT * FROM masses WHERE date >= ? ORDER BY date ASC', [today]);
    const result = [];
    for (const row of rows) {
      result.push(await loadMassDetails(row));
    }
    return result;
  },
  getPast: async (limit = 50) => {
    const today = new Date().toISOString().split('T')[0];
    const rows = await dbAll('SELECT * FROM masses WHERE date < ? ORDER BY date DESC LIMIT ?', [
      today,
      limit,
    ]);
    const result = [];
    for (const row of rows) {
      result.push(await loadMassDetails(row));
    }
    return result;
  },
  getById: async (id) => {
    const row = await dbGet('SELECT * FROM masses WHERE id = ?', [id]);
    if (!row) return null;
    return loadMassDetails(row);
  },
  create: async (data) => {
    const result = await dbRun(
      'INSERT INTO masses (mass_type_id, date, time, celebrant, notes) VALUES (?, ?, ?, ?, ?)',
      [
        data.mass_type_id,
        data.date,
        data.time || null,
        data.celebrant || null,
        data.notes || null,
      ]
    );
    return massQueries.getById(result.lastID);
  },
  update: async (id, data) => {
    const mass = await dbGet('SELECT * FROM masses WHERE id = ?', [id]);
    if (!mass) return null;

    const changes = [];
    if (data.mass_type_id !== undefined && data.mass_type_id !== mass.mass_type_id) {
      const oldType = await massTypeQueries.getById(mass.mass_type_id);
      const newType = await massTypeQueries.getById(data.mass_type_id);
      changes.push({ field: 'mass_type', old: oldType?.name || 'None', new: newType?.name || 'None' });
    }
    if (data.date !== undefined && data.date !== toDateString(mass.date)) {
      changes.push({ field: 'date', old: toDateString(mass.date), new: data.date });
    }
    if (data.time !== undefined && (data.time || '') !== (mass.time || '')) {
      changes.push({ field: 'time', old: mass.time || '', new: data.time || '' });
    }
    if (data.celebrant !== undefined && (data.celebrant || '') !== (mass.celebrant || '')) {
      changes.push({ field: 'celebrant', old: mass.celebrant || '', new: data.celebrant || '' });
    }
    if (data.notes !== undefined && (data.notes || '') !== (mass.notes || '')) {
      changes.push({ field: 'notes', old: mass.notes || '', new: data.notes || '' });
    }

    await dbRun(
      'UPDATE masses SET mass_type_id = ?, date = ?, time = ?, celebrant = ?, notes = ? WHERE id = ?',
      [
        data.mass_type_id ?? mass.mass_type_id,
        data.date ?? toDateString(mass.date),
        data.time !== undefined ? data.time : mass.time,
        data.celebrant !== undefined ? data.celebrant : mass.celebrant,
        data.notes !== undefined ? data.notes : mass.notes,
        id,
      ]
    );

    if (data.change_reason && changes.length > 0) {
      for (const change of changes) {
        await changeLogQueries.create({
          mass_id: id,
          changed_by: data.changed_by || 'System',
          change_reason: data.change_reason,
          field_changed: change.field,
          old_value: change.old,
          new_value: change.new,
        });
      }
    }

    return massQueries.getById(id);
  },
  delete: (id) => dbRun('DELETE FROM masses WHERE id = ?', [id]),
  getForExport: async ({ year, startDate, endDate }) => {
    let rows;
    if (year) {
      if (usePg) {
        rows = await dbAll('SELECT * FROM masses WHERE EXTRACT(YEAR FROM date) = ? ORDER BY date ASC', [
          Number(year),
        ]);
      } else {
        rows = await dbAll("SELECT * FROM masses WHERE strftime('%Y', date) = ? ORDER BY date ASC", [
          String(year),
        ]);
      }
    } else {
      const params = [];
      let sql = 'SELECT * FROM masses WHERE 1=1';
      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }
      sql += ' ORDER BY date ASC';
      rows = await dbAll(sql, params);
    }
    const result = [];
    for (const row of rows) {
      result.push(await loadMassDetails(row));
    }
    return result;
  },
};

const assignmentQueries = {
  upsert: async (massId, data) => {
    const { member_id: memberId, member_name_override: override, role, notes } = data;
    let existing = null;
    if (memberId) {
      existing = await dbGet(
        'SELECT * FROM mass_assignments WHERE mass_id = ? AND role = ? AND member_id = ?',
        [massId, role, memberId]
      );
    } else if (override) {
      existing = await dbGet(
        'SELECT * FROM mass_assignments WHERE mass_id = ? AND role = ? AND member_name_override = ?',
        [massId, role, override]
      );
    }
    if (existing) {
      await dbRun(
        'UPDATE mass_assignments SET member_id = ?, member_name_override = ?, notes = ? WHERE id = ?',
        [memberId || null, override || null, notes || null, existing.id]
      );
    } else {
      await dbRun(
        'INSERT INTO mass_assignments (mass_id, member_id, role, member_name_override, notes) VALUES (?, ?, ?, ?, ?)',
        [massId, memberId || null, role, override || null, notes || null]
      );
    }
    return massQueries.getById(massId);
  },
  delete: (id) => dbRun('DELETE FROM mass_assignments WHERE id = ?', [id]),
  bulkUpdate: async (massId, assignments, changeReason, changedBy) => {
    const existing = await dbAll(
      `SELECT ma.*, m.name AS member_name
       FROM mass_assignments ma
       LEFT JOIN members m ON m.id = ma.member_id
       WHERE ma.mass_id = ?`,
      [massId]
    );

    const existingByRole = {};
    for (const a of existing) {
      if (!existingByRole[a.role]) existingByRole[a.role] = [];
      existingByRole[a.role].push(a.member_name || a.member_name_override || '');
    }

    const newByRole = {};
    for (const a of assignments) {
      if (!newByRole[a.role]) newByRole[a.role] = [];
      newByRole[a.role].push(a.member_name || '');
    }

    const allRoles = new Set([...Object.keys(existingByRole), ...Object.keys(newByRole)]);
    for (const role of allRoles) {
      const oldReaders = [...(existingByRole[role] || [])].sort();
      const newReaders = [...(newByRole[role] || [])].sort();
      if (JSON.stringify(oldReaders) !== JSON.stringify(newReaders)) {
        await changeLogQueries.create({
          mass_id: massId,
          changed_by: changedBy || 'System',
          change_reason: changeReason || 'Reader assignment updated',
          field_changed: `${role}_reader`,
          old_value: oldReaders.length ? oldReaders.join(', ') : '(none)',
          new_value: newReaders.length ? newReaders.join(', ') : '(none)',
        });
      }
    }

    await dbRun('DELETE FROM mass_assignments WHERE mass_id = ?', [massId]);
    for (const a of assignments) {
      await dbRun(
        'INSERT INTO mass_assignments (mass_id, member_id, role, member_name_override, notes) VALUES (?, ?, ?, ?, ?)',
        [
          massId,
          a.member_id || null,
          a.role,
          a.member_id ? null : a.member_name || null,
          a.notes || null,
        ]
      );
    }
    return massQueries.getById(massId);
  },
};

const apostleQueries = {
  add: async (massId, data) => {
    await dbRun(
      'INSERT INTO apostles (mass_id, apostle_name, member_id, member_name_override) VALUES (?, ?, ?, ?)',
      [massId, data.apostle_name, data.member_id || null, data.member_name_override || null]
    );
    return massQueries.getById(massId);
  },
  delete: (id) => dbRun('DELETE FROM apostles WHERE id = ?', [id]),
};

const departedSoulQueries = {
  getByMass: async (massId) => {
    const rows = await dbAll('SELECT * FROM departed_souls WHERE mass_id = ? ORDER BY id', [massId]);
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      family_name: s.family_name,
    }));
  },
  add: async (massId, data) => {
    const result = await dbRun(
      'INSERT INTO departed_souls (mass_id, name, family_name) VALUES (?, ?, ?)',
      [massId, data.name, data.family_name || null]
    );
    const row = await dbGet('SELECT * FROM departed_souls WHERE id = ?', [result.lastID]);
    return {
      id: row.id,
      name: row.name,
      family_name: row.family_name,
    };
  },
  delete: (id) => dbRun('DELETE FROM departed_souls WHERE id = ?', [id]),
};

const changeLogQueries = {
  create: (data) =>
    dbRun(
      `INSERT INTO mass_change_logs
       (mass_id, changed_by, change_reason, field_changed, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.mass_id,
        data.changed_by || 'System',
        data.change_reason,
        data.field_changed || null,
        data.old_value || null,
        data.new_value || null,
      ]
    ),
  getByMass: async (massId) => {
    const rows = await dbAll(
      'SELECT * FROM mass_change_logs WHERE mass_id = ? ORDER BY changed_at DESC',
      [massId]
    );
    return rows.map(mapChangeLogRow);
  },
  getAll: async (limit) => {
    const sql = limit
      ? 'SELECT * FROM mass_change_logs ORDER BY changed_at DESC LIMIT ?'
      : 'SELECT * FROM mass_change_logs ORDER BY changed_at DESC';
    const rows = limit ? await dbAll(sql, [limit]) : await dbAll(sql);
    const result = [];
    for (const row of rows) {
      const log = mapChangeLogRow(row);
      const mass = await dbGet('SELECT m.date, mt.name AS mass_type FROM masses m LEFT JOIN mass_types mt ON mt.id = m.mass_type_id WHERE m.id = ?', [row.mass_id]);
      log.mass_date = mass ? toDateString(mass.date) : null;
      log.mass_type = mass?.mass_type || 'Unknown';
      result.push(log);
    }
    return result;
  },
};

function mapChangeLogRow(row) {
  return {
    id: row.id,
    mass_id: row.mass_id,
    changed_at: row.changed_at ? String(row.changed_at).replace('T', ' ').slice(0, 19) : null,
    changed_by: row.changed_by,
    change_reason: row.change_reason,
    field_changed: row.field_changed,
    old_value: row.old_value,
    new_value: row.new_value,
  };
}

const statsQueries = {
  get: async () => {
    const totalMembers = await dbGet('SELECT COUNT(*) AS count FROM members WHERE active = 1');
    const totalMasses = await dbGet('SELECT COUNT(*) AS count FROM masses');
    const today = new Date().toISOString().split('T')[0];
    const upcomingMasses = await dbGet('SELECT COUNT(*) AS count FROM masses WHERE date >= ?', [today]);
    const topVolunteers = await dbAll(
      `SELECT m.id, m.name, COUNT(ma.id) AS reading_count
       FROM members m
       JOIN mass_assignments ma ON ma.member_id = m.id
       WHERE m.active = 1
       GROUP BY m.id, m.name
       ORDER BY reading_count DESC
       LIMIT 3`
    );
    return {
      total_members: Number(totalMembers?.count || 0),
      total_masses: Number(totalMasses?.count || 0),
      upcoming_masses: Number(upcomingMasses?.count || 0),
      top_volunteers: topVolunteers.map((v) => ({
        id: v.id,
        name: v.name,
        reading_count: Number(v.reading_count),
      })),
    };
  },
};

function getDatabaseInfo() {
  if (!usePg) {
    const sqlitePath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'liturgia.db');
    return { driver: 'sqlite', path: sqlitePath };
  }
  try {
    const parsed = new URL(databaseUrl);
    return {
      driver: 'postgresql',
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, '').split('?')[0] || 'unknown',
    };
  } catch {
    return { driver: 'postgresql', host: 'configured' };
  }
}

module.exports = {
  db,
  usePg,
  initializeDatabase,
  getDatabaseInfo,
  memberQueries,
  priestQueries,
  roleQueries,
  massTypeQueries,
  massQueries,
  assignmentQueries,
  apostleQueries,
  departedSoulQueries,
  changeLogQueries,
  statsQueries,
};
