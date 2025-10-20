const { logger } = require('../logger');
const { get_async_db } = require('../../config/db_conn');

async function db_cleaner() {
    const db = await get_async_db();
    
    // Drop tables in correct order due to foreign key constraints
    const tablesToDrop = [
        'blacklisted_tokens',
        'notifications', 
        'user_spaces',
        'spaces',
        'users'
    ];
    
    logger.info('[db_cleaner][db_cleaner] Starting database cleanup...');
    
    for (const table of tablesToDrop) {
        try {
            await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            logger.info(`[db_cleaner][db_cleaner] ${table} table dropped successfully`);
        } catch (error) {
            logger.error(`[db_cleaner][db_cleaner] Error dropping ${table} table`, { error: error.message });
        }
    }
    
    logger.info('[db_cleaner][db_cleaner] Database cleanup completed');
}
module.exports = { db_cleaner };