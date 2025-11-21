import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://localhost:8003/ws/metaverse/space"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # Send subscribe
            msg = {
                "event": "subscribe",
                "space_id": "8c38a310-c686-4813-b600-33af7eefe434"
            }
            print(f"Sending: {msg}")
            await websocket.send(json.dumps(msg))
            
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Keep open for a bit
            await asyncio.sleep(2)
            print("Closing...")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
