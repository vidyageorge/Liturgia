const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const paths = [
  path.join(__dirname, '..', 'liturgia.db'),
  path.join(__dirname, '..', 'instance', 'liturgia.db'),
];

function inspect(dbPath) {
  return new Promise((resolve) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        resolve({ path: dbPath, error: err.message });
        return;
      }
      db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (e, tables) => {
        if (e) {
          resolve({ path: dbPath, error: e.message });
          db.close();
          return;
        }
        const counts = {};
        const tableNames = tables.map((t) => t.name).filter((n) => !n.startsWith('sqlite_'));
        let pending = tableNames.length;
        if (!pending) {
          resolve({ path: dbPath, tables: [], counts: {} });
          db.close();
          return;
        }
        for (const name of tableNames) {
          db.get(`SELECT COUNT(*) AS c FROM "${name}"`, [], (err2, row) => {
            counts[name] = err2 ? '?' : row.c;
            pending -= 1;
            if (pending === 0) {
              resolve({ path: dbPath, tables: tableNames, counts });
              db.close();
            }
          });
        }
      });
    });
  });
}

(async () => {
  for (const p of paths) {
    const info = await inspect(p);
    console.log('\n===', info.path, '===');
    if (info.error) {
      console.log('Error:', info.error);
      continue;
    }
    console.log('Tables:', info.tables.join(', '));
    for (const [table, count] of Object.entries(info.counts)) {
      console.log(`  ${table}: ${count}`);
    }
  }
})();
