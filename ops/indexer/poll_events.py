#!/usr/bin/env python3
"""Scaffold: poll Eyes Open events via eth_getLogs (design only)."""

from __future__ import annotations

import json
import os


def main() -> int:
    print("Eyes indexer scaffold")
    print("See docs/INDEXER_PLAN.md for the full design.")
    print("")
    print("Planned output: data/events.jsonl")
    if not os.path.exists("deployments/base-sepolia.json"):
        print("No deployment file yet. Run deploy first.")
        return 1
    with open("deployments/base-sepolia.json", encoding="utf-8") as f:
        dep = json.load(f)
    print("Indexed contracts:")
    for key in ("factory", "feeCollector", "buyBurnExecutor", "liquidityLocker"):
        print(f"  {key}: {dep.get(key, 'missing')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
