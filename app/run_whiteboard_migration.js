/**
 * Migration Script: Add whiteboard_state column to spaces table
 * Run with: node run_whiteboard_migration.js
 */

const { Pool } = require('pg');
const { Config } = require('./config/config');

const pool = new Pool({
  host: String(Config.db.host),
  port: Number(Config.db.port),
  user: String(Config.db.username),
  database: String(Config.db.database),
  password: String(Config.db.password),
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting migration: Add whiteboard_state column to spaces table');

    await client.query(`
      ALTER TABLE spaces
      ADD COLUMN IF NOT EXISTS whiteboard_state TEXT DEFAULT '[]'
    `);
    console.log('✅ Added whiteboard_state column');

    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'spaces' AND column_name = 'whiteboard_state'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Migration successful! Column details:', result.rows[0]);
    } else {
      console.log('❌ Column was not created');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
