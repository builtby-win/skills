# builtby.win Skills - Usage Guide

This repo now maintains:
- Playbooks-first standalone skills from this repo
- Optional Claude plugin compatibility wrappers for the same skills
- `@builtby.win/worktree` as a standalone npm package, not a repo-owned skill

Workflow skills like `/work`, `/ship`, `/pr`, `/done`, and the old `worktree`
skill are intentionally no longer maintained here. Use superpowers and your
global `~/.claude/CLAUDE.md` for that workflow logic.

## Preferred Install Path

Install standalone skills with Playbooks:

```bash
npx playbooks add skill builtby-win/skills --skill god-mode
npx playbooks add skill builtby-win/skills --skill todo
npx playbooks add skill builtby-win/skills --skill note
npx playbooks add skill builtby-win/skills --skill blog
```

Playbooks is the recommended distribution path for repo-owned custom skills in
`skills/`.

## Optional Claude Plugin Install Path

If you prefer Claude plugins, add the marketplace and install plugin wrappers:

```bash
/plugin marketplace add builtby-win/skills
/plugin install god-mode@builtby-win-skills
/plugin install todo@builtby-win-skills
/plugin install note@builtby-win-skills
/plugin install blog@builtby-win-skills
```

Claude plugins in this repo should be treated as compatibility wrappers around
the core skill content when a standalone skill also exists.

## God Mode Setup

`god-mode` is the repo-owned tmux orchestration skill. Before first use:

1. Install `god-mode` from this repo.
2. Install the separate `tmux-cli` utility or skill in your agent environment.
3. Ensure `tmux` and the specialist CLIs you care about are on `PATH`.
4. Verify what is available:

```bash
command -v tmux tmux-cli claude opencode codex gemini
```

`god-mode` should explicitly detect installed specialist CLIs, report what is
missing, and adapt its planner, designer, and implementer routing to the tools
the user actually has installed.

## Current Repo-Owned Skills

- `god-mode` - tmux-based multi-agent conductor workflow
- `todo` - add tasks to Beads repositories with project inference
- `note` - create draft blog posts from project learnings
- `blog` - manage and publish blog drafts

## Worktree CLI

The worktree workflow now lives in the standalone npm package:

```bash
npx @builtby.win/worktree create 15 dark-mode --start-server
npx @builtby.win/worktree list
npx @builtby.win/worktree info 15
npx @builtby.win/worktree delete 15
```

Optional environment variables:

- `PROJECT_PREFIX` - branch naming prefix (default: directory name)
- `WORKTREE_BASE_PORT` - starting port for dev servers (default: 4322)
- `WORKTREE_MAIN_PORT` - main worktree port (default: 4321)
- `WORKTREE_DEV_COMMAND` - npm script to start the dev server (default: `dev`)
- `WORKTREE_DB_PATH` - custom SQLite database path

Use worktrees when you want isolated databases, isolated dev servers, or truly
parallel feature work. Otherwise, regular branches are usually simpler.

## Support

Questions or issues? Open an issue on the skills repository:
https://github.com/builtby-win/skills/issues
