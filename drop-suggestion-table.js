const postgres = require('postgres');

async function dropTable() {
  const sql = postgres('postgresql://test:test@localhost:5432/testdb');
  try {
    await sql`DROP TABLE IF EXISTS "Suggestion"`;
    console.log('Table "Suggestion" dropped.');
  } catch (err) {
    console.error('Error dropping table:', err);
  } finally {
    await sql.end();
  }
}

dropTable();
