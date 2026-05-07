#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HELPER="$ROOT_DIR/skills/gaud-mode/bin/gaud-agent-usage"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat > "$TMP_DIR/global.jsonl" <<'JSON'
{"orchestrator":{"name":"Lead","cli":"opencode","model":"gpt-5"},"implementers":[{"name":"CodexImpl","cli":"codex","model":"gpt-5.1"},{"name":"ClaudeImpl","cli":"claude"}],"fallbacks":{"implementers":["opencode","claude"]}}
JSON

cat > "$TMP_DIR/.gaud.config.jsonl" <<'JSON'
{"implementers":[{"name":"GeminiUI","cli":"gemini","model":"gemini-2.5-pro"},{"name":"CodexFast","cli":"codex","model":"gpt-5.1-mini"}]}
JSON

python3 - "$TMP_DIR/usage-cache.json" <<'PYJSON'
import json
import sys
import time

now = int(time.time() * 1000)
state = {
    "providers": [
        {
            "provider_id": "codex",
            "provider_name": "Codex",
            "quotas": [
                {
                    "id": "codex:Rolling 5-Hour",
                    "quota_type": {"type": "FiveHour"},
                    "provider_id": "codex",
                    "percent_remaining": 63,
                    "resets_at_ms": now + 45 * 60 * 1000,
                    "reset_text": "45m",
                },
                {
                    "id": "codex:unrelated-model",
                    "quota_type": {"type": "ModelSpecific", "value": "unrelated-model"},
                    "provider_id": "codex",
                    "percent_remaining": 0,
                    "resets_at_ms": now + 2 * 60 * 60 * 1000,
                    "reset_text": "2h",
                },
            ],
            "account_email": None,
            "captured_at_ms": now,
            "error": None,
            "auth_type": "oauth",
        },
        {
            "provider_id": "gemini",
            "provider_name": "Gemini CLI",
            "quotas": [
                {
                    "id": "gemini:2.5-pro",
                    "quota_type": {"type": "ModelSpecific", "value": "gemini-2.5-pro"},
                    "provider_id": "gemini",
                    "percent_remaining": 0,
                    "resets_at_ms": now + 4 * 60 * 60 * 1000,
                    "reset_text": "4h",
                },
                {
                    "id": "gemini:2.5-flash",
                    "quota_type": {"type": "ModelSpecific", "value": "gemini-2.5-flash"},
                    "provider_id": "gemini",
                    "percent_remaining": 100,
                    "resets_at_ms": now + 60 * 60 * 1000,
                    "reset_text": "1h",
                },
            ],
            "account_email": None,
            "captured_at_ms": now,
            "error": None,
            "auth_type": "oauth",
        },
        {
            "provider_id": "opencode",
            "provider_name": "OpenCode",
            "quotas": [],
            "account_email": None,
            "captured_at_ms": now,
            "error": None,
            "auth_type": "local",
        },
        {
            "provider_id": "claude",
            "provider_name": "Claude Code",
            "quotas": [
                {
                    "id": "claude:Rolling 5-Hour",
                    "quota_type": {"type": "FiveHour"},
                    "provider_id": "claude",
                    "percent_remaining": 6,
                    "resets_at_ms": now + 15 * 60 * 1000,
                    "reset_text": "15m",
                }
            ],
            "account_email": None,
            "captured_at_ms": now,
            "error": None,
            "auth_type": "oauth",
        },
    ],
    "last_refresh_ms": now,
    "worst_status": "depleted",
}
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump(state, handle)
PYJSON

output="$(GAUD_CONFIG_GLOBAL="$TMP_DIR/global.jsonl" GAUD_CONFIG_REPO="$TMP_DIR/.gaud.config.jsonl" GAUD_USAGE_CACHE="$TMP_DIR/usage-cache.json" "$HELPER" --repo "$TMP_DIR")"

case "$output" in
  *"GeminiUI [implementer] cli=gemini model=gemini-2.5-pro status=quota-blocked"*) ;;
  *) printf 'expected GeminiUI to be quota-blocked\n%s\n' "$output" >&2; exit 1 ;;
esac

case "$output" in
  *"CodexFast [implementer] cli=codex model=gpt-5.1-mini status=ready remaining=63%"*) ;;
  *) printf 'expected CodexFast to ignore unrelated depleted model quota and stay ready\n%s\n' "$output" >&2; exit 1 ;;
esac

case "$output" in
  *"Fallback implementer 2 [fallback:implementer] cli=claude"*) ;;
  *) printf 'expected fallback implementer agents to be included\n%s\n' "$output" >&2; exit 1 ;;
esac

case "$output" in
  *"prefer soon: quota resets shortly"*) ;;
  *) printf 'expected expiring-ready recommendation\n%s\n' "$output" >&2; exit 1 ;;
esac

json_output="$(GAUD_CONFIG_GLOBAL="$TMP_DIR/global.jsonl" GAUD_CONFIG_REPO="$TMP_DIR/.gaud.config.jsonl" GAUD_USAGE_CACHE="$TMP_DIR/usage-cache.json" "$HELPER" --repo "$TMP_DIR" --json)"

python3 - "$json_output" <<'PYCHECK'
import json
import sys

report = json.loads(sys.argv[1])
agents = report["agents"]
by_name = {agent["name"]: agent for agent in agents}
assert [agent["name"] for agent in agents] == ["Lead", "GeminiUI", "CodexFast", "Fallback implementer 1", "Fallback implementer 2"]
assert by_name["GeminiUI"]["health"]["status"] == "quota-blocked"
assert by_name["CodexFast"]["health"]["status"] == "ready"
assert by_name["CodexFast"]["health"]["remaining_percent"] == 63.0
assert by_name["Fallback implementer 2"]["health"]["status"] == "ready"
assert by_name["Fallback implementer 2"]["recommendation"].startswith("conserve")
assert report["ranked_agents"][0]["name"] == "CodexFast"
assert report["ranked_agents"].index(by_name["Fallback implementer 2"]) > report["ranked_agents"].index(by_name["CodexFast"])
assert report["usage_cache_path"].endswith("usage-cache.json")
PYCHECK

python3 - "$TMP_DIR/stale-cache.json" <<'PYSTALE'
import json
import sys
import time
state = {
    "providers": [{"provider_id": "codex", "provider_name": "Codex", "quotas": [], "error": None}],
    "last_refresh_ms": int(time.time() * 1000) - 31 * 60 * 1000,
    "worst_status": "healthy",
}
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump(state, handle)
PYSTALE

STALE_REPO="$TMP_DIR/stale-repo"
mkdir -p "$STALE_REPO"
stale_output="$(GAUD_CONFIG_GLOBAL="$TMP_DIR/global.jsonl" GAUD_CONFIG_REPO="$TMP_DIR/.gaud.config.jsonl" GAUD_USAGE_CACHE="$TMP_DIR/stale-cache.json" B2V_USAGE_CACHE="$TMP_DIR/missing-cache.json" "$HELPER" --repo "$STALE_REPO")"
case "$stale_output" in
  *"usage_snapshot=none"*"stale_usage_snapshots=$TMP_DIR/stale-cache.json"*) ;;
  *) printf 'expected stale cache to be reported and ignored\n%s\n' "$stale_output" >&2; exit 1 ;;
esac
