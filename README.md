# builtby.win Skills

Custom agent skills from builtby.win, with Playbooks-first standalone installs
and optional Claude plugin wrappers for select skills.

## Installation

### Recommended: Playbooks

Install standalone skills directly from this repo with `playbooks`:

```bash
npx playbooks add skill builtby-win/skills --skill gaud-mode
npx playbooks add skill builtby-win/skills --skill todo
npx playbooks add skill builtby-win/skills --skill note
npx playbooks add skill builtby-win/skills --skill blog
npx playbooks add skill builtby-win/skills --skill things-cli
```

Playbooks installs the skill into your agent's skills directory. For Claude
Code, that is typically `.claude/skills/` inside a project or your global
Claude skills directory.

### Optional: Claude Plugin Marketplace

If you prefer the Claude plugin workflow, this repo still supports wrappers for
`todo`, `note`, and `blog`:

```bash
/plugin marketplace add builtby-win/skills
/plugin install todo@builtby-win-skills
/plugin install note@builtby-win-skills
/plugin install blog@builtby-win-skills
```

## Gaud Mode Setup

`gaud-mode` is a tmux-based milestone-runner orchestration skill. Before first use:

1. Install `gaud-mode` from this repo.
2. Install the separate `tmux-cli` utility or skill in your agent environment.
3. Make sure `tmux` and whichever specialist CLIs you want are on `PATH`.
4. Verify what is available:

```bash
command -v tmux tmux-cli claude opencode codex gemini
```

`gaud-mode` should detect which specialist CLIs are available, report what is
missing, show a recommended role map, and let the user override it.

Every invocation should also run `skills/gaud-mode/bin/gaud-mode-update-check`
first and refresh the installed skill from `builtby-win/skills` before gaud
starts orchestration when a newer version exists, preferably via `npx skills`
or `npx playbooks` rather than hand-editing the installed copy. That preflight
must work both from installed skill locations and from a repo checkout such as
`$PWD/skills/gaud-mode`.

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

## Repo Layout

```text
skills/     # Standalone source-of-truth skills for Playbooks
plugins/    # Optional Claude plugin wrappers
packages/   # Related npm packages, including the worktree CLI
docs/       # Plans and supporting repo documentation
```

## Current Skills

### Standalone skills

- `gaud-mode` - tmux-based milestone-runner workflow for multi-agent delivery
- `todo` - add tasks to Beads repositories with project inference
- `note` - create draft blog posts from project learnings
- `blog` - manage and publish blog drafts
- `things-cli` - interact with Things 3 safely from the CLI using `things-cli`, Things URLs, and AppleScript

### Claude plugin skills

- `todo` - add tasks to Beads repositories with project inference
- `note` - create draft blog posts from project learnings
- `blog` - manage and publish blog drafts

## Playbooks Hosting Flow

Use this repo structure when you want a skill to be discoverable on
`playbooks.com`:

1. Add the skill under `skills/<skill-name>/SKILL.md`
2. Include optional supporting files like `LICENSE.txt`, `evals/`, `assets/`,
   `references/`, or `scripts/`
3. Push the repo to GitHub so Playbooks can read the skill directory
4. Sign in to `playbooks.com` with GitHub
5. Submit the skill or bundle through the Playbooks website
6. Use the generated install command from the listing, for example:

```bash
npx playbooks add skill builtby-win/skills --skill gaud-mode
```

## Claude Plugins vs Standalone Skills

Standalone skills in `skills/` are the source of truth. `plugins/` remains an
optional compatibility layer for Claude plugin installs where wrappers still
exist.

For example:
- `skills/gaud-mode/` is the Playbooks-first distribution target
- `plugins/todo/` is a compatibility wrapper for Claude plugin installs

## Included Standalone Skills

Current standalone skill directories:
- `skills/gaud-mode/`
- `skills/todo/`
- `skills/note/`
- `skills/blog/`
- `skills/things-cli/`

`gaud-mode` also carries eval prompts in `skills/gaud-mode/evals/evals.json`.

## Worktree CLI

This repo also publishes the standalone worktree npm package:

```bash
npx @builtby.win/worktree create 15 dark-mode --start-server
```

`@builtby.win/worktree` is a package, not a repo-owned skill. Use it directly
or from your own orchestration workflow after you decide isolated worktrees are
helpful.

Package source:
- `packages/worktree-cli/package.json`

## Contributing

To add another Playbooks-ready skill:

1. Create `skills/<skill-name>/SKILL.md`
2. Add support files if needed
3. Optionally add a Claude plugin wrapper under `plugins/<skill-name>/`
4. Update this README and `.claude-plugin/marketplace.json` if you publish the
   plugin wrapper

## License

MIT - see `LICENSE`
