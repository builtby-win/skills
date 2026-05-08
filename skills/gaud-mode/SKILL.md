---
name: gaud-mode
description: Use when substantial implementation work should run through tmux with one orchestrator agent and one or more implementer agents, especially when the user says gaud, gaud-mode, god, godmode, or god-mode and wants milestone-based check-backs instead of one long unsupervised run.
---

## Update Check

Run this first on every gaud invocation:

```bash
_GAUD_DIR=""
for d in \
  "$PWD/skills/gaud-mode" \
  "skills/gaud-mode" \
  "$HOME/.claude/skills/gaud-mode" \
  ".claude/skills/gaud-mode" \
  "$HOME/.config/opencode/skills/gaud-mode" \
  ".config/opencode/skills/gaud-mode"
do
  if [ -x "$d/bin/gaud-mode-update-check" ]; then
    _GAUD_DIR="$d"
    break
  fi
done
_GAUD_UPD=""
if [ -n "$_GAUD_DIR" ]; then
  _GAUD_UPD="$($_GAUD_DIR/bin/gaud-mode-update-check 2>/dev/null || true)"
fi
[ -n "$_GAUD_UPD" ] && printf '%s\n' "$_GAUD_UPD" || true

if [ -n "$_GAUD_DIR" ] && [ -x "$_GAUD_DIR/bin/gaud-poll-install" ]; then
  _GAUD_POLL_RECONCILE="$($_GAUD_DIR/bin/gaud-poll-install --quiet-current 2>&1 || true)"
  [ -n "$_GAUD_POLL_RECONCILE" ] && printf '%s\n' "$_GAUD_POLL_RECONCILE" || true
fi
```

- If output shows `UPGRADE_AVAILABLE <old> <new>`, tell the user gaud has a newer version available and ask whether to run `"$_GAUD_DIR/bin/gaud-mode-upgrade"` automatically before planning or launching panes. Match gstack's pattern: detect first, ask before mutating the install.
- If output shows `BINARY_UPGRADE_AVAILABLE gaud-poll <old> <new>`, tell the user the gaud poller package has a newer upstream version and ask whether to run the gaud upgrade wrapper automatically so the local package sources can move forward before `gaud-poll-install` reconciles the compiled artifact.
- Prefer `npx -y skills add builtby-win/skills --skill gaud-mode --yes` or `npx -y playbooks add skill builtby-win/skills --skill gaud-mode -y`.
- `"$_GAUD_DIR/bin/gaud-mode-upgrade"` may be used as the wrapper when gaud should choose automatically.
- `gaud-mode-upgrade` should reconcile `gaud-poll` after the skill refresh without blindly forcing a rebuild. Let `gaud-poll-install` decide whether the binary is current, missing, stale, or corrupt.
- `gaud-poll-install --quiet-current` should run on every gaud invocation so the preferred poller path is rebuilt whenever the local artifact is missing, stale, or corrupt without spamming the user when it is already current.
- If output shows `JUST_UPGRADED <from> <to>`, tell the user `Running gaud-mode v{to} (just updated)` and continue.
- The search list must cover both installed skill locations and repo checkouts such as `$PWD/skills/gaud-mode`.

# Gaud Mode

Gaud is a tmux milestone runner.

Keep the model simple:
- one `orchestrator` agent owns the run
- one or more `implementer` agents own scoped tickets
- gaud always tells each implementer who the orchestrator is and which conductor pane to callback to
- work advances milestone by milestone, not as one long fire-and-forget run

## When To Use

Use gaud when:
- the work is large enough to benefit from parallel implementers
- one agent should stay in charge of planning, acceptance, and relaunching agents
- you want frequent check-backs instead of a long unsupervised run
- the user says `gaud`, `gaud-mode`, `god`, `godmode`, or `god-mode`

Do not use gaud for:
- tiny edits
- single-file fixes
- work that does not need tmux orchestration

## User Config

