#!/usr/bin/env python3
"""Minimal Eyes Open keeper - calls executeBuyAndBurnAuto when queue is ready."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request

EXECUTOR_ABI = [
    {
        "name": "burnQueueStatus",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {"name": "pendingEth", "type": "uint256"},
            {"name": "minProceedsEth", "type": "uint256"},
            {"name": "ready", "type": "bool"},
            {"name": "totalEyesBurned", "type": "uint256"},
            {"name": "eyesSupply", "type": "uint256"},
        ],
    },
    {
        "name": "executeBuyAndBurnAuto",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [],
        "outputs": [{"name": "eyesBurned", "type": "uint256"}],
    },
]


def load_env(path: str = ".env") -> dict[str, str]:
    env: dict[str, str] = {}
    if not os.path.exists(path):
        return env
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def rpc_call(rpc: str, method: str, params: list) -> dict:
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(rpc, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    if "error" in data:
        raise RuntimeError(data["error"])
    return data["result"]


def eth_call(rpc: str, to: str, data: str) -> str:
    return rpc_call(rpc, "eth_call", [{"to": to, "data": data}, "latest"])


def selector(sig: str) -> str:
    # minimal keccak for known selectors (precomputed)
    mapping = {
        "burnQueueStatus()": "0x" + "burnQueueStatus".ljust(8, "0"),  # placeholder replaced below
    }
    # precomputed selectors
    if sig == "burnQueueStatus()":
        return "0x8b732947"  # update if needed via cast sig
    if sig == "executeBuyAndBurnAuto()":
        return "0x"  # will use cast in README; fallback skip send
    return mapping.get(sig, "0x")


def main() -> int:
    env = load_env()
    rpc = env.get("BASE_SEPOLIA_RPC_URL", os.environ.get("BASE_SEPOLIA_RPC_URL", ""))
    executor = env.get("EYES_BUY_BURN_EXECUTOR", os.environ.get("EYES_BUY_BURN_EXECUTOR", ""))
    dry = env.get("KEEPER_DRY_RUN", "true").lower() == "true"

    if not rpc or not executor:
        print("Set BASE_SEPOLIA_RPC_URL and EYES_BUY_BURN_EXECUTOR in .env")
        return 1

    print("Eyes keeper (scaffold)")
    print("  executor:", executor)
    print("  dry_run:", dry)
    print("")
    print("For testnet, prefer the Foundry keeper script:")
    print("  .\\scripts\\deploy-base-sepolia.ps1 -Step keeper")
    print("")
    print("This Python scaffold is a placeholder for cron + alerts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
