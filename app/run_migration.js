/**
 * Migration Script: Add map_id column to spaces table
 * 
 * Run this script with: node run_migration.js
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
    console.log('🔄 Starting migration: Add map_id column to spaces table');
    
    // Add map_id column
    await client.query(`
      ALTER TABLE spaces 
      ADD COLUMN IF NOT EXISTS map_id VARCHAR(50) DEFAULT 'office-01'
    `);
    console.log('✅ Added map_id column');
    
    // Update existing spaces
    await client.query(`
      UPDATE spaces 
      SET map_id = 'office-01' 
      WHERE map_id IS NULL
    `);
    console.log('✅ Updated existing spaces with default map_id');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, column_default
      FROM information_schema.columns 
      WHERE table_name = 'spaces' AND column_name = 'map_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Migration successful! Column details:');
      console.log(result.rows[0]);
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
