---
name: setup-worktree
description: "[DEPRECATED] Worktree CLI is now available via npm - no setup needed"
---

# Setup Worktree (Deprecated)

> **This skill is deprecated.** The worktree CLI is now available as an npm package.
> No project-specific setup is required anymore!

## Use the npm CLI Instead

```bash
# Use directly with npx (no install needed)
npx @anthropic/worktree create 15 dark-mode --start-server
npx @anthropic/worktree list
npx @anthropic/worktree delete 15

# Or install globally for faster access
npm install -g @anthropic/worktree
worktree create 15 dark-mode --start-server
```

## Migration

If you previously ran `/setup-worktree` in a project, you can optionally clean up:

```bash
# Remove local script (optional)
rm scripts/manage-worktree.ts

# The npx CLI is fully compatible with existing .worktree-metadata.json files
```

## Why the Change?

The old approach required:
1. Running `/setup-worktree` in each project
2. Installing `tsx` as a dev dependency
3. Copying a script file to `scripts/`
4. Adding a package.json script entry

The new approach:
1. Just works with `npx @anthropic/worktree`
2. No project-specific setup
3. Works across all your projects
4. Stays up-to-date automatically

## Features (Unchanged)

- **Isolated Development**: Create separate worktrees for each issue/feature
- **Database Snapshots**: Automatically snapshot SQLite databases
- **Port Management**: Auto-assign ports to avoid conflicts
- **Dev Server Control**: Optionally start dev servers automatically
- **Package Manager Agnostic**: Works with npm, yarn, or pnpm

## See Also

- [Worktree Plugin README](../../README.md)
- npm package: `@anthropic/worktree`
