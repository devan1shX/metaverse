"""
Generate an end-to-end WebSocket latency report by exercising core WS operations.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import websockets
from pydantic import BaseModel, Field
from websockets.exceptions import ConnectionClosed

from config import WSConfig
from latency import get_latency_stats, reset_latency_stats, set_latency_profiling_enabled


class LatencyReportConfig(BaseModel):
    space_id: Optional[str] = None
    ws_url: Optional[str] = None
    client_count: int = Field(default=20, ge=2, le=500)
    user_ids: Optional[List[str]] = None
    moves_per_client: int = Field(default=5, ge=1, le=200)
    connect_concurrency: int = Field(default=8, ge=1, le=100)
    timeout_seconds: float = Field(default=8.0, gt=0.1, le=60.0)
    spike_threshold_ms: float = Field(default=2000.0, gt=0.0)
    tail_ratio_limit: float = Field(default=2.0, gt=1.0)
    include_samples: bool = False


def _default_ws_url() -> str:
    host = WSConfig.WS_HOST
    if host in {"0.0.0.0", "::"}:
        host = "127.0.0.1"
    return f"ws://{host}:{WSConfig.WS_PORT}/ws/metaverse/space"


def _percentile(values: Sequence[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    rank = (percentile / 100.0) * (len(ordered) - 1)
    lower = int(rank)
    upper = min(lower + 1, len(ordered) - 1)
    weight = rank - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * weight


def _distribution(samples: Sequence[float], include_samples: bool = False) -> Dict[str, Any]:
    values = list(samples)
    if not values:
        payload: Dict[str, Any] = {
            "count": 0,
            "avg_ms": 0.0,
            "min_ms": 0.0,
            "max_ms": 0.0,
            "p50_ms": 0.0,
            "p95_ms": 0.0,
            "p99_ms": 0.0,
        }
        if include_samples:
            payload["samples_ms"] = []
        return payload

    avg = sum(values) / len(values)
    payload = {
        "count": len(values),
        "avg_ms": round(avg, 3),
        "min_ms": round(min(values), 3),
        "max_ms": round(max(values), 3),
        "p50_ms": round(_percentile(values, 50), 3),
        "p95_ms": round(_percentile(values, 95), 3),
        "p99_ms": round(_percentile(values, 99), 3),
    }
    if include_samples:
        payload["samples_ms"] = [round(v, 3) for v in values]
    return payload


async def _recv_event(
    ws: websockets.WebSocketClientProtocol,
    expected_events: Iterable[str],
    timeout_seconds: float,
    predicate=None,
) -> Dict[str, Any]:
    expected = {evt.lower() for evt in expected_events}
    deadline = time.perf_counter() + timeout_seconds
    while True:
        remaining = deadline - time.perf_counter()
        if remaining <= 0:
            raise TimeoutError(f"Timed out waiting for events: {sorted(expected)}")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        payload = json.loads(raw)
        event_name = str(payload.get("event", "")).lower()
        if event_name in expected and (predicate is None or predicate(payload)):
            return payload


async def _connect_and_join(
    ws_url: str,
    space_id: str,
    user_id: str,
    timeout_seconds: float,
) -> Tuple[websockets.WebSocketClientProtocol, float, float]:
    ws = await websockets.connect(
        ws_url,
        max_queue=None,
        open_timeout=timeout_seconds,
        ping_interval=None,
    )

    subscribe_start = time.perf_counter()
    await ws.send(json.dumps({"event": "subscribe", "space_id": space_id}))
    await _recv_event(ws, ["subscribed"], timeout_seconds)
    subscribe_ms = (time.perf_counter() - subscribe_start) * 1000.0

    join_start = time.perf_counter()
    await ws.send(json.dumps({"event": "join", "space_id": space_id, "user_id": user_id}))
    await _recv_event(ws, ["space_state"], timeout_seconds)
    join_ms = (time.perf_counter() - join_start) * 1000.0

    return ws, subscribe_ms, join_ms


def _build_spike_report(
    round_trip: Dict[str, Dict[str, Any]],
    server_stats: Dict[str, Any],
    spike_threshold_ms: float,
    tail_ratio_limit: float,
) -> Dict[str, List[Dict[str, Any]]]:
    round_trip_spikes: List[Dict[str, Any]] = []
    server_spikes: List[Dict[str, Any]] = []

    for op_name, stats in round_trip.items():
        if stats.get("count", 0) == 0:
            continue
        max_ms = float(stats.get("max_ms", 0.0))
        p50 = float(stats.get("p50_ms", 0.0))
        p99 = float(stats.get("p99_ms", 0.0))
        if max_ms > spike_threshold_ms:
            round_trip_spikes.append(
                {
                    "operation": op_name,
                    "type": "single_spike",
                    "max_ms": max_ms,
                    "threshold_ms": spike_threshold_ms,
                }
            )
        if p50 > 0 and p99 > (p50 * tail_ratio_limit):
            round_trip_spikes.append(
                {
                    "operation": op_name,
                    "type": "tail_ratio_spike",
                    "p50_ms": p50,
                    "p99_ms": p99,
                    "tail_ratio_limit": tail_ratio_limit,
                    "actual_ratio": round(p99 / p50, 3),
                }
            )

    for metric in server_stats.get("flat_metrics", []):
        max_ms = float(metric.get("max_ms", 0.0))
        p50 = float(metric.get("p50_ms", 0.0))
        p99 = float(metric.get("p99_ms", 0.0))
        event_type = metric.get("event_type")
        segment = metric.get("segment")
        if max_ms > spike_threshold_ms:
            server_spikes.append(
                {
                    "event_type": event_type,
                    "segment": segment,
                    "type": "single_spike",
                    "max_ms": max_ms,
                    "threshold_ms": spike_threshold_ms,
                }
            )
        if p50 > 0 and p99 > (p50 * tail_ratio_limit):
            server_spikes.append(
                {
                    "event_type": event_type,
                    "segment": segment,
                    "type": "tail_ratio_spike",
                    "p50_ms": p50,
                    "p99_ms": p99,
                    "tail_ratio_limit": tail_ratio_limit,
                    "actual_ratio": round(p99 / p50, 3),
                }
            )

    return {"round_trip": round_trip_spikes, "server_segments": server_spikes}


async def generate_full_latency_report(config: LatencyReportConfig) -> Dict[str, Any]:
    cfg = LatencyReportConfig(**config.model_dump())
    ws_url = cfg.ws_url or _default_ws_url()
    space_id = cfg.space_id or f"latency-space-{uuid.uuid4()}"
    set_latency_profiling_enabled(True)
    reset_latency_stats()

    start = time.perf_counter()
    errors: List[str] = []
    round_trip_samples: Dict[str, List[float]] = defaultdict(list)
    clients: List[Tuple[websockets.WebSocketClientProtocol, str]] = []

    user_ids = list(cfg.user_ids or [])
    while len(user_ids) < cfg.client_count:
        user_ids.append(f"latency-user-{len(user_ids):03d}-{uuid.uuid4()}")
    user_ids = user_ids[: cfg.client_count]

    connect_semaphore = asyncio.Semaphore(cfg.connect_concurrency)

    async def _connect_limited(uid: str):
        async with connect_semaphore:
            return await _connect_and_join(ws_url, space_id, uid, cfg.timeout_seconds)

    connect_results = await asyncio.gather(
        *[_connect_limited(uid) for uid in user_ids],
        return_exceptions=True,
    )
    for uid, result in zip(user_ids, connect_results):
        if isinstance(result, Exception):
            errors.append(f"connect/join failed for {uid}: {result}")
            continue
        ws, subscribe_ms, join_ms = result
        clients.append((ws, uid))
        round_trip_samples["subscribe_round_trip"].append(subscribe_ms)
        round_trip_samples["join_round_trip"].append(join_ms)

    async def _safe_record(op_name: str, coro):
        try:
            result = await coro
            if isinstance(result, (int, float)):
                round_trip_samples[op_name].append(float(result))
            elif isinstance(result, list):
                for value in result:
                    if isinstance(value, list):
                        round_trip_samples[op_name].extend(float(inner) for inner in value)
                    else:
                        round_trip_samples[op_name].append(float(value))
        except Exception as exc:
            errors.append(f"{op_name} failed: {exc}")

    if clients:
        async def _position_moves(ws, uid, idx):
            samples = []
            for move_idx in range(cfg.moves_per_client):
                nx = idx * 100 + move_idx
                ny = idx * 50 + move_idx
                payload = {
                    "event": "position_move",
                    "user_id": uid,
                    "space_id": space_id,
                    "nx": nx,
                    "ny": ny,
                    "direction": "right",
                    "isMoving": True,
                }
                t0 = time.perf_counter()
                await ws.send(json.dumps(payload))
                await _recv_event(
                    ws,
                    ["position_move_ack"],
                    cfg.timeout_seconds,
                    predicate=lambda event, user_id=uid, x=nx, y=ny: (
                        event.get("user_id") == user_id
                        and event.get("nx") == x
                        and event.get("ny") == y
                    ),
                )
                samples.append((time.perf_counter() - t0) * 1000.0)
            return samples

        await _safe_record(
            "position_move_round_trip",
            asyncio.gather(
                *[
                    _position_moves(ws, uid, idx)
                    for idx, (ws, uid) in enumerate(clients)
                ]
            ),
        )

        async def _chat_once(ws, uid, idx):
            content = f"latency-chat-{idx}-{uuid.uuid4()}"
            t0 = time.perf_counter()
            await ws.send(json.dumps({"event": "send_chat_message", "data": {"content": content}}))
            await _recv_event(
                ws,
                ["chat_message"],
                cfg.timeout_seconds,
                predicate=lambda event, user_id=uid, msg=content: (
                    event.get("user_id") == user_id and event.get("message") == msg
                ),
            )
            return (time.perf_counter() - t0) * 1000.0

        for idx, (ws, uid) in enumerate(clients):
            await _safe_record("chat_round_trip", _chat_once(ws, uid, idx))

    if len(clients) >= 2:
        sender_ws, sender_id = clients[0]
        receiver_ws, receiver_id = clients[1]

        async def _measure_sender_receiver(op_name: str, payload: Dict[str, Any], expected_events: Iterable[str], predicate):
            t0 = time.perf_counter()
            await sender_ws.send(json.dumps(payload))
            await _recv_event(receiver_ws, expected_events, cfg.timeout_seconds, predicate=predicate)
            return (time.perf_counter() - t0) * 1000.0

        await _safe_record(
            "private_message_round_trip",
            _measure_sender_receiver(
                "private_message_round_trip",
                {
                    "event": "send_private_message",
                    "data": {"receiver_id": receiver_id, "content": f"private-{uuid.uuid4()}"},
                },
                ["private_message"],
                predicate=lambda event: event.get("from_user_id") == sender_id,
            ),
        )

        await _safe_record(
            "code_update_round_trip",
            _measure_sender_receiver(
                "code_update_round_trip",
                {
                    "event": "code_update",
                    "code": "print('latency')",
                    "language": "python",
                    "target_user_ids": [receiver_id],
                },
                ["code_update"],
                predicate=lambda event: event.get("user_id") == sender_id,
            ),
        )

        await _safe_record(
            "code_execution_result_round_trip",
            _measure_sender_receiver(
                "code_execution_result_round_trip",
                {
                    "event": "code_execution_result",
                    "output": "ok",
                    "error": "",
                    "target_user_ids": [receiver_id],
                },
                ["code_execution_result"],
                predicate=lambda event: event.get("output") == "ok",
            ),
        )

        await _safe_record(
            "code_invite_round_trip",
            _measure_sender_receiver(
                "code_invite_round_trip",
                {
                    "event": "send_code_invite",
                    "target_user_ids": [receiver_id],
                    "host_name": "host",
                },
                ["receive_code_invite"],
                predicate=lambda event: event.get("host_id") == sender_id,
            ),
        )

        async def _code_invite_response():
            t0 = time.perf_counter()
            await receiver_ws.send(
                json.dumps(
                    {
                        "event": "code_invite_response",
                        "host_id": sender_id,
                        "accepted": True,
                        "responder_name": "receiver",
                    }
                )
            )
            await _recv_event(
                sender_ws,
                ["receive_code_invite_response"],
                cfg.timeout_seconds,
                predicate=lambda event: event.get("responder_id") == receiver_id,
            )
            return (time.perf_counter() - t0) * 1000.0

        await _safe_record("code_invite_response_round_trip", _code_invite_response())

        async def _code_session_status():
            t0 = time.perf_counter()
            await sender_ws.send(json.dumps({"event": "code_session_status", "in_session": True}))
            await _recv_event(
                receiver_ws,
                ["user_status_update"],
                cfg.timeout_seconds,
                predicate=lambda event: event.get("user_id") == sender_id and event.get("in_code_session") is True,
            )
            return (time.perf_counter() - t0) * 1000.0

        await _safe_record("code_session_status_round_trip", _code_session_status())

        await _safe_record(
            "whiteboard_update_round_trip",
            _measure_sender_receiver(
                "whiteboard_update_round_trip",
                {
                    "event": "whiteboard_update",
                    "elements": '[{"id":"shape-1","type":"rectangle"}]',
                    "files": {},
                    "target_user_ids": [receiver_id],
                },
                ["whiteboard_update"],
                predicate=lambda event: event.get("user_id") == sender_id,
            ),
        )

        await _safe_record(
            "whiteboard_clear_round_trip",
            _measure_sender_receiver(
                "whiteboard_clear_round_trip",
                {"event": "whiteboard_clear", "target_user_ids": [receiver_id]},
                ["whiteboard_clear"],
                predicate=lambda event: event.get("user_id") == sender_id,
            ),
        )

        await _safe_record(
            "whiteboard_invite_round_trip",
            _measure_sender_receiver(
                "whiteboard_invite_round_trip",
                {
                    "event": "send_whiteboard_invite",
                    "target_user_ids": [receiver_id],
                    "host_name": "host",
                },
                ["receive_whiteboard_invite"],
                predicate=lambda event: event.get("host_id") == sender_id,
            ),
        )

        async def _whiteboard_invite_response():
            t0 = time.perf_counter()
            await receiver_ws.send(
                json.dumps(
                    {
                        "event": "whiteboard_invite_response",
                        "host_id": sender_id,
                        "accepted": True,
                        "responder_name": "receiver",
                    }
                )
            )
            await _recv_event(
                sender_ws,
                ["receive_whiteboard_invite_response"],
                cfg.timeout_seconds,
                predicate=lambda event: event.get("responder_id") == receiver_id,
            )
            return (time.perf_counter() - t0) * 1000.0

        await _safe_record("whiteboard_invite_response_round_trip", _whiteboard_invite_response())

        async def _whiteboard_session_status():
            t0 = time.perf_counter()
            await sender_ws.send(json.dumps({"event": "whiteboard_session_status", "in_session": True}))
            await _recv_event(
                receiver_ws,
                ["whiteboard_status_update"],
                cfg.timeout_seconds,
                predicate=lambda event: event.get("user_id") == sender_id and event.get("in_whiteboard_session") is True,
            )
            return (time.perf_counter() - t0) * 1000.0

        await _safe_record("whiteboard_session_status_round_trip", _whiteboard_session_status())

        await _safe_record(
            "webrtc_signal_round_trip",
            _measure_sender_receiver(
                "webrtc_signal_round_trip",
                {
                    "event": "webrtc_signal",
                    "signal_type": "offer",
                    "to_user_id": receiver_id,
                    "space_id": space_id,
                    "data": {"sdp": "fake"},
                },
                ["webrtc_signal"],
                predicate=lambda event: event.get("from_user_id") == sender_id,
            ),
        )

        for operation, start_event, stop_event, start_ack, stop_ack in [
            ("audio_stream", "start_audio_stream", "stop_audio_stream", "audio_stream_started", "audio_stream_stopped"),
            ("video_stream", "start_video_stream", "stop_video_stream", "video_stream_started", "video_stream_stopped"),
            ("screen_stream", "start_screen_stream", "stop_screen_stream", "screen_stream_started", "screen_stream_stopped"),
        ]:
            await _safe_record(
                f"{operation}_start_round_trip",
                _measure_sender_receiver(
                    f"{operation}_start_round_trip",
                    {"event": start_event},
                    [start_ack],
                    predicate=lambda event, sid=sender_id: event.get("user_id") == sid,
                ),
            )
            await _safe_record(
                f"{operation}_stop_round_trip",
                _measure_sender_receiver(
                    f"{operation}_stop_round_trip",
                    {"event": stop_event},
                    [stop_ack],
                    predicate=lambda event, sid=sender_id: event.get("user_id") == sid,
                ),
            )

    leave_samples: List[float] = []
    for ws, _ in clients:
        t0 = time.perf_counter()
        try:
            await ws.send(json.dumps({"event": "left"}))
            await asyncio.wait_for(ws.recv(), timeout=2.0)
        except (ConnectionClosed, asyncio.TimeoutError):
            pass
        except Exception as exc:
            errors.append(f"left failed: {exc}")
        finally:
            leave_samples.append((time.perf_counter() - t0) * 1000.0)
            try:
                await ws.close()
            except Exception:
                pass
    if leave_samples:
        round_trip_samples["left_round_trip"] = leave_samples

    round_trip_stats = {
        op_name: _distribution(samples, cfg.include_samples)
        for op_name, samples in sorted(round_trip_samples.items())
    }
    server_stats = get_latency_stats(include_space_breakdown=True)
    spikes = _build_spike_report(
        round_trip_stats,
        server_stats,
        cfg.spike_threshold_ms,
        cfg.tail_ratio_limit,
    )

    duration_ms = (time.perf_counter() - start) * 1000.0
    return {
        "success": len(errors) == 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "duration_ms": round(duration_ms, 3),
        "config": cfg.model_dump(),
        "space_id": space_id,
        "client_count_connected": len(clients),
        "round_trip": round_trip_stats,
        "server_segments": server_stats,
        "spikes": spikes,
        "errors": errors,
    }


def _build_cli() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate WebSocket latency report")
    parser.add_argument("--ws-url", default=None, help="WebSocket URL to test")
    parser.add_argument("--space-id", default=None, help="Space ID to target")
    parser.add_argument("--client-count", type=int, default=20)
    parser.add_argument("--moves-per-client", type=int, default=5)
    parser.add_argument("--timeout-seconds", type=float, default=8.0)
    parser.add_argument("--include-samples", action="store_true")
    parser.add_argument("--output", default=None, help="Optional file path for JSON report")
    return parser


async def _run_cli(args: argparse.Namespace) -> Dict[str, Any]:
    config = LatencyReportConfig(
        ws_url=args.ws_url,
        space_id=args.space_id,
        client_count=args.client_count,
        moves_per_client=args.moves_per_client,
        timeout_seconds=args.timeout_seconds,
        include_samples=args.include_samples,
    )
    return await generate_full_latency_report(config)


if __name__ == "__main__":
    cli = _build_cli()
    cli_args = cli.parse_args()
    report = asyncio.run(_run_cli(cli_args))
    output = json.dumps(report, indent=2, default=str)
    if cli_args.output:
        with open(cli_args.output, "w", encoding="utf-8") as report_file:
            report_file.write(output)
    else:
        print(output)
