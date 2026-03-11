Run WS layer:

```bash
uvicorn main:app --host 0.0.0.0 --port 8003
```

Enable latency profiling:

```bash
WS_LATENCY_PROFILING=1 uvicorn main:app --host 0.0.0.0 --port 8003
```

Optional profiling controls:

- `WS_LATENCY_SLOW_MS` (default `100`) logs slow samples
- `GET /ws/latency-stats` returns aggregated metrics (`count`, `min`, `max`, `p50`, `p95`, `p99`)
- `GET /ws/latency-stats?reset=true` resets stats after returning current values

Run WS latency regression tests:

```bash
cd app/ws_layer
pytest -q tests/test_ws_latency.py
```

Optional load tuning for tests:

- `WS_LATENCY_TEST_CLIENTS` (default `20`)
- `WS_LATENCY_TEST_MOVES_PER_CLIENT` (default `5`)

Generate a full latency report from API (all WS operations):

```bash
curl -X POST "http://127.0.0.1:8003/ws/latency-report" \
  -H "Content-Type: application/json" \
  -d '{
    "client_count": 20,
    "moves_per_client": 5,
    "connect_concurrency": 8,
    "timeout_seconds": 8.0
  }'
```

Generate report from CLI script:

```bash
python3 generate_latency_report.py --client-count 20 --moves-per-client 5
```