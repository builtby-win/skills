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

## What it does

1. Makes the first planning pass in the current pane
2. Detects installed tmux tooling and specialist CLIs
3. Splits the work into small independent streams
4. Launches or reuses planner, designer, and implementer panes
5. Runs parallel check-in rounds through a conductor workflow
6. Converges the work into one integrated direction

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
- orchestrate tmux-based delegation for larger tasks
- keep the conductor responsible for synthesis and final direction
