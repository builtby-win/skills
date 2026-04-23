#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SKILL_FILE="$ROOT_DIR/skills/gaud-mode/SKILL.md"
UPDATE_CHECK="$ROOT_DIR/skills/gaud-mode/bin/gaud-mode-update-check"
UPGRADE_SCRIPT="$ROOT_DIR/skills/gaud-mode/bin/gaud-mode-upgrade"
GAUD_POLL_INSTALL="$ROOT_DIR/skills/gaud-mode/bin/gaud-poll-install"

if ! grep -Fq '"$PWD/skills/gaud-mode"' "$SKILL_FILE"; then
  echo "missing repo checkout update-check path: \"\$PWD/skills/gaud-mode\"" >&2
  exit 1
fi

if ! grep -Fq '"skills/gaud-mode"' "$SKILL_FILE"; then
  echo 'missing relative repo checkout update-check path: "skills/gaud-mode"' >&2
  exit 1
fi

if ! grep -Fq 'https://raw.githubusercontent.com/builtby-win/skills/main/skills/gaud-mode/VERSION' "$UPDATE_CHECK"; then
  echo 'missing canonical builtby-win/skills version URL in gaud-mode-update-check' >&2
  exit 1
fi

if ! grep -Fq 'https://raw.githubusercontent.com/builtby-win/skills/main/packages/gaud-poll/package.json' "$UPDATE_CHECK"; then
  echo 'missing canonical builtby-win/skills gaud-poll package URL in gaud-mode-update-check' >&2
  exit 1
fi

if grep -Fq 'GAUD_MODE_REMOTE_URL' "$UPDATE_CHECK"; then
  echo 'gaud-mode-update-check still allows overriding the canonical update URL' >&2
  exit 1
fi

if ! grep -Fq 'BINARY_UPGRADE_AVAILABLE gaud-poll' "$SKILL_FILE"; then
  echo 'missing gaud-poll binary upgrade guidance in gaud-mode skill entrypoint' >&2
  exit 1
fi

if ! grep -Fq 'ask whether to run `"$_GAUD_DIR/bin/gaud-mode-upgrade"` automatically' "$SKILL_FILE"; then
  echo 'missing user confirmation guidance for gaud skill upgrades in gaud-mode skill entrypoint' >&2
  exit 1
fi

if ! grep -Fq 'ask whether to run the gaud upgrade wrapper automatically' "$SKILL_FILE"; then
  echo 'missing user confirmation guidance for gaud-poll binary upgrades in gaud-mode skill entrypoint' >&2
  exit 1
fi

if ! grep -Fq 'gaud-poll-install --quiet-current' "$SKILL_FILE"; then
  echo 'missing quiet current gaud-poll reconcile hook in gaud-mode skill entrypoint' >&2
  exit 1
fi

if ! grep -Fq 'https://github.com/builtby-win/skills.git' "$UPGRADE_SCRIPT"; then
  echo 'missing canonical builtby-win/skills repo URL in gaud-mode-upgrade' >&2
  exit 1
fi

if grep -Fq 'GAUD_MODE_REPO_URL' "$UPGRADE_SCRIPT"; then
  echo 'gaud-mode-upgrade still allows overriding the canonical repo URL' >&2
  exit 1
fi

if ! grep -Fq -- '--quiet-current' "$GAUD_POLL_INSTALL"; then
  echo 'missing quiet current support in gaud-poll-install' >&2
  exit 1
fi
