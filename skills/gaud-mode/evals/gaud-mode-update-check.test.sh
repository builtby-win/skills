#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
UPDATE_CHECK="$ROOT_DIR/skills/gaud-mode/bin/gaud-mode-update-check"
TMP_DIR="$(mktemp -d)"
STATE_DIR="$TMP_DIR/state"
FAKE_BIN="$TMP_DIR/bin"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$STATE_DIR" "$FAKE_BIN"

LOCAL_SKILL_VERSION="$(tr -d '[:space:]' < "$ROOT_DIR/skills/gaud-mode/VERSION")"
LOCAL_GAUD_POLL_VERSION="$(python3 - <<'PY' "$ROOT_DIR/packages/gaud-poll/package.json"
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as handle:
    package_json = json.load(handle)

print(package_json['version'], end='')
PY
)"

cat > "$FAKE_BIN/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

url="${@: -1}"

case "$url" in
  https://raw.githubusercontent.com/builtby-win/skills/main/skills/gaud-mode/VERSION)
    printf '%s' "${FAKE_SKILL_REMOTE_VERSION:-}"
    ;;
  https://raw.githubusercontent.com/builtby-win/skills/main/packages/gaud-poll/package.json)
    printf '{"version":"%s"}' "${FAKE_GAUD_POLL_REMOTE_VERSION:-}"
    ;;
  *)
    exit 1
    ;;
esac
EOF
chmod +x "$FAKE_BIN/curl"

expect_contains() {
  local haystack="$1"
  local needle="$2"

  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'expected output to contain %q\nactual output:\n%s\n' "$needle" "$haystack" >&2
    exit 1
  fi
}

expect_empty() {
  local value="$1"

  if [ -n "$value" ]; then
    printf 'expected empty output, got:\n%s\n' "$value" >&2
    exit 1
  fi
}

same_output="$(
  PATH="$FAKE_BIN:$PATH" \
  GAUD_MODE_STATE_DIR="$STATE_DIR" \
  FAKE_SKILL_REMOTE_VERSION="$LOCAL_SKILL_VERSION" \
  FAKE_GAUD_POLL_REMOTE_VERSION="$LOCAL_GAUD_POLL_VERSION" \
  "$UPDATE_CHECK"
)"
expect_empty "$same_output"

binary_output="$(
  PATH="$FAKE_BIN:$PATH" \
  GAUD_MODE_STATE_DIR="$STATE_DIR" \
  FAKE_SKILL_REMOTE_VERSION="$LOCAL_SKILL_VERSION" \
  FAKE_GAUD_POLL_REMOTE_VERSION="9.9.9" \
  "$UPDATE_CHECK"
)"
expect_contains "$binary_output" "BINARY_UPGRADE_AVAILABLE gaud-poll $LOCAL_GAUD_POLL_VERSION 9.9.9"

skill_output="$(
  PATH="$FAKE_BIN:$PATH" \
  GAUD_MODE_STATE_DIR="$STATE_DIR" \
  FAKE_SKILL_REMOTE_VERSION="9.9.9" \
  FAKE_GAUD_POLL_REMOTE_VERSION="$LOCAL_GAUD_POLL_VERSION" \
  "$UPDATE_CHECK"
)"
expect_contains "$skill_output" "UPGRADE_AVAILABLE $LOCAL_SKILL_VERSION 9.9.9"
