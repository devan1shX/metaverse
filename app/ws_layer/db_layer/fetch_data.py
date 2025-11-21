#this file is used to fetch the data ffromn the db 
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db_pylayer import get_async_db
async def fetch_clients():
    connection_context = await get_async_db()
    async with connection_context as connection:
        clients = await connection.fetch("SELECT * FROM users")
        return clients

async def fetch_room_stated():
    pass

