#!/usr/bin/env python3

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlencode


NEWLINE_KEYS = {
    "titles",
    "to-dos",
    "checklist-items",
    "prepend-checklist-items",
    "append-checklist-items",
}

CSV_KEYS = {"tags", "add-tags", "filter"}


def load_params(args):
    params = {}
    if args.params_json:
        params.update(json.loads(args.params_json))
    if args.params_file:
        params.update(json.loads(Path(args.params_file).read_text()))
    if args.data_file:
        params["data"] = json.loads(Path(args.data_file).read_text())
    return params


def normalize_value(key, value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return ""
    if key == "data":
        return json.dumps(value, separators=(",", ":"))
    if isinstance(value, list):
        if key in NEWLINE_KEYS:
            return "\n".join(str(item) for item in value)
        if key in CSV_KEYS:
            return ",".join(str(item) for item in value)
        return json.dumps(value, separators=(",", ":"))
    if isinstance(value, (dict, int, float)):
        return (
            json.dumps(value, separators=(",", ":"))
            if isinstance(value, dict)
            else str(value)
        )
    return str(value)


def build_url(command, params):
    normalized = {key: normalize_value(key, value) for key, value in params.items()}
    query = urlencode(normalized)
    base = f"things:///{command}"
    return f"{base}?{query}" if query else base


def main():
    parser = argparse.ArgumentParser(
        description="Build and optionally open Things URLs."
    )
    parser.add_argument(
        "command", help="Things URL command, e.g. add, update, add-project, json"
    )
    parser.add_argument("--params-json", help="JSON object of URL parameters")
    parser.add_argument(
        "--params-file", help="Path to a JSON file containing URL parameters"
    )
    parser.add_argument(
        "--data-file", help="Path to JSON payload for the `json` command"
    )
    parser.add_argument(
        "--open", action="store_true", dest="open_url", help="Open the generated URL"
    )
    args = parser.parse_args()

    params = load_params(args)
    url = build_url(args.command, params)
    print(url)

    if args.open_url:
        completed = subprocess.run(["open", url], check=False)
        if completed.returncode != 0:
            sys.exit(completed.returncode)


if __name__ == "__main__":
    main()
