---
description: Add tasks to beads repositories with smart project inference
---

# Todo

Quickly add tasks to beads repositories with automatic project detection.

## What it does

1. Infers the target beads repository from context
2. Creates a new task with a unique ID
3. Appends to the project's `.beads/issues.jsonl`
4. Optionally syncs with `bd` if available

## When to use

- When you want to quickly capture a task
- When working in any project with beads
- From anywhere to add to a specific project

## Usage

```bash
/todo Fix the login redirect bug
/todo -p 1 Critical security patch
/todo --project homebase Add dark mode toggle
/todo --tag frontend --tag urgent Fix mobile layout
```

## Options

- `-p, --priority <1-3>` - Set priority (1=high, 2=medium, 3=low). Default: 2
- `--project <name>` - Explicitly specify target project
- `--tag <tag>` - Add tags (can use multiple times)

## Project Detection

The command automatically finds the right beads repository:

1. **Explicit project** - If `--project <name>` is given, uses that
2. **Current directory** - If cwd has `.beads/`, uses it
3. **Git root** - If cwd is in a git repo with `.beads/`, uses git root
4. **Prompt** - If ambiguous, shows list of available projects

## Output

```
Task created!

ID: homebase-7xy
Title: Add dark mode toggle
Priority: 2 (medium)
Project: homebase (~/homebase)
```
