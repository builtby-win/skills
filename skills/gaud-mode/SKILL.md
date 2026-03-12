---
name: gaud-mode
description: Use when substantial implementation work should be run through tmux as a supervised milestone program, especially when the user asks for gaud-mode, gaud, god-mode, godmode, or god and needs gaud-native personas, milestone gates, init preferences, fallback routing, check-backs, dogfooding, and cleanup.
---

# Gaud Mode

## Overview

`gaud-mode` is the canonical name for this skill.

Treat these as user-facing aliases that trigger the same skill:
- `gaud`
- `god-mode`
- `godmode`
- `god`

Gaud is a milestone runner, not a one-shot orchestrator.

Use it to run substantial implementation work through tmux with one stable
conductor, explicit gaud-native personas, one markdown execution plan, frequent
check-backs, and milestone acceptance gates before the next milestone starts.

Keep gaud as a supervised program runner:
- current session stays the `CEO/PM` conductor unless the user overrides it
- ticketing waits until the markdown plan has explicit `program DONE criteria`
  and current `milestone DONE criteria`
- specialists work only on the current milestone in small tasks
- user-testable milestones stop for dogfooding before the next milestone starts
- after an accepted milestone, relaunch fresh specialists with fresh context
- preserve tmux registry, callback handling, fallback routing, and cleanup rules

## When To Use

Use this skill when implementation is large enough that milestone-based parallel
specialist work will improve speed or quality.

Strong signals:
- new feature or major behavior change
- product logic, UX, and integration all matter
- the work benefits from milestone gates and frequent human steering
- multiple specialists can help, but should check back often
- the user asks for `gaud-mode`, `gaud`, `god-mode`, `godmode`, or `god`

Do not use this skill for:
- tiny fixes or isolated one-file edits
- work that does not need tmux orchestration
- long unsupervised one-shot runs

## Aliases And Init

If the user says any of these, treat them as the same intent:
- `Use gaud-mode`
- `Use gaud`
- `Use god-mode`
- `Use godmode`
- `Use god`

If the user says `gaud-mode init`, `gaud init`, `god-mode init`, `godmode init`,
or `god init`, switch into setup mode before launching specialists.

## Role Map

Use gaud-native roles, not generic agent labels:
- `CEO/PM`: conductor, product decisions, milestone acceptance, next-step calls
- `TPM`: turns one accepted direction into one current milestone and small tickets
- `Investigator`: repo discovery, constraints, acceptance details, edge cases
- `UX/UI`: layout, flow, copy, interaction critique, visual quality
- `Implementer`: scoped code or content changes for the current ticket
- `Integrator`: merges outputs, validates slices, handles overflow implementation, and owns review/code-review for the current milestone
- `Dogfooder`: real human tester for user-testable milestone output

Gaud does not launch a separate reviewer persona in the default model. Review and
code-review are folded into `Integrator` so the milestone loop stays gaud-native
and avoids an extra handoff role.

Default provider bias unless the user overrides it:
- `CEO/PM` -> current session
- `TPM` -> `Claude`
- `Investigator` -> `Claude`
- `UX/UI` -> `Gemini`
- `Implementer` -> `Codex`
- `Integrator` -> `OpenCode`
- `Dogfooder` -> real humans

See `skills/gaud-mode/references/personas.md` for missions, ownership, stop
conditions, callback behavior, and provider bias.

## Setup Summary

Before first use in a new environment, do a short setup pass.

Minimum requirements:
- `tmux`
- `tmux-cli`
- the current conductor CLI
- at least one specialist CLI you can launch in another pane

Recommended specialist CLIs:
- `claude`
- `opencode`
- `codex`
- `gemini`

Check availability explicitly:

```bash
command -v tmux tmux-cli claude opencode codex gemini
```

Persist preferences in JSONL:
- global defaults: `~/.config/gaud.config.jsonl`
- repo overrides: `.gaud.config.jsonl`

Load the last valid JSON object from each file, then merge repo override on top
of global defaults.

Concrete init behavior:
- if either JSONL file exists, read it first and reflect the merged role map,
  provider fallbacks, and config source back to the user before launch
- if the user chooses init, persist the chosen map as a new JSON object in
  `~/.config/gaud.config.jsonl`
- if the user also wants repo-specific behavior, persist repo overrides as a new
  JSON object in `.gaud.config.jsonl`
