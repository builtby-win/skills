# Worktree Plugin

Git worktree management with SQLite database snapshots and port isolation for parallel development.

## Features

- **Isolated Development**: Create separate worktrees for each issue/feature
- **Database Snapshots**: Automatically snapshot SQLite databases for each worktree
- **Port Management**: Auto-assign ports to avoid conflicts between worktrees
- **Dev Server Control**: Optionally start dev servers automatically
- **Generic SQLite Support**: Works with Cloudflare D1, local .db files, and any SQLite database
- **Package Manager Agnostic**: Works with npm, yarn, or pnpm

## Quick Start

### 1. Install in Your Project

Run the setup skill (Claude does this automatically when needed):

```bash
# Claude will run this when you first use worktrees
# Or invoke manually with: /setup-worktree
```

This installs `scripts/manage-worktree.ts` and adds the `worktree` command.

### 2. Use Worktrees

```bash
# Works with any package manager
npm run worktree create 15 dark-mode --start-server
yarn worktree create 15 dark-mode --start-server
pnpm worktree create 15 dark-mode --start-server

# List active worktrees
pnpm worktree list

# Delete worktree when done
pnpm worktree delete 15
```

## Integration with Claude Skills

This plugin integrates seamlessly with your workflow:

- **`/ship`** - Automatically creates worktrees when starting new issues (if project has worktree script)
- **`/done`** - Automatically cleans up worktrees when issues are completed

## What Gets Installed

When you run the setup skill, it:

1. Copies `scripts/manage-worktree.ts` to your project
2. Adds `"worktree": "tsx scripts/manage-worktree.ts"` to package.json
3. Installs `tsx` if not already present (detects npm/yarn/pnpm automatically)
4. Updates `.gitignore` with `.worktrees/` and `.worktree-metadata.json`
5. Detects SQLite databases in your project
6. Optionally adds configuration to `CLAUDE.md`

## Database Detection

The script automatically finds SQLite databases in:

- **Cloudflare D1**: `.wrangler/state/v3/d1/*/`
- **Root directory**: `*.db`, `*.sqlite`, `*.sqlite3`
- **Custom paths**: Set `WORKTREE_DB_PATH` environment variable

## Commands

```bash
# Create worktree
{npm|yarn|pnpm} worktree create <issue-number> <slug> [--start-server] [--branch-prefix=prefix]

# List worktrees
{npm|yarn|pnpm} worktree list

# Show worktree info
{npm|yarn|pnpm} worktree info <issue-number>

# Delete worktree
{npm|yarn|pnpm} worktree delete <issue-number> [--force]
```

## Configuration

Optional environment variables (set in `CLAUDE.md` or `.env`):

- `PROJECT_PREFIX` - Branch prefix (default: directory name)
- `WORKTREE_BASE_PORT` - Starting port for dev servers (default: 4322)
- `WORKTREE_MAIN_PORT` - Main worktree port (default: 4321)
- `WORKTREE_DEV_COMMAND` - npm script to start dev (default: "dev")
- `WORKTREE_DB_PATH` - Custom SQLite database path

## When to Use Worktrees

**Use worktrees for:**
- Database/schema changes requiring isolated state
- Backend API changes needing separate dev server
- Parallel work on multiple features
- Testing migrations before merging

**Use regular branches for:**
- UI-only changes (styling, components)
- Documentation updates
- Simple fixes with no database interaction

## Example Workflow

```bash
# Claude creates issue #20 for email notifications feature
$ pnpm worktree create 20 email-notifications --start-server

Creating worktree for issue #20...
  ✓ Git worktree created
  ✓ node_modules symlinked
  ✓ Database snapshot: .wrangler/state/v3/d1/... (1 file)
  ✓ Dev server started (PID 12345) on http://localhost:4322

✅ Worktree created successfully!
  Issue: #20
  Branch: myproject/issue-20-email-notifications
  Port: 4322
  Dev server: http://localhost:4322

# Work in the worktree
$ cd .worktrees/issue-20-email-notifications
$ git commit -am "Add email notification service"

# When done, clean up
$ cd ../..
$ pnpm worktree delete 20
```

## Metadata

Worktree state is tracked in `.worktree-metadata.json`:

```json
{
  "worktrees": {
    "issue-20-email-notifications": {
      "issueNumber": 20,
      "branch": "myproject/issue-20-email-notifications",
      "port": 4322,
      "path": ".worktrees/issue-20-email-notifications",
      "createdAt": "2026-01-04T18:30:00.000Z",
      "dbSnapshots": [".wrangler/state/v3/d1/miniflare-D1DatabaseObject"],
      "devServerPid": 12345
    }
  },
  "nextPort": 4323
}
```

This file is git-ignored and tracks local worktree state.

## Package Manager Detection

The script auto-detects your package manager:

- **pnpm**: If `pnpm-lock.yaml` exists
- **yarn**: If `yarn.lock` exists
- **npm**: Default fallback

Dev servers are started with the detected package manager.

## Troubleshooting

**No databases detected?**
- Worktrees still work, just won't snapshot any databases
- Set `WORKTREE_DB_PATH` if database is in non-standard location

**Port already in use?**
- Script auto-detects and skips to next available port
- Check with: `{npm|yarn|pnpm} worktree list`

**tsx not found?**
- Setup skill installs it automatically
- Or install manually with your package manager:
  - `pnpm add -D tsx`
  - `npm install -D tsx`
  - `yarn add -D tsx`
