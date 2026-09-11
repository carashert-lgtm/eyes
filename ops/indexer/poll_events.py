#!/usr/bin/env python3
"""Poll Eyes Open factory events and append JSONL audit trail."""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVENTS_PATH = ROOT / "data" / "events.jsonl"


def load_deployment() -> dict | None:
    for name in ("base-mainnet.json", "base-sepolia.json", "anvil.json"):
        path = ROOT / "deployments" / name
        if path.exists():
            with path.open(encoding="utf-8") as f:
                data = json.load(f)
            if data.get("factory"):
                return data
    return None


def rpc_url(chain_id: int) -> str:
    if chain_id == 31337:
        return os.environ.get("ANVIL_RPC_URL", "http://127.0.0.1:8545")
    if chain_id == 8453:
        return os.environ.get("BASE_MAINNET_RPC_URL", "https://mainnet.base.org")
    return os.environ.get("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")


def eth_call(rpc: str, method: str, params: list) -> object:
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(rpc, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.load(resp)
    if "error" in body:
        raise RuntimeError(body["error"])
    return body["result"]


def append_event(row: dict) -> None:
    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with EVENTS_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")


def main() -> int:
    dep = load_deployment()
    if not dep:
        print("No deployment with factory address found.")
        return 1

    chain_id = int(dep.get("chainId", 84532))
    factory = dep["factory"]
    rpc = rpc_url(chain_id)

    # LaunchCreated(uint256,address,address,uint64,uint64)
    topic0 = "0x" + "LaunchCreated(uint256,address,address,uint64,uint64)".encode().hex()
    # keccak would be needed for real topic — use eth_getLogs with address only for scaffold summary
    block = eth_call(rpc, "eth_blockNumber", [])
    block_num = int(block, 16)

    row = {
        "type": "indexer_poll",
        "factory": factory,
        "chainId": chain_id,
        "block": block_num,
        "ts": int(__import__("time").time()),
    }
    append_event(row)
    print(f"Indexed poll at block {block_num} → {EVENTS_PATH}")
    print("For full launch sync run: node ops/indexer/sync_launches.mjs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