- if the user chooses `defaults for this run`, do not write either JSONL file;
  use the recommended map plus current fallbacks only for the active run

Choose the role map in this order:
- explicit user override
- repo override
- global default
- recommended map plus fallbacks

If `~/.config/gaud.config.jsonl` is missing on first run, show a short setup
summary with detected tools, missing tools, config status, the recommended role
map, and one focused follow-up:
- `Initialize gaud now, or use defaults for this run?`

When showing the setup result, reflect the actual chosen role map after
fallbacks, not just the preferred map.

If a preferred CLI is missing, report the fallback explicitly. Do not silently
swap providers.

Fallback routing tendencies:
- `CEO/PM` conductor: current session, then `Claude`, then `OpenCode`
- `TPM` or `Investigator`: `Claude`, then `OpenCode`, then `Codex`
- `Implementer`: `Codex`, then `OpenCode`, then `Claude`
- `Integrator`: `OpenCode`, then `Codex`, then `Claude`
- `UX/UI`: `Gemini`, then `Claude`, then `OpenCode`

Keep provider-health preflight light. Classify each planned provider as
`ready`, `quota-blocked`, `rate-limited`, `auth-blocked`, or `unknown`, then
reroute before launch when needed.

## Required Markdown Plan

Gaud runs from one markdown execution plan. Do not start ticketing from ad hoc
pane prompts alone.

The plan must contain, at minimum:
- a `PRD`
- explicit `program DONE criteria` before ticketing begins
- milestone list and current milestone status
- explicit `milestone DONE criteria` for the current milestone before ticketing
- small tickets for the current milestone only
- dogfooding gates for user-testable milestones
- PM decisions and acceptance notes

Terminology:
- `program DONE criteria`: top-level outcome for the whole gaud run
- `milestone DONE criteria`: completion gate for one current milestone

Ticketing for the current milestone is gated by that milestone's explicit
`milestone DONE criteria`. Program-level DONE still frames scope and final
acceptance, but it does not replace milestone-level ticketing gates.

Use `skills/gaud-mode/references/markdown-plan-template.md` as the source of
truth for the plan structure.

## Milestone Loop

Canonical loop:
1. `CEO/PM` clarifies outcome, `program DONE criteria`, and the current
   milestone's `milestone DONE criteria`
2. `TPM` breaks one milestone into small tickets
3. specialists execute the current milestone only
4. `Dogfooder` tests if the milestone is user-testable
5. `CEO/PM` accepts, requests rework, or starts the next milestone

Core rules:
- keep check-backs frequent and milestone-oriented
- check back at ticket completion, milestone readiness, dogfooding handoff, and
  milestone decision time
- require dogfooding only for user-testable milestones
- do not one-shot multiple milestones in a single run
- after an accepted milestone, retire specialist panes and relaunch fresh
  specialists with fresh context for the next milestone

See `skills/gaud-mode/references/milestone-loop.md` and
`skills/gaud-mode/references/dogfooding.md`.

## Launch And Callback Essentials

Treat tmux windows as capacity buckets and keep at most three total panes in one
window. Track pane and window ownership so gaud only cleans up resources it
created.

Use direct launch prefixes, not the old `env` wrapper form:

```bash
B2V_DISABLED=true claude --dangerously-skip-permissions "<kickoff prompt>"
B2V_DISABLED=true codex --yolo "<kickoff prompt>"
B2V_DISABLED=true gemini --yolo -i "<kickoff prompt>"
B2V_DISABLED=true opencode --prompt "<kickoff prompt>"
```

Use `tmux-cli send` for prompts, `tmux-cli wait_idle` before reading a pane, and
`tmux-cli capture` to inspect the result.

Before every `tmux-cli send` to a specialist, run a before-send liveness check.
Do not assume a recorded pane is still usable just because it existed earlier in
the milestone.

Treat a specialist target as stale or dead when any of these is true:
- the pane no longer exists or tmux reports it closed
- the pane exists but the specialist process was canceled, exited, or dropped to
  a plain shell that is no longer hosting the expected CLI
- the pane is alive but clearly cannot accept input for the intended specialist
  role anymore

Before-send liveness gate:
1. verify the recorded pane still exists and is reachable
2. verify the expected specialist CLI is still the thing running there and is in
   a usable state for the intended input
3. only then send the next task with `tmux-cli send`

