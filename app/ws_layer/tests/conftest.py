import asyncio
import os
import socket
from pathlib import Path

import httpx
import pytest_asyncio


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@pytest_asyncio.fixture(scope="module")
async def ws_server():
    ws_layer_dir = Path(__file__).resolve().parents[1]
    host = "127.0.0.1"
    port = _free_port()

    env = os.environ.copy()
    env["WS_HOST"] = host
    env["WS_PORT"] = str(port)
    env["WS_TEST_MODE"] = "1"
    env["WS_LATENCY_PROFILING"] = "1"
    env.setdefault("WS_LATENCY_SLOW_MS", "10000")

    process = await asyncio.create_subprocess_exec(
        "python3",
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        host,
        "--port",
        str(port),
        "--log-level",
        "warning",
        cwd=str(ws_layer_dir),
        env=env,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )

    base_url = f"http://{host}:{port}"
    for _ in range(100):
        if process.returncode is not None:
            raise RuntimeError(f"WS test server exited early with code {process.returncode}")
        try:
            async with httpx.AsyncClient(timeout=1.0) as client:
                response = await client.get(f"{base_url}/")
                if response.status_code == 200:
                    break
        except Exception:
            await asyncio.sleep(0.1)
    else:
        process.terminate()
        await process.wait()
        raise RuntimeError("WS test server did not start in time")

    yield {
        "host": host,
        "port": port,
        "ws_url": f"ws://{host}:{port}/ws/metaverse/space",
        "http_url": base_url,
    }

    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=10)
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
