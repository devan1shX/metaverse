const { Pool , Client } = require('pg');
const { Config } = require('./config');
const { logger } = require('../utils/logger');
// db pool for other files to acess the db 
// logger.debug('DB configuration loaded', { db: Config.db });
const pool = new Pool({
  host: String(Config.db.host),
  port: Number(Config.db.port),
  user: String(Config.db.username),
  database: String(Config.db.database),
  password: String(Config.db.password),
});

async function get_async_db() {
  return pool;
}

function connectDB() {
  return pool
    .connect()
    .then((client) => {
      logger.info('[db_conn][connectDB] Connected to the database successfully');
      client.release();
      return true;
    })
    .catch((err) => {
      logger.error('[db_conn][connectDB] Database connection error', { error: err.message, stack: err.stack });
      return false;
    });
}

module.exports = {
  connectDB,
  get_async_db,
};