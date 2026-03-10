---
description: Coordinate tmux-based implementation work after checking tmux-cli, installed specialist CLIs, and permission-gated specialist panes
---

# God Mode

Coordinate large implementation work through a conductor agent that delegates to
specialist CLI agents in tmux panes.

## Before first use

- install the separate `tmux-cli` utility or skill
- make sure `tmux` is installed
- check which specialist CLIs are available on `PATH`

```bash
command -v tmux tmux-cli claude opencode codex gemini
```

`god-mode` should report detected tools, call out what is missing, and only then
decide whether tmux orchestration makes sense.

When supported, it should prefer high-autonomy launch modes such as
`codex --yolo`, `claude --dangerously-skip-permissions`, and `gemini --yolo`.
When a CLI does not support that mode, `god-mode` should watch the pane for safe
execution approvals and unstick it deliberately instead of waiting forever.
General preferences such as "usually use yolo mode" do not override risky
approvals like deploys, destructive actions, secrets, or production data.
When a permission menu needs navigation, `tmux-cli send "Up"` and
`tmux-cli send "Down"` can be used to move the selection before pressing Enter.

Recommended default map:
- conductor and first planning pass: this session
- investigator: Claude
- implementer: Codex
- reviewer: Codex
- designer: Gemini

If the user already has preferences, `god-mode` should use them. Otherwise it
should show the recommended map, ask one focused override question, and continue
with fallbacks if a preferred CLI is missing.

Example fallback message:
- `Codex not found, so using OpenCode for implementation and code review.`
- `Gemini not found, so using Claude for UI design and critique.`

Easy way to ask for it:

```text
Use god-mode for this feature. Keep this session as conductor. Use Claude for
investigation, Codex for implementation and code review, and Gemini for UI.
```

Shorter version:

```text
Use god-mode. This session stays conductor. Claude investigates. Codex implements and
reviews. Gemini handles UI.
```

If the user does not specify preferences, show the recommended map first and ask
for a quick override.

## What it does

1. Makes the first planning pass in the current pane
2. Detects installed tmux tooling and specialist CLIs
3. Shows a short recommended role map with fallbacks
4. Splits the work into small independent streams
5. Launches or reuses the chosen specialist panes in the safest high-autonomy mode available
6. Watches for safe permission prompts and auto-proceeds when appropriate
7. Lets specialists notify the conductor through `tmux-cli` when they are blocked or done
8. Runs parallel check-in rounds through a conductor workflow
9. Converges the work into one integrated direction

## When to use

- When a task is large enough for parallel specialist execution
- When product logic and UX both matter
- When multiple workstreams can proceed independently
- When single-threaded execution would become the bottleneck

## Usage

```bash
/god-mode
```

The command will:
- stay single-threaded for tiny edits
- keep the invoking agent as conductor and owner of the first planning pass
- let the user override role assignments when they want a different mix
- orchestrate tmux-based delegation for larger tasks
- show fallback substitutions when preferred CLIs are missing
- prefer yolo or auto-proceed launch flags when the chosen CLI supports them
- supervise panes that stop on safe execution approvals and only escalate risky prompts
- give specialists a `tmux-cli send` callback path back to the original conductor when they are `waiting-permission`, `waiting-user`, or done
- keep the conductor responsible for synthesis and final direction
