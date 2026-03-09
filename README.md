# builtby.win Skills

Custom agent skills from builtby.win, with Playbooks-first standalone installs
and optional Claude plugin wrappers.

## Installation

### Recommended: Playbooks

Install standalone skills directly from this repo with `playbooks`:

```bash
npx playbooks add skill builtby-win/skills --skill god-mode
npx playbooks add skill builtby-win/skills --skill todo
npx playbooks add skill builtby-win/skills --skill note
npx playbooks add skill builtby-win/skills --skill blog
```

Playbooks installs the skill into your agent's skills directory. For Claude
Code, that is typically `.claude/skills/` inside a project or your global
Claude skills directory.

### Optional: Claude Plugin Marketplace

If you prefer the Claude plugin workflow, this repo still supports it:

```bash
/plugin marketplace add builtby-win/skills
/plugin install god-mode@builtby-win-skills
/plugin install todo@builtby-win-skills
/plugin install note@builtby-win-skills
/plugin install blog@builtby-win-skills
```

## God Mode Setup

`god-mode` is a tmux-based orchestration skill. Before first use:

1. Install `god-mode` from this repo.
2. Install the separate `tmux-cli` utility or skill in your agent environment.
3. Make sure `tmux` and whichever specialist CLIs you want are on `PATH`.
4. Verify what is available:

```bash
command -v tmux tmux-cli claude opencode codex gemini
```

`god-mode` should detect which specialist CLIs are available, report what is
missing, show a recommended role map, and let the user override it.

Recommended defaults:
- conductor and first planning pass: this session
- investigator: `claude`
- implementer and reviewer: `codex`
- designer: `gemini`

If a preferred CLI is missing, `god-mode` should report the fallback it is using
instead of silently swapping providers.

Example fallback message:
- `Codex not found, so using OpenCode for implementation and code review.`
- `Gemini not found, so using Claude for UI design and critique.`

Quick start:

```text
Use god-mode for this feature. Keep this session as conductor. Use Claude for
investigation, Codex for implementation and code review, and Gemini for UI.
```

Shorter version:

```text
Use god-mode. This session stays conductor. Claude investigates. Codex implements and
reviews. Gemini handles UI.
```

If you do not specify a map, `god-mode` should show the recommended one and ask
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

- `god-mode` - tmux-based multi-agent conductor workflow
- `todo` - add tasks to Beads repositories with project inference
- `note` - create draft blog posts from project learnings
- `blog` - manage and publish blog drafts

### Claude plugin skills

- `god-mode` - tmux-based multi-agent conductor workflow
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
npx playbooks add skill builtby-win/skills --skill god-mode
```

## Claude Plugins vs Standalone Skills

Standalone skills in `skills/` are the source of truth. `plugins/` remains an
optional compatibility layer for Claude plugin installs.

For example:
- `skills/god-mode/` is the Playbooks-first distribution target
- `plugins/god-mode/` is the compatibility wrapper for Claude plugin installs

## Included Standalone Skills

Current standalone skill directories:
- `skills/god-mode/`
- `skills/todo/`
- `skills/note/`
- `skills/blog/`

`god-mode` also carries eval prompts in `skills/god-mode/evals/evals.json`.

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
