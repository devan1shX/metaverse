import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db_pylayer import get_async_db
from logger import logger
async def init_db():
    connection_context = await get_async_db()
    async with connection_context as connection:
        logger.info("Initializing database tables")
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS space_states (
                space_id UUID NOT NULL,
                state JSONB NOT NULL
            );
        """)    

        await connection.execute("""
            CREATE TABLE IF NOT EXISTS user_space_mapping (
                user_id UUID NOT NULL,
                space_id UUID NOT NULL,
                PRIMARY KEY (user_id, space_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
            );
        """)

        

# f"""
# how the room state should look like : 
# {
#     "roomid": uuid of the space , 
#     "users":[the users in the space],
#     ## to do , add furntiure movement here , add chat messages between the users here , add the user positons here 
# }
# """