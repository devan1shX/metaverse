// testing the db connection 
const { get_async_db } = require('./db_conn');

async function test_db_connection() {
    try {
        const db = await get_async_db();
        console.log('connecting to db');
        const result = await db.query('SELECT 1 as ok');
        console.log('query result:', result.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error('db error:', err);
        process.exit(1);
    }
}

test_db_connection();