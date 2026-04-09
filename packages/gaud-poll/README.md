# gaud-poll

Polling daemon for [gaud-mode](../../skills/gaud-mode) — monitors tmux specialist panes for `GAUDMODE` callbacks and detects stuck states.

Solves the problem where specialist callbacks flake (Enter keystroke dropped) and the orchestrator forgets to poll.

## Prerequisites

- **[Bun](https://bun.sh)** — required to build the binary
- **tmux** — must be running

## Install

```bash
cd packages/gaud-poll
bun install
bun run build
```

This compiles a self-contained binary at `bin/gaud-poll` — no runtime needed to run it after compilation.

## Usage

### Watch specialist panes and forward to conductor

The orchestrator launches gaud-poll with its own pane ID as `--conductor`. When gaud-poll detects a callback, stuck pane, or dead pane, it sends a `GAUDMODE` message directly to the conductor via `tmux-cli send`.

For pane-health problems, gaud-poll uses the existing `GAUDMODE waiting-user`
envelope with a reserved summary prefix:

```text
GAUDMODE waiting-user role=<role> milestone=<milestone> workstream=gaud-poll summary=suspected-stuck: ...
```

This keeps the top-level callback verbs stable while letting the conductor treat
`suspected-stuck:` as a machine-detectable pane-health/debug signal.

```bash
gaud-poll watch \
  -c %0 \
  -p %5:Implementer:codex \
  -p %12:Integrator:opencode \
  -i 20
```

### Quick scan — find callbacks across all tmux panes

```bash
gaud-poll scan
```

### Write events to a JSONL file (in addition to forwarding)

```bash
gaud-poll watch \
  -c %0 \
  -p %5:Implementer:codex \
  -o /tmp/gaud-events.jsonl
```

### One-shot poll of specific panes

```bash
gaud-poll poll -p %5:Implementer:codex
gaud-poll poll -p gaud:1.2:Implementer:codex
```

## Pane format

```
<pane_target>:<role>:<expected_command>
```

- `pane_target` — tmux pane ID (e.g. `%5`) or full tmux target (e.g. `gaud:1.2`)
- `role` — gaud role name (e.g. `Implementer`, `Integrator`, `UX/UI`)
- `expected_command` — the CLI the pane should be running (e.g. `codex`, `opencode`, `claude`)

If the pane's process changes to a shell (`zsh`/`bash`/`sh`), gaud-poll reports it as `shell-dropped`.

## Events

Events are printed as human-readable lines to stderr and as JSONL to stdout (or to `--output` file).

| Icon | Type | Meaning |
|------|------|---------|
| ✅ | `callback:done` | Specialist completed work |
| 🙋 | `callback:waiting-user` | Specialist needs a user/PM decision |
| 🔑 | `callback:waiting-permission` | Specialist needs an execution approval |
| ⚠️ | `stuck` | Pane is stuck (shell-dropped, error, etc.) |
| 💀 | `pane-dead` | Pane no longer exists |

## Integration with gaud-mode

At the start of a gaud run, the orchestrator:

1. Captures its own pane ID: `tmux display-message -p '#{pane_id}'` → e.g. `%0`
2. Launches gaud-poll in a background pane with `--conductor %0` and all specialist `--pane` args
3. gaud-poll polls every 30s and forwards any detected events to the conductor as `GAUDMODE` messages

This means the conductor gets callbacks even when:
- The specialist's `tmux-cli send` fired but Enter was dropped
- The specialist exited without sending a callback
- The specialist is stuck on an error

Worker callbacks are preserved in the same `GAUDMODE ... role=... milestone=... workstream=... summary=...` shape they were instructed to send so the conductor can key off one stable contract.