Gaud should load the last valid JSON object from:
- global config: `~/.config/gaud.config.jsonl`
- repo override: `.gaud.config.jsonl`

Merge repo override on top of global config.

Use a simple role map:

```json
{
  "orchestrator": {
    "cli": "opencode",
    "model": "gpt-5.4"
  },
  "implementers": [
    {
      "name": "ImplementerA",
      "cli": "codex",
      "model": "gpt-5.4-mini"
    },
    {
      "name": "ImplementerB",
      "cli": "claude"
    }
  ],
  "fallbacks": {
    "orchestrator": ["current-session", "claude", "opencode"],
    "implementers": ["codex", "claude", "opencode"]
  }
}
```

Minimum contract:
- `orchestrator`: which agent runs the conductor/orchestrator role
- `implementers`: which agents gaud may launch as implementers
- gaud must reflect the chosen orchestrator and implementers back to the user before launch

## Usage-Aware Agent Selection

Before launch, gaud must run the bundled usage preflight after config loading and before choosing panes:

```bash
"$_GAUD_DIR/bin/gaud-agent-usage" --repo "${GAUD_REPO_ROOT:-$PWD}"
```

Use `--json` when you need machine-readable ranking for a scriptable decision.

The helper:
- loads the last valid JSON object from `~/.config/gaud.config.jsonl` and `.gaud.config.jsonl`, with repo override on top of global config
- reads Back2Vibing-style usage snapshots from explicit `GAUD_USAGE_CACHE` / `B2V_USAGE_CACHE` paths, or otherwise from repo `usage-cache.json` and common Back2Vibing cache paths
- ignores stale Back2Vibing snapshots older than 30 minutes and reports them as stale instead of treating them as current
- understands the Back2Vibing shape: `UsageState.providers[].quotas[].percent_remaining`, `resets_at_ms`, `reset_text`, `error`, and `auth_type`
- evaluates configured fallback agents as candidate launch choices, not just the preferred role map
- classifies each configured agent as `ready`, `quota-blocked`, `rate-limited`, `auth-blocked`, `unavailable`, or `unknown`
- ranks ready agents that reset soon and still have enough quota as good candidates so gaud can spend expiring quota intentionally, while conserving agents below 20%

Decision rules:
- Present the usage summary and suggested order before launching panes.
- Ask the user which agents to use for this run when the usage data changes the obvious choice, when a preferred agent is depleted, or when multiple ready agents are close.
- Default to the suggested ready agents if the user already gave a clear role map and no configured agent is blocked.
- Do not stall on any classification. Treat `auth-blocked` (CLI exists but missing credentials/OAuth) as `unknown` — the agent may still work for tasks that don't need that specific auth path. Treat `unavailable` (no CLI on PATH) as a hard block only when the CLI binary is not found at all.
- When usage can't be checked (stale cache, no cache, probe error, missing OAuth), treat affected agents as `unknown` and proceed with the user's role map. Report what was found and flag uncertain agents, but do not block launch.
- Keep `unknown` agents available but lower-confidence, and pair them with a ready fallback when possible.
- Prefer agents with enough remaining quota and a near reset when the work fits; conserve agents below 20% unless they reset very soon or the user chooses them.

Back2Vibing has the richest known usage probes today for Claude, Codex, Gemini, and Antigravity. OpenCode currently has no Back2Vibing quota probe, so treat it as `unknown` unless another usage source is supplied.

## Setup And Launch