If the liveness gate fails, do not silently send to that pane. Relaunch the role
with the current milestone and workstream context, update the registry with the
new pane, then resend the current task.

Keep relaunch behavior bounded:
- retry by relaunching only when the failure is specifically a dead, canceled,
  closed, or stale specialist pane
- if relaunch fails repeatedly, or provider health now blocks that role, surface
  it as a conductor-level issue to the user instead of looping forever
- preserve the existing callback transport contract after relaunch by keeping the
  same `GAUDMODE ... --pane=<conductor-pane>` callback target and payload shape

At launch time, gaud records the conductor pane ID for the current run. Treat
that pane as the callback target for all specialist check-backs.

Prefer explicit callbacks with `GAUDMODE` and accept legacy `GODMODE` during
migration:
- `GAUDMODE waiting-permission role=[role] milestone=[current milestone] workstream=[name] summary=[reason]`
- `GAUDMODE waiting-user role=[role] milestone=[current milestone] workstream=[name] summary=[question]`
- `GAUDMODE done role=[role] milestone=[current milestone] workstream=[name] summary=[result]`

Callback meaning:
- use `waiting-permission` for clearly safe execution approvals that gaud may
  inspect and auto-proceed once
- use `waiting-user` for risky or ambiguous approvals, product ambiguity, or
  user decisions that should not be auto-proceeded

Transport contract:
- gaud records the conductor pane ID before launching specialists
- specialists send callbacks back to the conductor pane with `tmux-cli send "GAUDMODE ..." --pane=<conductor-pane>`
- keep the milestone-aware payload shape above unchanged inside that send command
- continue recognizing legacy `GODMODE ...` callbacks during migration

Auto-proceed only once for clearly safe approvals. Escalate risky or ambiguous
approvals to the user.

## Guardrails

- do not drop alias handling, init flow, preference loading, fallback routing,
  provider-health preflight, callback protocol, cleanup rules, or tmux awareness
- do not let ticketing begin before `program DONE criteria` and current
  `milestone DONE criteria` are explicit
- do not preserve stale specialist context across accepted milestones
- do not force dogfooding on internal-only milestones that are not user-testable
- do not keep specialists running long after the current milestone is accepted
- do not one-shot large programs without milestone check-backs
- do not auto-approve deploys, billing changes, credential access, auth changes,
  destructive git or file actions, production data operations, or unrelated
  network scope

## Reference Map

- `skills/gaud-mode/references/personas.md`: role missions, ownership, stop
  conditions, callback behavior, provider bias, review ownership
- `skills/gaud-mode/references/milestone-loop.md`: canonical milestone runner
  loop, fresh specialists rule, milestone states, check-back cadence
- `skills/gaud-mode/references/markdown-plan-template.md`: required markdown plan
  template with PRD, program DONE criteria, milestone DONE criteria, milestones,
  tickets, dogfooding gates
- `skills/gaud-mode/references/kickoff-prompts.md`: short kickoff prompts for
  `CEO/PM`, `TPM`, `Investigator`, `UX/UI`, `Implementer`, and `Integrator`,
  plus shared callback footer language
- `skills/gaud-mode/references/dogfooding.md`: who dogfoods, when dogfooding is
  required, must-pass outcomes, feedback format, PM decision rules

## Quick Reference

| Situation | What to do |
| --- | --- |
| User says `gaud`, `god`, `godmode`, or `god-mode` | Use the canonical `gaud-mode` skill. |
| First run and no global config exists | Offer init or defaults for this run with one short setup question. |
| Role map is unclear | Show detected tools, merged defaults, and the actual role map once fallbacks apply. |
| Markdown plan lacks `program DONE criteria` or current `milestone DONE criteria` | Stop and fix the plan before ticketing. |
| About to send work to a specialist pane | Run the before-send liveness check first; relaunch and update the registry if the pane is stale, dead, closed, or canceled. |
| Current milestone is user-testable | stop for dogfooding before the next milestone |
| Current milestone is accepted | check back, retire the specialist panes for that milestone, and relaunch fresh specialists for the next milestone |
| Provider is blocked | Reroute explicitly before launch. |
| Work is complete | Clean up gaud-created panes and any empty gaud-created windows. |

Gaud is a milestone runner. Keep tasks small, check back often, use fresh
specialists after accepted milestones, do not one-shot the program, and keep
dogfooding in the loop when humans can exercise the result.
