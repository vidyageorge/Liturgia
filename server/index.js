require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const ExcelJS = require('exceljs');
const {
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
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(bodyParser.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ...getDatabaseInfo() });
});

// Members
app.get('/api/members', async (req, res) => {
  try {
    res.json(await memberQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const member = await memberQueries.getById(Number(req.params.id));
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const result = await memberQueries.create(name.trim(), phone, email);
    const member = await memberQueries.getById(result.lastID);
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const member = await memberQueries.getById(Number(req.params.id));
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await memberQueries.update(Number(req.params.id), {
      name: req.body.name ?? member.name,
      phone: req.body.phone ?? member.phone,
      email: req.body.email ?? member.email,
      active: req.body.active ?? member.active,
      experience_level: req.body.experience_level ?? member.experience_level,
      years_of_service: req.body.years_of_service ?? member.years_of_service,
    });
    res.json(await memberQueries.getById(Number(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    await memberQueries.deactivate(Number(req.params.id));
    res.json({ message: 'Member deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members/:id/roles', async (req, res) => {
  try {
    await memberQueries.addRole(Number(req.params.id), Number(req.body.role_id));
    res.json(await memberQueries.getById(Number(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/members/:id/roles/:roleId', async (req, res) => {
  try {
    await memberQueries.removeRole(Number(req.params.id), Number(req.params.roleId));
    res.json(await memberQueries.getById(Number(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members/:id/history', async (req, res) => {
  try {
    res.json(await memberQueries.getHistory(Number(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Priests
app.get('/api/priests', async (req, res) => {
  try {
    res.json(await priestQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/priests', async (req, res) => {
  try {
    const { name, title, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const result = await priestQueries.create(name.trim(), title, phone);
    const priests = await priestQueries.getAll();
    const created = priests.find((p) => p.id === result.lastID);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/priests/:id', async (req, res) => {
  try {
    await priestQueries.update(Number(req.params.id), req.body);
    const priests = await priestQueries.getAll();
    const updated = priests.find((p) => p.id === Number(req.params.id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/priests/:id', async (req, res) => {
  try {
    await priestQueries.deactivate(Number(req.params.id));
    res.json({ message: 'Priest deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Community roles
app.get('/api/roles', async (req, res) => {
  try {
    res.json(await roleQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roles', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const result = await roleQueries.create(name.trim(), category, description);
    const roles = await roleQueries.getAll();
    const created = roles.find((r) => r.id === result.lastID);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mass types
app.get('/api/mass-types', async (req, res) => {
  try {
    res.json(await massTypeQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mass-types', async (req, res) => {
  try {
    const created = await massTypeQueries.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Masses
app.get('/api/masses', async (req, res) => {
  try {
    res.json(await massQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/masses/upcoming', async (req, res) => {
  try {
    res.json(await massQueries.getUpcoming());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/masses/past', async (req, res) => {
  try {
    res.json(await massQueries.getPast());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/masses/export', async (req, res) => {
  try {
    const { start_date: startDate, end_date: endDate, year } = req.query;
    const masses = await massQueries.getForExport({
      year: year ? Number(year) : null,
      startDate,
      endDate,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(year ? `Mass History ${year}` : 'Mass History');
    const headers = [
      'Date', 'Day', 'Mass Type', 'Time', 'Celebrant',
      'Introduction', 'First Reading', 'Second Reading', 'Prayer of Faithful',
      'MC Reader', 'Third Reading', 'Gospel Narrators', 'Notes',
    ];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B4513' },
    };

    for (const mass of masses) {
      const assignmentMap = {};
      for (const a of mass.assignments) {
        assignmentMap[a.role] = a.member_name || '';
      }
      const gospelNarrators = mass.assignments
        .filter((a) => a.role.includes('gospel_narrator'))
        .map((a) => a.member_name)
        .filter(Boolean);
      const date = new Date(mass.date);
      sheet.addRow([
        mass.date,
        date.toLocaleDateString('en-IN', { weekday: 'long' }),
        mass.mass_type?.name || '',
        mass.time || '',
        mass.celebrant || '',
        assignmentMap.introduction || '',
        assignmentMap.first_reading || '',
        assignmentMap.second_reading || '',
        assignmentMap.prayer_of_faithful || '',
        assignmentMap.mc_reader || '',
        assignmentMap.third_reading || '',
        gospelNarrators.join(', '),
        mass.notes || '',
      ]);
    }

    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    let filename = `mass_history_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
    if (year) filename = `mass_history_${year}.xlsx`;
    else if (startDate && endDate) filename = `mass_history_${startDate}_to_${endDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/masses', async (req, res) => {
  try {
    const { mass_type_id: massTypeId, date, time, celebrant, notes } = req.body;
    if (!massTypeId || !date) {
      return res.status(400).json({ error: 'Mass type and date are required' });
    }
    const mass = await massQueries.create({
      mass_type_id: massTypeId,
      date,
      time,
      celebrant,
      notes,
    });
    res.status(201).json(mass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/masses/:id', async (req, res) => {
  try {
    const mass = await massQueries.getById(Number(req.params.id));
    if (!mass) return res.status(404).json({ error: 'Mass not found' });
    res.json(mass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/masses/:id', async (req, res) => {
  try {
    const changeReason = req.body.change_reason;
    if (!changeReason?.trim()) {
      return res.status(400).json({ error: 'Change reason is required' });
    }
    const mass = await massQueries.update(Number(req.params.id), {
      mass_type_id: req.body.mass_type_id,
      date: req.body.date,
      time: req.body.time,
      celebrant: req.body.celebrant,
      notes: req.body.notes,
      change_reason: changeReason.trim(),
      changed_by: req.body.changed_by || 'System',
    });
    if (!mass) return res.status(404).json({ error: 'Mass not found' });
    res.json(mass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/masses/:id', async (req, res) => {
  try {
    await massQueries.delete(Number(req.params.id));
    res.json({ message: 'Mass deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/masses/:id/history', async (req, res) => {
  try {
    res.json(await changeLogQueries.getByMass(Number(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assignments
app.post('/api/masses/:massId/assignments', async (req, res) => {
  try {
    const mass = await assignmentQueries.upsert(Number(req.params.massId), req.body);
    res.json(mass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/masses/:massId/assignments/:id', async (req, res) => {
  try {
    await assignmentQueries.delete(Number(req.params.id));
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/masses/:massId/assignments/bulk-update', async (req, res) => {
  try {
    const mass = await assignmentQueries.bulkUpdate(
      Number(req.params.massId),
      req.body.assignments || [],
      req.body.change_reason,
      req.body.changed_by
    );
    res.json(mass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apostles
app.post('/api/masses/:massId/apostles', async (req, res) => {
  try {
    const mass = await apostleQueries.add(Number(req.params.massId), req.body);
    res.json(mass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/masses/:massId/apostles/:id', async (req, res) => {
  try {
    await apostleQueries.delete(Number(req.params.id));
    res.json({ message: 'Apostle removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Departed souls
app.get('/api/masses/:massId/departed-souls', async (req, res) => {
  try {
    res.json(await departedSoulQueries.getByMass(Number(req.params.massId)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/masses/:massId/departed-souls', async (req, res) => {
  try {
    const soul = await departedSoulQueries.add(Number(req.params.massId), req.body);
    res.status(201).json(soul);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/masses/:massId/departed-souls/:id', async (req, res) => {
  try {
    await departedSoulQueries.delete(Number(req.params.id));
    res.json({ message: 'Departed soul removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats & changelog
app.get('/api/stats', async (req, res) => {
  try {
    res.json(await statsQueries.get());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/changelog', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : null;
    res.json(await changeLogQueries.getAll(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Liturgia server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
