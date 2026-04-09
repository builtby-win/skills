# builtby.win Skills - Usage Guide

This repo now maintains:
- Playbooks-first standalone skills from this repo, including `gaud-mode`
- Optional Claude plugin compatibility wrappers for select skills
- `@builtby.win/worktree` as a standalone npm package, not a repo-owned skill

Workflow skills like `/work`, `/ship`, `/pr`, `/done`, and the old `worktree`
skill are intentionally no longer maintained here. Use superpowers and your
global `~/.claude/CLAUDE.md` for that workflow logic.

## Preferred Install Path

Install standalone skills with Playbooks:

```bash
npx playbooks add skill builtby-win/skills --skill gaud-mode
npx playbooks add skill builtby-win/skills --skill todo
npx playbooks add skill builtby-win/skills --skill note
npx playbooks add skill builtby-win/skills --skill blog
```

Playbooks is the recommended distribution path for repo-owned custom skills in
`skills/`.

## Optional Claude Plugin Install Path

If you prefer Claude plugins, add the marketplace and install the remaining
plugin wrappers:

```bash
/plugin marketplace add builtby-win/skills
/plugin install todo@builtby-win-skills
/plugin install note@builtby-win-skills
/plugin install blog@builtby-win-skills
```

Claude plugins in this repo should be treated as compatibility wrappers around
the core skill content for `todo`, `note`, and `blog`. `gaud-mode` is maintained
as repo-owned Playbooks-first skill content under `skills/gaud-mode/`.

## Gaud Mode Setup

`gaud-mode` is the repo-owned tmux milestone-runner orchestration skill. Before first use:

1. Install `gaud-mode` from this repo.
2. Install the separate `tmux-cli` utility or skill in your agent environment.
3. Ensure `tmux` and the specialist CLIs you care about are on `PATH`.
4. Verify what is available:

```bash
command -v tmux tmux-cli claude opencode codex gemini
```

`gaud-mode` should explicitly detect installed specialist CLIs, report what is
missing, show a recommended role map, and let the user override it.

Every invocation should also run `skills/gaud-mode/bin/gaud-mode-update-check`
first and refresh the installed skill from `builtby-win/skills` before gaud
starts orchestration when a newer version exists, preferably via `npx skills`
or `npx playbooks` rather than hand-editing the installed copy. That preflight
must work both from installed skill locations and from a repo checkout such as
`$PWD/skills/gaud-mode`.

tmux layout is owned by `skills/gaud-mode/bin/gaud-tmux-layout`, a bundled bash
helper with no extra install step. It enforces a fixed two-window layout:

- the `CEO/PM` conductor stays in whatever tmux window the user is already in
  and is never touched
- a `gaud` window immediately to the right holds `gaud-poll` plus any UX,
  Integrator, TPM, or Investigator panes as splits
- an `impl` window next to that holds 1-2 `Implementer` panes, tiled
- each gaud-owned window is tagged with `@gaud-orchestrator=<id>` and pane
  titles follow `<role>:<workstream>:<milestone>`; cleanup via
  `gaud-tmux-layout retire` / `gaud-tmux-layout end` refuses to touch any
  window without a matching orchestrator tag

Canonical skill name:
- `gaud-mode`

User-facing aliases that should still trigger it:
- `gaud`
- `god-mode`
- `godmode`
- `god`

On the first run, if `~/.config/gaud.config.jsonl` does not exist,
`gaud-mode` should offer to initialize it or use defaults for that run.

Recommended defaults:
- `CEO/PM` conductor and first planning pass: this session
- `TPM`: `claude`
- `Investigator`: `claude`
- `UX/UI`: `gemini`
- `Implementer`: `codex`
- `Integrator` / review: `opencode`
- `Dogfooder`: real humans

If a preferred CLI is missing, `gaud-mode` should report the fallback it is using
instead of silently swapping providers.

Example fallback message:
- `Codex not found, so using OpenCode for implementation while keeping OpenCode as the Integrator for review.`
- `Gemini not found, so using Claude for UI design and critique.`

Quick start:

```text
Use gaud-mode for this feature. Keep this session as CEO/PM and first-pass
planner. Run gaud as a milestone runner with Claude as TPM, Claude as
Investigator, Gemini on UX/UI, Codex implementing, OpenCode integrating and
reviewing, and real humans dogfooding milestones.
```

Shorter version:

```text
Use gaud. This session stays CEO/PM. Claude is TPM. Claude is Investigator.
Gemini handles UX/UI. Codex implements. OpenCode integrates and reviews.
Humans dogfood milestones.
```

If you do not specify a map, `gaud-mode` should show the recommended one and ask
for a quick override before launching panes.

## Current Repo-Owned Skills

- `gaud-mode` - tmux-based milestone-runner workflow for multi-agent delivery
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
