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

- Keep only the `CEO/PM` conductor stable across milestones.
- After an accepted milestone, retire the specialist panes used for that
  milestone.
- Relaunch fresh specialists with fresh context for the next milestone.
- Do not preserve stale specialist context across milestones just because the
  pane is already open.

Fresh specialists reduce drift and keep each milestone grounded in the current
plan.

## Dogfooding Rule

- Require dogfooding only for user-testable milestones.
- Internal-only milestones can stay inside the specialist loop until they create
  something a human can exercise.
- Do not launch the next milestone before the user-testable milestone is either
  accepted or sent back for rework.

## tmux Operating Notes

- Keep a registry of which panes and windows gaud created.
- Remove registry entries immediately when gaud retires or closes those panes.
- Before `tmux-cli send` to any specialist, verify the target pane is still alive
  and still hosts the expected specialist in a usable state.
- Treat a pane as stale/dead if tmux reports it closed, the agent was canceled,
  the specialist exited, or the pane no longer hosts the expected role.
- If a pane fails that liveness check, relaunch the role with the current
  milestone/workstream context, update the registry, then resend the current
  task.
- Do not silently send to a closed or stale pane.
- If relaunch fails repeatedly or provider health blocks the role, raise it as a
  conductor-level blocker instead of retrying forever.
- Use callbacks plus `wait_idle` and `capture` to monitor progress.
- Clean up gaud-created specialist panes after acceptance, cancellation, or full
  completion, and unregister those panes as part of the same cleanup step.
