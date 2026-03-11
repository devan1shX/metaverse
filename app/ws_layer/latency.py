"""
Lightweight latency profiling for the WebSocket layer.
"""

from __future__ import annotations

import json
import math
import os
import threading
import time
from collections import defaultdict
from contextlib import contextmanager
from typing import Any, Dict, Iterator, List, Optional, Tuple

from logger import logger

_TRUTHY = {"1", "true", "yes", "on"}
_enabled = os.getenv("WS_LATENCY_PROFILING", "0").strip().lower() in _TRUTHY
_slow_threshold_ms = float(os.getenv("WS_LATENCY_SLOW_MS", "100"))

_lock = threading.Lock()
_metrics: Dict[Tuple[str, str], List[float]] = defaultdict(list)
_space_metrics: Dict[Tuple[str, str, str], List[float]] = defaultdict(list)
_samples_recorded = 0


def perf_now() -> float:
    return time.perf_counter()


def elapsed_ms(start_time: float, end_time: Optional[float] = None) -> float:
    end = perf_now() if end_time is None else end_time
    return (end - start_time) * 1000.0


def is_latency_profiling_enabled() -> bool:
    return _enabled


def set_latency_profiling_enabled(enabled: bool) -> None:
    global _enabled
    _enabled = bool(enabled)


def set_slow_threshold_ms(threshold_ms: float) -> None:
    global _slow_threshold_ms
    _slow_threshold_ms = float(threshold_ms)


def _normalize_event(event_type: Any) -> str:
    if event_type is None:
        return "unknown"
    return str(event_type)


def _normalize_segment(segment: Any) -> str:
    if segment is None:
        return "unknown"
    return str(segment)


def record_duration(
    event_type: Any,
    segment: Any,
    duration_ms: float,
    *,
    space_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    global _samples_recorded
    if not _enabled:
        return
    if duration_ms is None or math.isnan(duration_ms) or duration_ms < 0:
        return

    normalized_event = _normalize_event(event_type)
    normalized_segment = _normalize_segment(segment)

    with _lock:
        _metrics[(normalized_event, normalized_segment)].append(duration_ms)
        if space_id:
            _space_metrics[(normalized_event, normalized_segment, str(space_id))].append(duration_ms)
        _samples_recorded += 1

    if duration_ms >= _slow_threshold_ms:
        payload = {
            "type": "ws_latency_slow_sample",
            "event": normalized_event,
            "segment": normalized_segment,
            "duration_ms": round(duration_ms, 3),
            "space_id": space_id,
            "metadata": metadata or {},
        }
        logger.warning(json.dumps(payload, default=str))


@contextmanager
def latency_span(
    event_type: Any,
    segment: Any,
    *,
    space_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Iterator[None]:
    start = perf_now()
    try:
        yield
    finally:
        record_duration(
            event_type,
            segment,
            elapsed_ms(start),
            space_id=space_id,
            metadata=metadata,
        )


def reset_latency_stats() -> None:
    global _samples_recorded
    with _lock:
        _metrics.clear()
        _space_metrics.clear()
        _samples_recorded = 0


def _percentile(sorted_values: List[float], percentile: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]

    rank = (percentile / 100.0) * (len(sorted_values) - 1)
    lower = int(math.floor(rank))
    upper = int(math.ceil(rank))
    if lower == upper:
        return sorted_values[lower]
    weight = rank - lower
    return sorted_values[lower] + (sorted_values[upper] - sorted_values[lower]) * weight


def _build_stats(values: List[float]) -> Dict[str, float]:
    if not values:
        return {
            "count": 0,
            "sum_ms": 0.0,
            "avg_ms": 0.0,
            "min_ms": 0.0,
            "max_ms": 0.0,
            "p50_ms": 0.0,
            "p95_ms": 0.0,
            "p99_ms": 0.0,
        }

    sorted_values = sorted(values)
    total = sum(sorted_values)
    return {
        "count": len(sorted_values),
        "sum_ms": round(total, 3),
        "avg_ms": round(total / len(sorted_values), 3),
        "min_ms": round(sorted_values[0], 3),
        "max_ms": round(sorted_values[-1], 3),
        "p50_ms": round(_percentile(sorted_values, 50), 3),
        "p95_ms": round(_percentile(sorted_values, 95), 3),
        "p99_ms": round(_percentile(sorted_values, 99), 3),
    }


def get_latency_stats(include_space_breakdown: bool = False) -> Dict[str, Any]:
    with _lock:
        metrics_snapshot = {key: list(values) for key, values in _metrics.items()}
        space_snapshot = {key: list(values) for key, values in _space_metrics.items()}
        sample_count = _samples_recorded

    grouped: Dict[str, Dict[str, Dict[str, float]]] = {}
    flat: List[Dict[str, Any]] = []

    for (event_type, segment), values in sorted(metrics_snapshot.items()):
        segment_stats = _build_stats(values)
        grouped.setdefault(event_type, {})[segment] = segment_stats
        flat.append(
            {
                "event_type": event_type,
                "segment": segment,
                **segment_stats,
            }
        )

    result: Dict[str, Any] = {
        "enabled": _enabled,
        "samples_recorded": sample_count,
        "metrics": grouped,
        "flat_metrics": flat,
    }

    if include_space_breakdown:
        by_space: List[Dict[str, Any]] = []
        for (event_type, segment, space_id), values in sorted(space_snapshot.items()):
            by_space.append(
                {
                    "event_type": event_type,
                    "segment": segment,
                    "space_id": space_id,
                    **_build_stats(values),
                }
            )
        result["space_metrics"] = by_space

    return result


__all__ = [
    "elapsed_ms",
    "get_latency_stats",
    "is_latency_profiling_enabled",
    "latency_span",
    "perf_now",
    "record_duration",
    "reset_latency_stats",
    "set_latency_profiling_enabled",
    "set_slow_threshold_ms",
]
