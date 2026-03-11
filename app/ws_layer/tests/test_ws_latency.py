import asyncio
import json
import os
import time
import uuid
from typing import Dict, Iterable, List, Sequence

import httpx
import pytest
import websockets
from websockets.exceptions import ConnectionClosed

CLIENT_COUNT = int(os.getenv("WS_LATENCY_TEST_CLIENTS", "20"))
MOVES_PER_CLIENT = int(os.getenv("WS_LATENCY_TEST_MOVES_PER_CLIENT", "5"))

SUBSCRIBE_P95_MS = float(os.getenv("WS_LATENCY_SUBSCRIBE_P95_MS", "1200"))
JOIN_P95_MS = float(os.getenv("WS_LATENCY_JOIN_P95_MS", "1500"))
POSITION_ACK_P95_MS = float(os.getenv("WS_LATENCY_POSITION_P95_MS", "400"))
CHAT_P95_MS = float(os.getenv("WS_LATENCY_CHAT_P95_MS", "800"))
CODE_P95_MS = float(os.getenv("WS_LATENCY_CODE_P95_MS", "600"))
WHITEBOARD_P95_MS = float(os.getenv("WS_LATENCY_WHITEBOARD_P95_MS", "600"))
MEDIA_P95_MS = float(os.getenv("WS_LATENCY_MEDIA_P95_MS", "700"))
WEBRTC_P95_MS = float(os.getenv("WS_LATENCY_WEBRTC_P95_MS", "700"))
LEAVE_MAX_MS = float(os.getenv("WS_LATENCY_LEAVE_MAX_MS", "2000"))

SPIKE_MAX_MS = float(os.getenv("WS_LATENCY_SPIKE_MAX_MS", "2000"))
TAIL_RATIO_LIMIT = float(os.getenv("WS_LATENCY_TAIL_RATIO_LIMIT", "2.0"))


