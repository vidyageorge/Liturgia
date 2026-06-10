/**
 * Import Holy Week 2024 masses into DATABASE_URL (Neon).
 * Usage: node scripts/import-holy-week-2024.js
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const { Pool } = require('pg');
const {
  initializeDatabase,
  memberQueries,
  massTypeQueries,
  massQueries,
  assignmentQueries,
} = require('../server/database');

const HOLY_WEEK_2024 = [
  {
    date: '2024-03-24',
    massType: 'Palm Sunday',
    time: '7:30 AM',
    notes: 'Holy Week 2024 — Palm Sunday',
    assignments: {
      mc_reader: ['Blessy'],
      first_reading: ['Peria'],
      second_reading: ['Noela Kalanidhi'],
      gospel_narrator: [
        'Sangeetha',
        'Frazer Noronha',
        'Hayeden',
        'Charles M',
        'Riahanna',
        'Piggot',
        'Rachel',
      ],
    },
  },
  {
    date: '2024-03-28',
    massType: 'Maundy Thursday',
    time: '5:30 PM',
    notes: 'Holy Week 2024 — Maundy Thursday',
    assignments: {
      mc_reader: ['Vimala'],
      first_reading: ['Sandra'],
      second_reading: ['Clayton Fernando'],
      prayer_of_faithful: ['Peria'],
    },
  },
  {
    date: '2024-03-29',
    massType: 'Good Friday',
    time: '5:30 PM',
    notes: 'Holy Week 2024 — Good Friday',
    assignments: {
      morning_adoration: ['Vidya'],
      mc_reader: ['Sangeetha'],
      way_of_cross: ['Sangeetha'],
      first_reading: ['Melville Fernandez'],
      second_reading: ['Claudia'],
      gospel_narrator: ['Frazer Noronha'],
    },
  },
  {
    date: '2024-03-30',
    massType: 'Easter Vigil',
    time: '11:15 PM',
    notes: 'Holy Week 2024 — Easter Vigil',
    assignments: {
      mc_reader: ['Claudia'],
      first_reading: ['Joachim'],
      second_reading: ['Divya'],
      third_reading: ['Geetha'],
      fourth_reading: ['Pamela'],
      prayer_of_faithful: ['Noela Kalanidhi'],
      vote_of_thanks: ['Pamela'],
    },
  },
  {
    date: '2024-03-31',
    massType: 'Easter Morning Mass',
    time: '7:15 AM',
    notes: 'Holy Week 2024 — Easter Morning Mass',
    assignments: {
      first_reading: ['Charles M'],
      second_reading: ['Naathan'],
      prayer_of_faithful: ['Shanthi Anand'],
    },
  },
];

async function importHolyWeek() {
  await initializeDatabase();

  const massTypes = await massTypeQueries.getAll();
  const massTypeIds = new Map(massTypes.map((t) => [t.name, t.id]));

  const memberCache = new Map();
  for (const member of await memberQueries.getAll()) {
    memberCache.set(member.name.toLowerCase(), member.id);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const existingDateRows = await pool.query('SELECT date::text AS date FROM masses');
  const existingDates = new Set(existingDateRows.rows.map((r) => r.date));

  async function ensureMember(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const key = trimmed.toLowerCase();
    if (memberCache.has(key)) return memberCache.get(key);
    const result = await memberQueries.create(trimmed, null, null);
    memberCache.set(key, result.lastID);
    return result.lastID;
  }

  let massesCreated = 0;
  let assignmentsCreated = 0;

  for (const entry of HOLY_WEEK_2024) {
    if (existingDates.has(entry.date)) {
      console.log(`Skip ${entry.date} — mass already exists`);
      continue;
    }

    const massTypeId = massTypeIds.get(entry.massType);
    if (!massTypeId) throw new Error(`Mass type not found: ${entry.massType}`);

    const mass = await massQueries.create({
      mass_type_id: massTypeId,
      date: entry.date,
      time: entry.time,
      notes: entry.notes,
    });
    massesCreated += 1;
    existingDates.add(entry.date);

    const payload = [];
    for (const [role, names] of Object.entries(entry.assignments)) {
      for (const name of names) {
        if (!name?.trim()) continue;
        const memberId = await ensureMember(name);
        payload.push({
          role,
          member_id: memberId,
          member_name: name.trim(),
        });
        assignmentsCreated += 1;
      }
    }

    if (payload.length > 0) {
      await assignmentQueries.bulkUpdate(mass.id, payload, 'Imported Holy Week 2024');
    }

    console.log(`Added ${entry.date} — ${entry.notes}`);
  }

  await pool.end();
  console.log('');
  console.log(`Done: ${massesCreated} masses, ${assignmentsCreated} assignments`);
  console.log(`Readers in database: ${memberCache.size}`);
}

importHolyWeek().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
