---
description: Publish a plan as a GitHub Issue and create a branch to start implementation
---

# Ship

Publish your implementation plan as a GitHub Issue and create a feature branch to begin work.

## What it does

1. Creates a GitHub Issue with your plan details
2. Gets the issue number
3. Creates a feature branch following the naming pattern
4. Switches to the branch
5. Marks the issue as `status:in-progress`

## When to use

- After plan mode is complete and user approves the plan
- When you're ready to start implementing a feature
- To convert a discussion into a tracked issue with a branch

## Usage

```bash
/ship
```

The command will:
- Find the current plan file (if in plan mode)
- Create a GitHub Issue with the plan content
- Create a branch named `{PROJECT_PREFIX}/issue-{N}-{slug}`
- Set up the workspace for implementation
- Mark the issue as in-progress
