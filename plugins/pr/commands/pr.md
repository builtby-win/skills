---
description: Create a Pull Request for the current issue branch
---

# PR

Create a pull request from the current feature branch to main.

## What it does

1. Runs pre-flight checks (typecheck and lint)
2. Optionally captures a screenshot of UI changes
3. Pushes commits to remote
4. Creates a PR that references the associated issue
5. Updates issue labels to `status:pr-ready`

## When to use

- After implementation is complete
- When you're ready for code review
- To link your work to a GitHub issue

## Usage

```bash
/pr
```

The command will:
- Run typecheck and lint before creating the PR
- Ask if you want to capture a screenshot (optional)
- Auto-detect the issue number from the branch name
- Generate a PR summary from commits and issue details
- Create the PR with "Closes #N" to auto-close the issue on merge
