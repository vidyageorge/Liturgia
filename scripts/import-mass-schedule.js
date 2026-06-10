/**
 * Import mass schedule data into DATABASE_URL (Neon) or local Postgres.
 * Usage: npm run import-schedule
 */
const path = require('path');

const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

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

const SCHEDULE = [
  {
    date: '2026-01-04',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Epiphany of our Lord (Introduction: available)',
    assignments: {
      first_reading: ['Haeden Noronha'],
      second_reading: ['Nadhiya Kalanidhi'],
      prayer_of_faithful: ['Maria Rinnha'],
    },
  },
  {
    date: '2026-01-11',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Solemnity - Baptism of our Lord',
    assignments: {
      introduction: ['Liji Sijish'],
      first_reading: ['Nancy John Bhaskar'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Mary Celma'],
    },
  },
  {
    date: '2026-01-18',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '2nd Sunday in Ordinary Time',
    assignments: {
      introduction: ['Pamela'],
      first_reading: ['Infant Jennifer'],
      second_reading: ['Frazer Noronha'],
      prayer_of_faithful: ['Clayton Fernando'],
    },
  },
  {
    date: '2026-01-25',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '3rd Sunday in Ordinary Time',
    assignments: {
      introduction: ['Charles M'],
      first_reading: ['Xavier Geetha'],
      second_reading: ['V J Kavin'],
      prayer_of_faithful: ['Reshma Philomin'],
    },
  },
  {
    date: '2026-02-01',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '4th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Justin Prabhakar'],
      first_reading: ['Liji Sijish'],
      second_reading: ['Maria Shruthi Chris'],
      prayer_of_faithful: ['Shanthi Anand'],
    },
  },
  {
    date: '2026-02-08',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '5th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Frazer Noronha'],
      first_reading: ['Elizabeth John'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Rita Siluvai'],
    },
  },
  {
    date: '2026-02-15',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '6th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Maria Rinnha'],
      first_reading: ['Nancy John Bhaskar'],
      second_reading: ['Sheba Fernando'],
      prayer_of_faithful: ['Noela Kalanidhi'],
    },
  },
  {
    date: '2026-02-18',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Ash Wednesday',
    assignments: {
      introduction: ['Florence'],
      first_reading: ['Sangeetha Lourdes'],
      second_reading: ['Catherine Kalpana'],
    },
  },
  {
    date: '2026-02-22',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '1st Sunday of Lent',
    assignments: {
      introduction: ['Nadhiya Kalanidhi'],
      first_reading: ['Claudia Fernando'],
      second_reading: ['Charles M'],
      prayer_of_faithful: ['Jessica Xavier'],
    },
  },
  {
    date: '2026-03-01',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '2nd Sunday of Lent',
    assignments: {
      introduction: ['Elizabeth John'],
      first_reading: ['Reshma Philomin'],
      second_reading: ['Patrick Joseph'],
      prayer_of_faithful: ['Varun Raghukumar'],
    },
  },
  {
    date: '2026-03-08',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: "3rd Sunday of Lent - Women's Day special mass",
    assignments: {
      introduction: ['Renisha Mary'],
      first_reading: ['Pamela K'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Noela Kalanidhi'],
    },
  },
  {
    date: '2026-03-15',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '4th Sunday of Lent',
    assignments: {
      introduction: ['Nadhiya Kalanidhi'],
      first_reading: ['Macmillan'],
      second_reading: ['Richard Raj'],
      prayer_of_faithful: ['Jane'],
    },
  },
  {
    date: '2026-03-22',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '5th Sunday of Lent',
    assignments: {
      introduction: ['Rosalind Richy'],
      first_reading: ['Liji Sijish'],
      second_reading: ['Frazer Noronha'],
      prayer_of_faithful: ['Jebastin Pratesh'],
    },
  },
  {
    date: '2026-04-03',
    massType: 'Good Friday',
    time: '5:30 PM',
    notes: 'Good Friday',
    assignments: {
      way_of_cross: ['Sangeetha R Lourdes'],
      first_reading: ['Sheba Fernando'],
      second_reading: ['Xavier Geetha'],
      gospel_narrator: [
        'Rosalind Richy',
        'Justin Prabhakar',
        'Haeden Noronha',
        'Shanthi Anand',
      ],
    },
  },
  {
    date: '2026-04-12',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Second Sunday of Easter - Divine Mercy Sunday',
    assignments: {
      introduction: ['Rita Siluvai'],
      first_reading: ['Frazer Noronha'],
      second_reading: ['Iniya Evangeline'],
      prayer_of_faithful: ['Deepthy Binny'],
    },
  },
  {
    date: '2026-04-19',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Third Sunday of Easter',
    assignments: {
      introduction: ['Noela Kalanidhi'],
      first_reading: ['Melville Fernandez'],
      second_reading: ['Jebastin Pratesh'],
      prayer_of_faithful: ['Nadhiya Kalanidhi'],
    },
  },
  {
    date: '2026-04-26',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Fourth Sunday of Easter',
    assignments: {
      introduction: ['Maria Shruthi Chris'],
      first_reading: ['Cynthia Joseph'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Maria Shristi Iris'],
    },
  },
  {
    date: '2026-05-03',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Fifth Sunday of Easter',
    assignments: {
      introduction: ['Catherine Kalpana'],
      first_reading: ['Ivor Noronha'],
      second_reading: ['Nancy John Bhaskar'],
      prayer_of_faithful: ['Rita Siluvai'],
    },
  },
  {
    date: '2026-05-17',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Seventh Sunday of Easter',
    assignments: {
      introduction: ['Elizabeth'],
      first_reading: ['Elina Evangeline'],
      second_reading: ['Sheba Fernando'],
      prayer_of_faithful: ['Jollet'],
    },
  },
  {
    date: '2026-05-24',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Pentecost Sunday',
    assignments: {
      introduction: ['Haeden Noronha'],
      first_reading: ['Frazer Noronha'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Pamela'],
    },
  },
  {
    date: '2026-05-31',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'The Most Holy Trinity',
    assignments: {
      introduction: ['Rachel'],
      first_reading: ['Claudia'],
      second_reading: ['Elizabeth'],
      prayer_of_faithful: ['Homa Helen'],
    },
  },
  {
    date: '2026-06-07',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Corpus Christi - Solemnity',
    assignments: {
      first_reading: ['Nancy John Bhaskar'],
      second_reading: ['Savitha Frazer'],
      prayer_of_faithful: ['Justin Prabhakar'],
    },
  },
];

async function importSchedule() {
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

  for (const entry of SCHEDULE) {
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
      await assignmentQueries.bulkUpdate(mass.id, payload, 'Imported schedule');
    }

    console.log(`Added ${entry.date} — ${entry.notes}`);
  }

  console.log('');
  console.log(`Done: ${massesCreated} masses, ${assignmentsCreated} assignments`);
  console.log(`Total in database: ${memberCache.size} members, ${existingDates.size} masses`);
  await pool.end();
}

importSchedule().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