Before launch:
- verify `tmux` and `tmux-cli`
- load global/repo gaud config, then run `"$_GAUD_DIR/bin/gaud-agent-usage" --repo "${GAUD_REPO_ROOT:-$PWD}"`
- show the usage summary, including remaining percentage and reset timing, and ask the user for agent choices when the preflight makes the best map non-obvious
- verify the chosen orchestrator CLI and implementer CLIs exist
- reconcile `gaud-poll` with `"$_GAUD_DIR/bin/gaud-poll-install"` so the preferred poller path rebuilds only when the binary is missing, stale, corrupt, or explicitly forced
- run `"$_GAUD_DIR/bin/gaud-tmux-layout" init --orchestrator <id>` to tag the current orchestrator window as `gaud` and create the fallback `impl` window
- **launch `gaud-poll watch` beside the orchestrator** — use `"$_GAUD_DIR/bin/gaud-tmux-layout" add-pane --window gaud --role poll --command 'gaud-poll watch ...'` to split the current window. This MUST happen before any implementer is launched. Verify a `poll:*` pane exists in the orchestrator window before proceeding.
- record the conductor pane with `tmux display-message -p '#{pane_id}'`
- tell each implementer its role name, milestone, workstream, orchestrator agent, and conductor pane ID

Gaud runs from one markdown execution plan.

The plan must include:
- `PRD`
- `Program DONE Criteria`
- one current milestone with explicit `Milestone DONE Criteria`
- tickets for the current milestone only

Use `skills/gaud-mode/references/markdown-plan-template.md` as the source of truth.

## Callback Transport

Preferred path:
- run `gaud-poll watch ...` in a visible dashboard pane in the user's tmux session
- `gaud-poll --version` and the adjacent `gaud-poll.build.json` metadata should be usable for preflight visibility and rebuild checks
- gaud-poll watches implementer panes and forwards events to the conductor pane
- when using gaud's private tmux server, launch `gaud-poll` in the user's tmux session with `--tmux-socket gaud-<plan>` so callback forwarding still uses the user's conductor pane while implementer capture uses the private server
- **Orchestrator pane monitoring**: gaud-poll sends callbacks to the conductor pane using explicit `tmux send-keys` for both the message text AND a separate `Enter` keystroke. After sending, it captures the pane content and verifies it changed (indicating Enter was processed). If the content is unchanged after 300ms, it resends Enter up to 3 times with exponential backoff. This prevents the "text typed but never submitted" problem when Enter is swallowed or the pane was not in an accepting state.
- The orchestrator MUST run in the user's main tmux session (the one `gaud` was launched from), not in a private gaud-managed tmux server. gaud-poll runs in the same main session's dashboard pane. Since both the orchestrator pane and the gaud-poll pane are in the same tmux session, `tmux send-keys` can reach the orchestrator pane directly without needing a socket flag. If the orchestrator were in a different tmux server, callback forwarding would require crossing server boundaries.

Fallback path when `gaud-poll` is unavailable or broken:
- implementers send callbacks directly to the conductor pane with `tmux-cli send`
- gaud still polls panes periodically with `tmux-cli capture` so callback misses are recoverable

Required callback contract:
- `GAUDMODE done role=<role> milestone=<milestone> workstream=<workstream> summary=<summary>`
- `GAUDMODE waiting-user role=<role> milestone=<milestone> workstream=<workstream> summary=<summary>`
- `GAUDMODE waiting-permission role=<role> milestone=<milestone> workstream=<workstream> summary=<summary>`
- Reserve `GAUDMODE waiting-user ... summary=suspected-stuck: ...` for execution-health problems such as pane stalls, shell-drops, dead panes, or callback transport failures. Treat these as pane-health blockers, not normal product questions.
- Preserve worker callbacks in that exact envelope. `gaud-poll` health notifications should use `workstream=gaud-poll` so the orchestrator can distinguish worker status from poller-generated diagnostics.

Do not rely on placeholder examples as literal shell commands. Gaud must inject the real conductor pane ID into the prompt it sends to each implementer.

## Launch Rules

Keep launches boring and predictable.

- Use only the flags needed for the chosen CLI.
- For Codex implementers, prefer `codex --yolo -m <model> "<prompt>"`.
- Do not add extra Codex flags unless the user explicitly wants them.
- Do not send multiline prompts in a way that breaks shell quoting.
- If the launch transport cannot safely preserve embedded quotes, use a safer transport.