def _percentile(values: Sequence[float], p: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    if len(ordered) == 1:
        return ordered[0]
    rank = (p / 100.0) * (len(ordered) - 1)
    low = int(rank)
    high = min(low + 1, len(ordered) - 1)
    weight = rank - low
    return ordered[low] + (ordered[high] - ordered[low]) * weight


def _assert_latency_distribution(samples: Sequence[float], label: str, p95_limit_ms: float) -> None:
    assert samples, f"{label}: expected non-empty latency samples"
    p50 = _percentile(samples, 50)
    p95 = _percentile(samples, 95)
    p99 = _percentile(samples, 99)
    max_sample = max(samples)

    assert p95 <= p95_limit_ms, f"{label}: p95={p95:.2f}ms exceeded {p95_limit_ms:.2f}ms"
    assert max_sample <= SPIKE_MAX_MS, f"{label}: max={max_sample:.2f}ms exceeded {SPIKE_MAX_MS:.2f}ms"
    # Avoid false positives when median is extremely small (<10ms).
    if p50 >= 10 and len(samples) >= 20:
        assert p99 <= p50 * TAIL_RATIO_LIMIT, (
            f"{label}: tail spike detected (p99={p99:.2f}ms, p50={p50:.2f}ms, "
            f"ratio={p99 / p50:.2f} > {TAIL_RATIO_LIMIT:.2f})"
        )


def _find_metric(stats: Dict, event_type: str, segment: str) -> Dict:
    for row in stats.get("flat_metrics", []):
        if row.get("event_type") == event_type and row.get("segment") == segment:
            return row
    return {}


async def _recv_event(
    ws,
    expected_events: Iterable[str],
    *,
    timeout: float = 5.0,
    predicate=None,
) -> Dict:
    expected = {event.lower() for event in expected_events}
    deadline = time.perf_counter() + timeout
    while True:
        remaining = deadline - time.perf_counter()
        if remaining <= 0:
            raise AssertionError(f"Timed out waiting for events: {sorted(expected)}")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        payload = json.loads(raw)
        incoming = str(payload.get("event", "")).lower()
        if incoming in expected and (predicate is None or predicate(payload)):
            return payload


async def _connect_and_join(ws_url: str, space_id: str, user_id: str):
    ws = await websockets.connect(ws_url, max_queue=None, open_timeout=30)

    subscribe_start = time.perf_counter()
    await ws.send(json.dumps({"event": "subscribe", "space_id": space_id}))
    await _recv_event(ws, ["subscribed"], timeout=6.0)
    subscribe_ms = (time.perf_counter() - subscribe_start) * 1000.0

    join_start = time.perf_counter()
    await ws.send(json.dumps({"event": "join", "space_id": space_id, "user_id": user_id}))
    await _recv_event(ws, ["space_state"], timeout=8.0)
    join_ms = (time.perf_counter() - join_start) * 1000.0

    return ws, subscribe_ms, join_ms


@pytest.mark.asyncio
async def test_ws_latency_regression_profile(ws_server):
    ws_url = ws_server["ws_url"]
    http_url = ws_server["http_url"]
    space_id = f"latency-space-{uuid.uuid4()}"
    user_ids = [f"user-{idx:03d}-{uuid.uuid4()}" for idx in range(CLIENT_COUNT)]

    async with httpx.AsyncClient(timeout=3.0) as client:
        reset_response = await client.get(f"{http_url}/ws/latency-stats?reset=true")
        assert reset_response.status_code == 200

    clients = []
    subscribe_latencies: List[float] = []
    join_latencies: List[float] = []

    connect_results = []
    for user_id in user_ids:
        connect_results.append(await _connect_and_join(ws_url, space_id, user_id))
    for ws, subscribe_ms, join_ms in connect_results:
        clients.append(ws)
        subscribe_latencies.append(subscribe_ms)
        join_latencies.append(join_ms)

    _assert_latency_distribution(subscribe_latencies, "subscribe_round_trip", SUBSCRIBE_P95_MS)
    _assert_latency_distribution(join_latencies, "join_round_trip", JOIN_P95_MS)

    async def _run_position_moves(ws, user_id: str, base_idx: int) -> List[float]:
        samples = []
        for move_idx in range(MOVES_PER_CLIENT):
            nx = base_idx * 100 + move_idx
            ny = base_idx * 50 + move_idx
            payload = {
                "event": "position_move",
                "user_id": user_id,
                "space_id": space_id,
                "nx": nx,
                "ny": ny,
                "direction": "right",
                "isMoving": True,
            }
            start = time.perf_counter()
            await ws.send(json.dumps(payload))
            await _recv_event(
                ws,
                ["position_move_ack"],
                timeout=5.0,
                predicate=lambda event: event.get("user_id") == user_id and event.get("nx") == nx and event.get("ny") == ny,
            )
            samples.append((time.perf_counter() - start) * 1000.0)
        return samples

    position_results = await asyncio.gather(
        *[_run_position_moves(ws, user_id, idx) for idx, (ws, user_id) in enumerate(zip(clients, user_ids))]
    )
    position_latencies = [sample for group in position_results for sample in group]
    _assert_latency_distribution(position_latencies, "position_move_round_trip", POSITION_ACK_P95_MS)

    async def _send_chat_and_wait(ws, user_id: str, idx: int) -> float:
        content = f"chat-load-{idx}-{uuid.uuid4()}"
        payload = {"event": "send_chat_message", "data": {"content": content}}
        start = time.perf_counter()
        await ws.send(json.dumps(payload))
        await _recv_event(
            ws,
            ["chat_message"],
            timeout=6.0,
            predicate=lambda event: event.get("user_id") == user_id and event.get("message") == content,
        )
        return (time.perf_counter() - start) * 1000.0

    chat_latencies = await asyncio.gather(
        *[_send_chat_and_wait(ws, user_id, idx) for idx, (ws, user_id) in enumerate(zip(clients, user_ids))]
    )
    _assert_latency_distribution(chat_latencies, "chat_round_trip", CHAT_P95_MS)

    sender_ws = clients[0]
    receiver_ws = clients[1]
    sender_id = user_ids[0]
    receiver_id = user_ids[1]

    code_payload = {
        "event": "code_update",
        "code": "print('hello')",
        "language": "python",
        "target_user_ids": [receiver_id],
    }
    code_start = time.perf_counter()
    await sender_ws.send(json.dumps(code_payload))
    await _recv_event(
        receiver_ws,
        ["code_update"],
        timeout=6.0,
        predicate=lambda event: event.get("user_id") == sender_id and event.get("code") == "print('hello')",
    )
    code_latency = [(time.perf_counter() - code_start) * 1000.0]
    _assert_latency_distribution(code_latency, "code_update_round_trip", CODE_P95_MS)

    whiteboard_payload = {
        "event": "whiteboard_update",
        "elements": '[{"id":"shape-1","type":"rectangle"}]',
        "files": {},
        "target_user_ids": [receiver_id],
    }
    whiteboard_start = time.perf_counter()
    await sender_ws.send(json.dumps(whiteboard_payload))
    await _recv_event(
        receiver_ws,
        ["whiteboard_update"],
        timeout=6.0,
        predicate=lambda event: event.get("user_id") == sender_id,
    )
    whiteboard_latency = [(time.perf_counter() - whiteboard_start) * 1000.0]
    _assert_latency_distribution(whiteboard_latency, "whiteboard_round_trip", WHITEBOARD_P95_MS)

    media_start = time.perf_counter()
    await sender_ws.send(json.dumps({"event": "start_audio_stream"}))
    await _recv_event(
        receiver_ws,
        ["audio_stream_started"],
        timeout=6.0,
        predicate=lambda event: event.get("user_id") == sender_id,
    )
    media_latency = [(time.perf_counter() - media_start) * 1000.0]
    _assert_latency_distribution(media_latency, "media_round_trip", MEDIA_P95_MS)

    webrtc_payload = {
        "event": "webrtc_signal",
        "signal_type": "offer",
        "to_user_id": receiver_id,
        "space_id": space_id,
        "data": {"sdp": "fake"},
    }
    webrtc_start = time.perf_counter()
    await sender_ws.send(json.dumps(webrtc_payload))
    await _recv_event(
        receiver_ws,
        ["webrtc_signal"],
        timeout=6.0,
        predicate=lambda event: event.get("from_user_id") == sender_id and event.get("signal_type") == "offer",
    )
    webrtc_latency = [(time.perf_counter() - webrtc_start) * 1000.0]
    _assert_latency_distribution(webrtc_latency, "webrtc_round_trip", WEBRTC_P95_MS)

    await asyncio.sleep(0.2)
    async with httpx.AsyncClient(timeout=3.0) as client:
        stats_response = await client.get(f"{http_url}/ws/latency-stats")
        assert stats_response.status_code == 200
        stats = stats_response.json()["data"]

    subscribe_handle = _find_metric(stats, "subscribe", "handle")
    assert subscribe_handle and subscribe_handle.get("p95_ms", 0) <= SUBSCRIBE_P95_MS

    join_handle = _find_metric(stats, "join", "handle")
    assert join_handle, "Missing server-side metric for join.handle"

    position_handle = _find_metric(stats, "position_move", "handle")
    position_queue = _find_metric(stats, "position_move", "queue_wait")
    position_broadcast = _find_metric(stats, "position_move", "broadcast")
    assert position_handle, "Missing server-side metric for position_move.handle"
    assert position_queue, "Missing server-side metric for position_move.queue_wait"
    assert position_broadcast, "Missing server-side metric for position_move.broadcast"

    chat_handle = _find_metric(stats, "send_chat_message", "handle")
    assert chat_handle, "Missing server-side metric for send_chat_message.handle"

    assert stats.get("enabled") is True

    leave_latencies = []
    for ws in clients:
        start = time.perf_counter()
        try:
            await ws.send(json.dumps({"event": "left"}))
            await asyncio.wait_for(ws.recv(), timeout=2.0)
        except (ConnectionClosed, asyncio.TimeoutError):
            pass
        leave_latencies.append((time.perf_counter() - start) * 1000.0)

    assert max(leave_latencies) <= LEAVE_MAX_MS, (
        f"leave_round_trip: max={max(leave_latencies):.2f}ms exceeded {LEAVE_MAX_MS:.2f}ms"
    )


@pytest.mark.asyncio
async def test_latency_report_api_returns_full_report(ws_server):
    http_url = ws_server["http_url"]
    payload = {
        "client_count": 4,
        "moves_per_client": 2,
        "connect_concurrency": 2,
        "timeout_seconds": 6.0,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(f"{http_url}/ws/latency-report", json=payload)
        assert response.status_code == 200
        body = response.json()

    assert "success" in body
    data = body.get("data", {})
    assert "round_trip" in data
    assert "server_segments" in data
    assert "spikes" in data
    assert "errors" in data
    assert "subscribe_round_trip" in data["round_trip"]
    assert "join_round_trip" in data["round_trip"]
