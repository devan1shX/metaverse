"""
Run database migration to create messages table
"""
import asyncio
import os
from pathlib import Path
import dotenv

dotenv.load_dotenv()

async def run_migration():
    import asyncpg
    
    # Database connection parameters
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5433)),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'aahan123'),
        'database': os.getenv('DATABASE', 'postgres'),
    }
    
    print(f"Connecting to database at {db_config['host']}:{db_config['port']}/{db_config['database']}")
    
    conn = None
    try:
        # Connect to database
        conn = await asyncpg.connect(**db_config)
        print("✓ Connected to database")
        
        # Read migration file
        migration_file = Path(__file__).parent / 'migrations' / '001_create_messages_table.sql'
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        print(f"✓ Read migration file: {migration_file.name}")
        
        # Execute migration
        print("Running migration...")
        await conn.execute(migration_sql)
        print("✓ Migration completed successfully!")
        
        # Verify table was created
        result = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'messages'"
        )
        
        if result > 0:
            print("✓ Messages table created successfully")
        else:
            print("✗ Warning: Messages table not found after migration")
            
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        if conn:
            await conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    asyncio.run(run_migration())
