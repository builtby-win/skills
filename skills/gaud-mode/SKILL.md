---
name: gaud-mode
description: Use when substantial implementation work should run through tmux with one orchestrator agent and one or more implementer agents, especially when the user says gaud, gaud-mode, god, godmode, or god-mode and wants milestone-based check-backs instead of one long unsupervised run.
---

## Update Check

Run this first on every gaud invocation:

```bash
_GAUD_DIR=""
for d in \
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
```

- If output shows `UPGRADE_AVAILABLE <old> <new>`, refresh gaud before planning or launching panes.
- Prefer `npx -y skills add builtby-win/skills --skill gaud-mode --yes` or `npx -y playbooks add skill builtby-win/skills --skill gaud-mode -y`.
- `"$_GAUD_DIR/bin/gaud-mode-upgrade"` may be used as the wrapper when gaud should choose automatically.
- If output shows `JUST_UPGRADED <from> <to>`, tell the user `Running gaud-mode v{to} (just updated)` and continue.

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

## Setup And Launch

Before launch:
- verify `tmux` and `tmux-cli`
- verify the chosen orchestrator CLI and implementer CLIs exist
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
- run `gaud-poll watch ...` in a background pane
- gaud-poll watches implementer panes and forwards events to the conductor pane

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

## Milestone Loop

Canonical loop:
1. orchestrator confirms outcome and current milestone
2. orchestrator launches implementers for current tickets only
3. implementers check back often
4. orchestrator accepts, reworks, or relaunches for the next ticket batch

When the orchestrator sees `summary=suspected-stuck: ...`, it should inspect the pane, verify liveness, and decide whether to retry, relaunch, or escalate. Do not treat suspected-stuck notifications as ordinary product ambiguity.

Keep only one active milestone at a time.

After an accepted milestone:
- retire the implementer panes used for that milestone
- relaunch fresh implementers for the next milestone

## Guardrails

- never skip the update check
- never let implementers guess who the orchestrator is
- never launch implementers without the real conductor pane ID
- never treat a shell-dropped pane as healthy
- never trust callback examples copied from prompt text as real callbacks
- never start the next milestone before the current one is accepted or explicitly reworked

## References

- `skills/gaud-mode/references/markdown-plan-template.md`
- `skills/gaud-mode/references/kickoff-prompts.md`
- `skills/gaud-mode/references/milestone-loop.md`
- `skills/gaud-mode/references/personas.md`
