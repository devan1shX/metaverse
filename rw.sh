# run ws layer
cd app/ws_layer
C:\Python312\python.exe -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003












Delete : Remove-Item -Recurse -Force venv
