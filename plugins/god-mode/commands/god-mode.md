---
description: Coordinate tmux-based implementation work after checking tmux-cli and installed specialist CLIs
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
5. Launches or reuses the chosen specialist panes
6. Runs parallel check-in rounds through a conductor workflow
7. Converges the work into one integrated direction

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
- keep the conductor responsible for synthesis and final direction
