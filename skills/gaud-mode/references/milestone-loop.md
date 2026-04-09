# Milestone Loop

Gaud runs a milestone loop, not a long one-shot orchestration round.

## Canonical Loop

1. `CEO/PM` clarifies the outcome, explicit `program DONE criteria`, and the
   current milestone's `milestone DONE criteria`.
2. `TPM` updates one markdown plan and breaks one current milestone into small
   tickets.
3. specialists execute the current milestone only.
4. `Dogfooder` tests the output if the milestone is user-testable.
5. `CEO/PM` decides accept, rework, or next milestone.

Do not skip the `CEO/PM -> TPM -> agents -> dogfooders -> CEO/PM` loop.

## Milestone States

- `planned`: milestone exists in the markdown plan but is not active yet
- `ready`: program DONE criteria, milestone DONE criteria, and tickets are clear
  enough to start
- `in-progress`: specialists are working current tickets
- `ready-for-dogfood`: implementation is complete and a human can exercise it
- `accepted`: milestone passed review and can be closed
- `rework`: milestone needs another small ticket cycle before acceptance
- `blocked`: milestone cannot progress without an external decision or fix

Only one milestone should be active at a time.

## DONE Criteria First

- `Program DONE criteria` define the top-level success condition for the whole
  gaud program.
- `Milestone DONE criteria` define the completion gate for the current
  milestone.
- Make both explicit before ticketing begins.
- If either set is vague, the TPM must stop and fix the plan.
- Ticketing for the current milestone is gated by its `milestone DONE criteria`.
- Tickets should trace back to milestone DONE criteria, not ad hoc agent ideas.

## Small Ticket Rule

- Keep tickets narrow, testable, and easy to steer.
- Prefer ticket scopes that can check back quickly.
- If a ticket becomes broad, split it before launching specialists.

## Frequent Check-Back Rule

Check back at these moments:
- when a ticket completes
- when a ticket is blocked on a user or PM choice
- when the milestone is implementation-complete
- when handing off to dogfooding
- when the `CEO/PM` must decide accept, rework, or next milestone

Gaud should check back often. Do not disappear into a long run.

## Fresh-Agent Rule

- Keep only the `CEO/PM` conductor stable across milestones. The conductor
  window is never touched by gaud.
- After an accepted milestone, retire the implementer panes for that milestone
  with:
  `"$_GAUD_DIR/bin/gaud-tmux-layout" retire --orchestrator <id> --milestone <m> --role impl`
- Relaunch fresh implementers for the next milestone via `add-pane` into the
  existing `impl` window. Do not preserve stale implementer context across
  milestones just because the pane is still open.
- Long-lived observer panes in the `gaud` window (`gaud-poll`, and any UX,
  Integrator, TPM, or Investigator splits you created) survive across
  milestones. Retire them only if they were milestone-scoped to begin with.

Fresh specialists reduce drift and keep each milestone grounded in the current
plan.

## Dogfooding Rule

- Require dogfooding only for user-testable milestones.
- Internal-only milestones can stay inside the specialist loop until they create
  something a human can exercise.
- Do not launch the next milestone before the user-testable milestone is either
  accepted or sent back for rework.

## tmux Operating Notes

### Layout contract

Gaud runs with a fixed two-window layout driven by
`"$_GAUD_DIR/bin/gaud-tmux-layout"`:

- The conductor stays in whatever window the user is already in. Never rename
  or kill it.
- Gaud adds exactly two windows to the right of the conductor on `init`:
  - `gaud` — `gaud-poll` plus any observer panes (UX/UI, Integrator, TPM,
    Investigator) as splits
  - `impl` — 1-2 implementer panes, tiled
- Pane identity lives in the pane title: `<role>:<workstream>:<milestone>`
  (e.g. `impl:frontend:M1`, `poll:dark-mode:*`). This replaces the old
  pane registry — `tmux list-panes -F '#{pane_id} #{pane_title}'` is the
  source of truth.
- Ownership lives in window user options: `@gaud-orchestrator=<id>` and
  `@gaud-window={gaud|impl}`. Cleanup reads tags, never window names.

### Liveness and relaunch

- Before `tmux-cli send` to any specialist, verify the target pane is still
  alive and still hosts the expected specialist in a usable state.
- Treat a pane as stale/dead if tmux reports it closed, the agent was canceled,
  the specialist exited, or the pane no longer hosts the expected role.
- If a pane fails the liveness check, retire it and `add-pane` a fresh one with
  the current milestone/workstream context, then resend the current task.
  Re-running `add-pane` into an existing window splits a new pane and retiles.
- Do not silently send to a closed or stale pane.
- If relaunch fails repeatedly or provider health blocks the role, raise it as
  a conductor-level blocker instead of retrying forever.

### Callbacks and health signals

- Prefer `gaud-poll` plus `wait_idle` and `capture` to monitor progress.
  `gaud-poll` should live in the `gaud` window as its first pane.
- If `gaud-poll` is unavailable or unhealthy, fall back to direct callbacks
  from implementers to the conductor pane with `tmux-cli send`, and keep
  periodic pane polling enabled so missed callbacks are still recoverable.
- When `gaud-poll` reports
  `GAUDMODE waiting-user ... workstream=gaud-poll summary=suspected-stuck: ...`,
  treat that as a pane-health/debug signal. Inspect the pane, verify liveness,
  and decide whether to resend, relaunch, or escalate.
- When a worker reports `GAUDMODE waiting-user ... summary=suspected-stuck: ...`,
  assume the worker is signaling execution-health trouble rather than ordinary
  product ambiguity.

### Cleanup

- After an accepted milestone:
  `"$_GAUD_DIR/bin/gaud-tmux-layout" retire --orchestrator <id> --milestone <m> --role impl`
- After a canceled run or full program completion:
  `"$_GAUD_DIR/bin/gaud-tmux-layout" end --orchestrator <id>`
- The helper refuses to touch any window that is not tagged
  `@gaud-orchestrator=<current id>`, and it never kills the conductor window.
- If `gaud-tmux-layout` itself is missing from the installed skill, re-run the
  gaud update check (`"$_GAUD_DIR/bin/gaud-mode-update-check"`) and refresh
  before continuing cleanup.
