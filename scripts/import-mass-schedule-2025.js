/**
 * Import 2025 mass reader schedule from community WhatsApp messages.
 * Usage: npm run import-schedule-2025
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

const SCHEDULE_2025 = [
  {
    date: '2025-01-12',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Baptism of our Lord',
    assignments: {
      first_reading: ['Veena'],
      second_reading: ['Nadhiya Kalanidhi'],
      prayer_of_faithful: ['Rose Richard'],
    },
  },
  {
    date: '2025-01-19',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '2nd Sunday in Ordinary Time',
    assignments: {
      first_reading: ['Shiny'],
      second_reading: ['Rani Francis'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-01-26',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '3rd Sunday in Ordinary Time',
    assignments: {
      first_reading: ['Clayton Fernando'],
      second_reading: ['Nancy John Bhaskar'],
      prayer_of_faithful: ['Maria Rajini'],
    },
  },
  {
    date: '2025-02-09',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '5th Sunday in Ordinary Time',
    assignments: {
      first_reading: ['Shanthi Anand'],
      second_reading: ['Geetha'],
      prayer_of_faithful: ['Roselet'],
    },
  },
  {
    date: '2025-02-16',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '6th Sunday in Ordinary Time — second reading reader reads the acclamation',
    assignments: {
      first_reading: ['Florence'],
      second_reading: ['Haeden Noronha'],
      prayer_of_faithful: ['Elizabeth'],
    },
  },
  {
    date: '2025-02-23',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '7th Sunday in Ordinary Time — second reading reader reads the acclamation',
    assignments: {
      first_reading: ['Sangeetha Lourdes'],
      second_reading: ['Sherlin Richard'],
      prayer_of_faithful: ['Claudia Fernando'],
    },
  },
  {
    date: '2025-03-02',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '8th Sunday in Ordinary Time',
    assignments: {
      first_reading: ['Liji Sijish'],
      second_reading: ['Melville Fernandez'],
      prayer_of_faithful: ['Charles M'],
    },
  },
  {
    date: '2025-03-05',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Ash Wednesday — no Gloria or Hallelujah; no Prayer of the Faithful',
    assignments: {
      first_reading: ['Vimal Silveira'],
      second_reading: ['Noela Kalanidhi'],
    },
  },
  {
    date: '2025-03-09',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '1st Sunday of Lent',
    assignments: {
      first_reading: ['Shanthi Anand'],
      second_reading: ['Rosalind Richy'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-03-16',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '2nd Sunday of Lent — choir sings 2 verses of Praise to Christ before Gospel verse',
    assignments: {
      first_reading: ['Sangeetha Lourdes'],
      second_reading: ['Homa Helen'],
      prayer_of_faithful: ['Gia Maria'],
    },
  },
  {
    date: '2025-03-23',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '3rd Sunday of Lent',
    assignments: {
      first_reading: ['Rani Francis'],
      second_reading: ['Elizabeth John'],
      prayer_of_faithful: ['Mithika N J'],
    },
  },
  {
    date: '2025-03-26',
    massType: 'Sunday Mass',
    time: '7:00 PM',
    notes: 'Way of the Cross (Wednesday)',
    assignments: {
      way_of_cross: ['Noela Kalanidhi'],
    },
  },
  {
    date: '2025-03-30',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '4th Sunday of Lent',
    assignments: {
      first_reading: ['Savitha Frazer'],
      second_reading: ['Roselet'],
      prayer_of_faithful: ['Rachel'],
    },
  },
  {
    date: '2025-04-02',
    massType: 'Sunday Mass',
    time: '7:00 PM',
    notes: 'Way of the Cross (Wednesday)',
    assignments: {
      way_of_cross: ['Riahanna'],
    },
  },
  {
    date: '2025-04-06',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '5th Sunday of Lent — choir sings Praise to Christ before Gospel verse',
    assignments: {
      first_reading: ['Sherlin Richard'],
      second_reading: ['Angeline Blessy'],
      prayer_of_faithful: ['Ivor Noronha'],
    },
  },
  {
    date: '2025-04-09',
    massType: 'Sunday Mass',
    time: '7:00 PM',
    notes: 'Way of the Cross (Wednesday)',
    assignments: {
      way_of_cross: ['Sangeetha Lourdes'],
    },
  },
  {
    date: '2025-04-13',
    massType: 'Palm Sunday',
    time: '7:15 AM',
    notes: 'Palm Sunday — blessing of palms in front of the stage at 7:15 AM',
    assignments: {
      mc_reader: ['Charles M'],
      first_reading: ['Haeden Noronha'],
      second_reading: ['Moreann Clintena'],
      prayer_of_faithful: ['Mithika N J'],
    },
  },
  {
    date: '2025-04-16',
    massType: 'Sunday Mass',
    time: '7:00 PM',
    notes: 'Way of the Cross (Wednesday)',
    assignments: {
      way_of_cross: ['Rachel'],
    },
  },
  {
    date: '2025-04-17',
    massType: 'Maundy Thursday',
    time: '5:30 PM',
    notes: 'Maundy Thursday',
    assignments: {
      mc_reader: ['Sangeetha Lourdes'],
      first_reading: ['Justin Prabhakar'],
      second_reading: ['Vimal Silveira'],
      prayer_of_faithful: ['Rachel Joannah'],
    },
  },
  {
    date: '2025-04-18',
    massType: 'Good Friday',
    time: '5:30 PM',
    notes: 'Good Friday',
    assignments: {
      way_of_cross: ['Noela Kalanidhi'],
      mc_reader: ['Frazer Noronha'],
      first_reading: ['Melville Fernandez'],
      second_reading: ['Cynthia Joseph'],
      gospel_narrator: ['Claudia Fernando', 'Charles M', 'Vimal Silveira', 'V J Kavin'],
    },
  },
  {
    date: '2025-04-19',
    massType: 'Easter Vigil',
    time: '11:30 PM',
    notes: 'Easter Vigil',
    assignments: {
      mc_reader: ['Rosalind Richy'],
      first_reading: ['Nancy John Bhaskar'],
      second_reading: ['Akash Darin'],
      third_reading: ['Geetha Anto'],
      fourth_reading: ['Gia Maria'],
      prayer_of_faithful: ['Riahanna'],
    },
  },
  {
    date: '2025-04-20',
    massType: 'Easter Morning Mass',
    time: '7:15 AM',
    notes: 'Easter Sunday',
    assignments: {
      introduction: ['Shanthi Anand'],
      first_reading: ['Yohan Prakash'],
      second_reading: ['Naathan'],
      prayer_of_faithful: ['Homa Helen'],
    },
  },
  {
    date: '2025-04-27',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '2nd Sunday of Easter — Divine Mercy Sunday',
    assignments: {
      first_reading: ['Liji Sijish'],
      second_reading: ['Pamela'],
      prayer_of_faithful: ['Rita Siluvai'],
    },
  },
  {
    date: '2025-05-04',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '3rd Sunday of Easter',
    assignments: {
      first_reading: ['Xavier Geetha'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Nadhiya Kalanidhi'],
    },
  },
  {
    date: '2025-05-25',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '6th Sunday of Easter',
    assignments: {
      first_reading: ['Nancy John Bhaskar'],
      second_reading: ['Sangeetha Lourdes'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-06-01',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Ascension of the Lord',
    assignments: {
      first_reading: ['Melville Fernandez'],
      second_reading: ['Gia Maria'],
      prayer_of_faithful: ['Jollet'],
    },
  },
  {
    date: '2025-06-08',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Pentecost Sunday',
    assignments: {
      first_reading: ['Rani Francis'],
      second_reading: ['Haeden Noronha'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-06-15',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Solemnity of the Holy Trinity',
    assignments: {
      first_reading: ['Liji Sijish'],
      second_reading: ['Nadhiya Kalanidhi'],
      prayer_of_faithful: ['Rosalind Richy'],
    },
  },
  {
    date: '2025-06-22',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Solemnity of Corpus Christi',
    assignments: {
      first_reading: ['Justin Prabhakar'],
      second_reading: ['Noela Kalanidhi'],
      prayer_of_faithful: ['Pamela K'],
    },
  },
  {
    date: '2025-06-29',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Solemnity of Saints Peter & Paul',
    assignments: {
      introduction: ['Charles M'],
      first_reading: ['Sangeetha Lourdes'],
      second_reading: ['Nancy John Bhaskar'],
      prayer_of_faithful: ['Anitha Antony'],
    },
  },
  {
    date: '2025-07-06',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '14th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Frazer Noronha'],
      first_reading: ['Haeden Noronha'],
      second_reading: ['Piggot'],
      prayer_of_faithful: ['Sophia Martin'],
    },
  },
  {
    date: '2025-07-13',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '15th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Noela Kalanidhi'],
      first_reading: ['Shanthi Anand'],
      second_reading: ['Veena'],
      prayer_of_faithful: ['Jessica Xavier'],
    },
  },
  {
    date: '2025-07-20',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '16th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Vimal Silveira'],
      first_reading: ['Akash Darin'],
      second_reading: ['Vidhya George'],
      prayer_of_faithful: ['Rita Siluvai'],
    },
  },
  {
    date: '2025-07-27',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '17th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Nancy John Bhaskar'],
      first_reading: ['Claudia Fernando'],
      second_reading: ['Justin Prabhakar'],
      prayer_of_faithful: ['Pamela K'],
    },
  },
  {
    date: '2025-08-03',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '18th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Florence'],
      first_reading: ['Sophia Martin'],
      second_reading: ['Anitha Antony'],
      prayer_of_faithful: ['Noela Kalanidhi'],
    },
  },
  {
    date: '2025-08-10',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '19th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Elizabeth John'],
      first_reading: ['Sherlin Richard'],
      second_reading: ['Rani Francis'],
      prayer_of_faithful: ['Veena'],
    },
  },
  {
    date: '2025-08-15',
    massType: 'Independence Day Mass',
    time: '7:15 AM',
    notes: 'Assumption of the Blessed Virgin Mary — Special mass for India',
    assignments: {
      introduction: ['Sangeetha Lourdes'],
      first_reading: ['Charles M'],
      second_reading: ['Liji Sijish'],
      prayer_of_faithful: ['Nadhiya Kalanidhi'],
    },
  },
  {
    date: '2025-08-17',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '20th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Pamela'],
      first_reading: ['Xavier Geetha'],
      second_reading: ['Nancy John Bhaskar'],
      prayer_of_faithful: ['Frazer Noronha'],
    },
  },
  {
    date: '2025-08-24',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '21st Sunday in Ordinary Time',
    assignments: {
      introduction: ['Shanthi Anand'],
      first_reading: ['Haeden Noronha'],
      second_reading: ['Jessica Xavier'],
      prayer_of_faithful: ['Jollet'],
    },
  },
  {
    date: '2025-08-31',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '22nd Sunday in Ordinary Time',
    assignments: {
      introduction: ['Rita Siluvai'],
      first_reading: ['Sheba Fernando'],
      second_reading: ['Richard Raj'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-09-07',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '23rd Sunday in Ordinary Time',
    assignments: {
      introduction: ['David Gladys'],
      first_reading: ['Xavier Geetha'],
      second_reading: ['Cynthia Joseph'],
      prayer_of_faithful: ['M Jaileen Shaini'],
    },
  },
  {
    date: '2025-09-14',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Feast of the Exaltation of the Cross',
    assignments: {
      introduction: ['Justin Prabhakar'],
      first_reading: ['Noela Kalanidhi'],
      second_reading: ['Shanthi Anand'],
      prayer_of_faithful: ['Rosalind Richy'],
    },
  },
  {
    date: '2025-09-21',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '25th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Infant Jennifer'],
      first_reading: ['Catherine Kalpana'],
      second_reading: ['Maria Rinnha'],
      prayer_of_faithful: ['Nadhiya Kalanidhi'],
    },
  },
  {
    date: '2025-09-28',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '26th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Frazer Noronha'],
      first_reading: ['Piggot'],
      second_reading: ['Sangeetha Lourdes'],
      prayer_of_faithful: ['Nancy John Bhaskar'],
    },
  },
  {
    date: '2025-10-05',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '27th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Charles M'],
      first_reading: ['Vimal Silveira'],
      second_reading: ['Liji Sijish'],
      prayer_of_faithful: ['Jessica Xavier'],
    },
  },
  {
    date: '2025-10-12',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '28th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Rita Siluvai'],
      first_reading: ['Shanthi Anand'],
      second_reading: ['Sophia Martin'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-10-19',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Mission Sunday — Mass for the Evangelization of Peoples',
    assignments: {
      introduction: ['Florence'],
      first_reading: ['Justin Prabhakar'],
      second_reading: ['Nadhiya Kalanidhi'],
      prayer_of_faithful: ['Jollet'],
    },
  },
  {
    date: '2025-10-26',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '30th Sunday in Ordinary Time',
    assignments: {
      introduction: ['Xavier Geetha'],
      first_reading: ['Pamela K'],
      second_reading: ['Rosalind Richy'],
      prayer_of_faithful: ['Maria'],
    },
  },
  {
    date: '2025-11-02',
    massType: 'All Souls Day',
    time: '7:15 AM',
    notes: 'All Souls Day — remembering the Faithful Departed',
    assignments: {
      introduction: ['Sangeetha Lourdes'],
      first_reading: ['Claudia Fernando'],
      second_reading: ['Noela Kalanidhi'],
      prayer_of_faithful: ['Liji Sijish'],
    },
  },
  {
    date: '2025-11-09',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '32nd Sunday in Ordinary Time',
    assignments: {
      introduction: ['Nancy John Bhaskar'],
      first_reading: ['Shanthi Anand'],
      second_reading: ['Charles M'],
      prayer_of_faithful: ['Akash Darin'],
    },
  },
  {
    date: '2025-11-30',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '1st Sunday of Advent',
    assignments: {
      introduction: ['Sangeetha Lourdes'],
      first_reading: ['Sheba Fernando'],
      second_reading: ['Noela Kalanidhi'],
      prayer_of_faithful: ['Nancy John Bhaskar'],
    },
  },
  {
    date: '2025-12-07',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '2nd Sunday of Advent',
    assignments: {
      introduction: ['Justin Prabhakar'],
      first_reading: ['Maria'],
      second_reading: ['Infant Jennifer'],
      prayer_of_faithful: ['Rita Siluvai'],
    },
  },
  {
    date: '2025-12-14',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '3rd Sunday of Advent',
    assignments: {
      introduction: ['Frazer Noronha'],
      first_reading: ['Catherine Kalpana'],
      second_reading: ['Richard Raj'],
      prayer_of_faithful: ['Jessica Xavier'],
    },
  },
  {
    date: '2025-12-21',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: '4th Sunday of Advent',
    assignments: {
      introduction: ['Xavier Geetha'],
      first_reading: ['Rosalind Richy'],
      second_reading: ['Pamela'],
      prayer_of_faithful: ['Macmillan'],
    },
  },
  {
    date: '2025-12-28',
    massType: 'Sunday Mass',
    time: '7:15 AM',
    notes: 'Feast of the Holy Family',
    assignments: {
      introduction: ['Florence'],
      first_reading: ['Elizabeth John'],
      second_reading: ['Akash Darin'],
      prayer_of_faithful: ['V J Kavin'],
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

  for (const entry of SCHEDULE_2025) {
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
      await assignmentQueries.bulkUpdate(mass.id, payload, 'Imported 2025 schedule');
    }

    console.log(`Added ${entry.date} — ${entry.notes}`);
  }

  await pool.end();
  console.log('');
  console.log(`Done: ${massesCreated} masses, ${assignmentsCreated} assignments`);
  console.log(`Readers in database: ${memberCache.size}`);
}

importSchedule().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
