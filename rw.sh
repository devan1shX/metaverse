# run ws layer
cd app/ws_layer
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8003