## Tmux Layout

Use the bundled helper so the user never loses track of the run:

```
"$_GAUD_DIR/bin/gaud-tmux-layout"
```

`$_GAUD_DIR` is the same skill root resolved by the update-check block at the top of this file. The helper is plain bash, ships with the skill, and has no install step beyond the skill download.

Layout contract:
- The conductor stays in whatever window the user already has open. Gaud never renames or moves that window.
- For tmux-first runs, gaud splits the conductor window and runs `gaud-poll watch` in the neighboring pane so the user sees orchestrator + dashboard together.
- The dashboard shows per-agent status (`starting`, `working`, `done`, `waiting`, `stuck`, `dead`), elapsed time, last update time, wrapped details, and a short event timeline.
- Implementers should run in gaud's private tmux server whenever possible: `tmux -L gaud-<plan> new-session -d -s <plan>`.
- `gaud-poll` stays in the user's tmux session and polls implementers with `--tmux-socket gaud-<plan>`, then forwards callbacks to the conductor pane with direct current-session `tmux send-keys` plus Enter verification.
- If private tmux is unavailable, gaud may fall back to the same-session `impl` window for 1-2 implementer panes, tiled; grow past 2 only when the plan clearly needs it.
- The conductor window is tagged with `@gaud-orchestrator=<id>` and `@gaud-window=gaud`; fallback implementer windows are tagged with `@gaud-window=impl`. Cleanup reads those tags, never window names.
- Pane identity lives in the pane title: `<role>:<workstream>:<milestone>` (for example `impl:frontend:M1`, `poll:dark-mode:*`, `ux:dark-mode:M1`).
- While gaud is running, the helper flips `renumber-windows on` for the session so retiring panes does not leave index gaps. The previous value is saved and restored on `end`.

Mandatory call sequence (every bullet must execute, in order):

```bash
# 1. Tag the current orchestrator window as gaud and create fallback impl window
"$_GAUD_DIR/bin/gaud-tmux-layout" init --orchestrator <id>

# 2. Record the conductor pane ID BEFORE anything else uses it
CONDUCTOR_PANE=$(tmux display-message -p '#{pane_id}')

# 3. Start gaud-poll as a split next to the orchestrator pane
"$_GAUD_DIR/bin/gaud-tmux-layout" add-pane --orchestrator <id> --window gaud \
  --role poll --workstream <id> --milestone '*' \
  --command 'gaud-poll watch --title <plan> --tmux-socket gaud-<plan> -c <conductor> -p <pane>:<role>:<cmd>'

# 4. Verify the poller pane exists in the orchestrator window before launching implementers
GAUD_WIN=$("$_GAUD_DIR/bin/gaud-tmux-layout" list --orchestrator <id> | awk '/\[gaud\]/ {print $1}')
tmux list-panes -t "$GAUD_WIN" -F '#{pane_title}' | grep -q '^poll:' \
  || { echo "ERROR: no poll:* pane in orchestrator window. Run add-pane --window gaud --role poll first."; exit 1; }

# 5. Private implementer server named after the plan
tmux -L gaud-<plan> new-session -d -s <plan>

# 6. Launch implementers in gaud's private tmux server
tmux -L gaud-<plan> new-window -t <plan> -n impl-frontend \
  'B2V_DISABLED=true codex --yolo -m <model> "<kickoff prompt>"'

# After a milestone is accepted
"$_GAUD_DIR/bin/gaud-tmux-layout" retire --orchestrator <id> --milestone M1 --role impl

# At the end of the program
"$_GAUD_DIR/bin/gaud-tmux-layout" end --orchestrator <id>
```

The helper refuses to touch a window that is not tagged with the current orchestrator id and will not kill the conductor window even by accident.

Non-tmux conductor support is intentionally a later backend. Keep the poller/conductor transport abstract enough that direct `tmux send-keys` can be replaced by a stdin pipe or FIFO without changing the implementer polling loop.

