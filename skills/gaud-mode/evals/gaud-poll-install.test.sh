#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PKG_DIR="$ROOT_DIR/packages/gaud-poll"
INSTALL_SCRIPT="$ROOT_DIR/skills/gaud-mode/bin/gaud-poll-install"
BIN_DIR="$PKG_DIR/bin"
BIN="$BIN_DIR/gaud-poll"
BUILD_INFO="$BIN_DIR/gaud-poll.build.json"
TMP_DIR="$(mktemp -d)"
TEST_HOME="$TMP_DIR/home"
ORIG_BIN="$TMP_DIR/original-bin"
ORIG_BUILD_INFO="$TMP_DIR/original-build-info"

cleanup() {
  if [ -f "$ORIG_BIN" ]; then
    cp "$ORIG_BIN" "$BIN"
  else
    rm -f "$BIN"
  fi

  if [ -f "$ORIG_BUILD_INFO" ]; then
    cp "$ORIG_BUILD_INFO" "$BUILD_INFO"
  else
    rm -f "$BUILD_INFO"
  fi

  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$BIN_DIR" "$TEST_HOME"

if [ -f "$BIN" ]; then
  cp "$BIN" "$ORIG_BIN"
fi

if [ -f "$BUILD_INFO" ]; then
  cp "$BUILD_INFO" "$ORIG_BUILD_INFO"
fi

CURRENT_INFO="$(bun --eval '
  import { createHash } from "node:crypto";
  import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
  import { join, relative } from "node:path";

  const packageDir = process.argv[1];
  const hash = createHash("sha256");
  const files = ["package.json", "tsconfig.json"];

  if (existsSync(join(packageDir, "bun.lock"))) {
    files.push("bun.lock");
  }

  const srcDir = join(packageDir, "src");
  const pending = [srcDir];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
        continue;
      }
      if (entry.isFile() && fullPath.endsWith(".ts")) {
        files.push(relative(packageDir, fullPath));
      }
    }
  }

  files.sort();

  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(join(packageDir, file)));
    hash.update("\0");
  }

  const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  process.stdout.write(JSON.stringify({
    name: packageJson.name,
    version: packageJson.version,
    fingerprint: `sha256:${hash.digest("hex")}`,
  }));
' "$PKG_DIR")"

write_good_binary() {
  cat > "$BIN" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" = "--version" ] || [ "${1:-}" = "-v" ]; then
  printf 'gaud-poll 0.1.0\n'
  exit 0
fi
printf 'fake gaud-poll\n'
EOF
  chmod +x "$BIN"
}

write_bad_binary() {
  cat > "$BIN" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
  chmod +x "$BIN"
}

write_current_metadata() {
  printf '%s\n' "$CURRENT_INFO" > "$BUILD_INFO"
}

write_stale_metadata() {
  printf '%s\n' '{"name":"@builtby.win/gaud-poll","version":"0.1.0","fingerprint":"sha256:stale"}' > "$BUILD_INFO"
}

run_install() {
  HOME="$TEST_HOME" "$INSTALL_SCRIPT" "$@" 2>&1
}

expect_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'expected output to contain %q\nactual output:\n%s\n' "$needle" "$haystack" >&2
    exit 1
  fi
}

expect_rebuild_message() {
  local output="$1"
  case "$output" in
    *"Building gaud-poll..."*|*"Rebuilding gaud-poll..."*)
      ;;
    *)
      printf 'expected rebuild output, got:\n%s\n' "$output" >&2
      exit 1
      ;;
  esac
}

write_good_binary
write_current_metadata
current_output="$(run_install)"
expect_contains "$current_output" "already current"

quiet_current_output="$(run_install --quiet-current)"
if [ -n "$quiet_current_output" ]; then
  printf 'expected no output for --quiet-current when binary is already current, got:\n%s\n' "$quiet_current_output" >&2
  exit 1
fi

write_good_binary
rm -f "$BUILD_INFO"
missing_metadata_output="$(run_install)"
expect_rebuild_message "$missing_metadata_output"

write_good_binary
write_stale_metadata
stale_output="$(run_install)"
expect_rebuild_message "$stale_output"

write_bad_binary
write_current_metadata
corrupt_output="$(run_install)"
expect_rebuild_message "$corrupt_output"

write_good_binary
write_current_metadata
force_output="$(run_install --force)"
expect_rebuild_message "$force_output"