## Milestone Loop

Canonical loop:
1. orchestrator confirms outcome and current milestone
2. orchestrator launches implementers for current tickets only
3. implementers check back often
4. orchestrator accepts, reworks, or relaunches for the next ticket batch

When the orchestrator sees `summary=suspected-stuck: ...`, it should inspect the pane, verify liveness, and decide whether to retry, relaunch, or escalate. Do not treat suspected-stuck notifications as ordinary product ambiguity.

When gaud-poll sees a worker `GAUDMODE done ...` callback, it forwards the callback to the conductor, kills that completed pane, and unwatches it. This prevents completed panes that later drop to a shell from producing stale `suspected-stuck` loops.

Keep only one active milestone at a time.

After an accepted milestone:
- retire the implementer panes used for that milestone. In private-tmux mode, target the private server directly, for example `tmux -L gaud-<plan> kill-window -t <plan>:impl-<workstream>` or kill the specific private pane/window launched for that milestone. In same-session fallback mode, use `"$_GAUD_DIR/bin/gaud-tmux-layout" retire --orchestrator <id> --milestone <m> --role impl`.
- relaunch fresh implementers for the next milestone
- at the end of the program, stop the private tmux server with `tmux -L gaud-<plan> kill-session -t <plan>` and run `"$_GAUD_DIR/bin/gaud-tmux-layout" end --orchestrator <id>` to close fallback `impl` windows without touching the conductor window. The poller split is retired separately when gaud ends.

## Guardrails

- never skip the update check
- never let implementers guess who the orchestrator is
- never launch implementers without the real conductor pane ID
- never skip the usage-aware agent preflight before launching panes; but do not let preflight failures or uncertain status block launch — report findings, flag uncertain agents, and proceed
- prefer the healthiest available configured agent per role; when all configured agents are uncertain (unknown/auth-blocked/unchecked), launch with the user's chosen role map and handle runtime failures by retrying with a fallback agent
- never launch implementers without a live `gaud-poll watch` split beside the orchestrator in the conductor window; at least one pane in the `gaud` window must have a `pane_title` matching `poll:*` (set by `--role poll` in `add-pane`) — verify before starting any implementer launch sequence. A bare shell prompt in the dashboard pane means the poller was never started.
- never treat a shell-dropped pane as healthy
- never trust callback examples copied from prompt text as real callbacks
- never start the next milestone before the current one is accepted or explicitly reworked
- never kill or rename a tmux window that is not tagged `@gaud-orchestrator=<current id>`; the conductor window has no such tag and must stay untouched

## Runtime Agent Failure Recovery

Agents can run out of credits mid-milestone. When a callback or health check indicates an agent is exhausted (quota depleted, rate-limited, or auth-expired):

1. **Detect**: `gaud-poll` or pane health checks surface `GAUDMODE waiting-user ... summary=suspected-stuck:quota` or the implementer pane goes silent with exit/error.
2. **Fallback**: Look up the configured `fallbacks` for the failed role. Pick the next ready/unknown agent from the fallback list.
3. **Relaunch**: Kill the failed implementer pane. Relaunch with the fallback agent using the same milestone context, workstream, and conductor pane ID.
4. **Notify**: Tag the callback with `workstream=<original>-retry:<fallback>` so the orchestrator can track which agent is now handling the work.
5. **Continue**: The fallback picks up from the milestone brief — no need to restart the milestone unless the failed agent left the workspace in a broken state.

When no fallback agent is configured for the role, or all fallbacks are exhausted too, report back to the user with what worked, what failed, and ask how to proceed.

## References

- `skills/gaud-mode/references/markdown-plan-template.md`
- `skills/gaud-mode/references/kickoff-prompts.md`
- `skills/gaud-mode/references/milestone-loop.md`
- `skills/gaud-mode/references/personas.md`
