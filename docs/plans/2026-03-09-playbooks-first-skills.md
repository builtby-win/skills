# Playbooks-First Skills Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure this repository around top-level standalone skills for Playbooks installation, starting with `god-mode`, while preserving an optional Claude plugin install path.

**Architecture:** Make `skills/` the source-of-truth directory for standalone skills that Playbooks can index directly from GitHub. Keep `plugins/` as an optional compatibility layer for Claude plugin marketplace installs, and update root documentation to explain both paths with Playbooks as the primary recommendation.

**Tech Stack:** Markdown skill files, Claude plugin manifests, GitHub-hosted repository docs, Playbooks install command conventions

---

### Task 1: Capture the repo migration plan

**Files:**
- Create: `docs/plans/2026-03-09-playbooks-first-skills.md`
- Modify: none
- Test: manual review of plan content

**Step 1: Write the plan document**

Write the repo migration plan with exact target folders, docs updates, and verification steps.

**Step 2: Verify plan file exists**

Run: `test -f docs/plans/2026-03-09-playbooks-first-skills.md`
Expected: exit 0

### Task 2: Track the plan in GitHub

**Files:**
- Create: GitHub issue only
- Modify: none
- Test: `gh issue view <number>`

**Step 1: Ensure `plan` label exists**

Run: `gh label create plan --description "Implementation plans filed by agents" --color 0E8A16 2>/dev/null || true`
Expected: success whether newly created or already present

**Step 2: Create issue with the plan summary**

Run a `gh issue create` command that references this plan file and the current branch.

**Step 3: Verify the issue was created**

Run: `gh issue view <number>`
Expected: issue details render successfully

### Task 3: Add standalone Playbooks skill layout

**Files:**
- Create: `skills/god-mode/SKILL.md`
- Create: `skills/god-mode/evals/evals.json`
- Modify: `README.md`
- Test: manual file existence check

**Step 1: Copy the existing `god-mode` skill into repo-owned standalone form**

Preserve the existing `name` and description, and keep the `evals` directory so the skill remains testable.

**Step 2: Update repo docs to treat `skills/` as the primary install surface**

Document `npx playbooks add skill builtby-win/skills --skill god-mode` as the default install path.

**Step 3: Verify the new skill files exist**

Run: `test -f skills/god-mode/SKILL.md && test -f skills/god-mode/evals/evals.json`
Expected: exit 0

### Task 4: Preserve Claude plugin compatibility

**Files:**
- Create: `plugins/god-mode/.claude-plugin/plugin.json`
- Create: `plugins/god-mode/commands/god-mode.md`
- Create: `plugins/god-mode/skills/god-mode/SKILL.md`
- Modify: `.claude-plugin/marketplace.json`
- Test: JSON shape review and file existence checks

**Step 1: Add a plugin wrapper for `god-mode`**

Create a plugin entry that lets Claude users still install the skill through the plugin marketplace.

**Step 2: Add `god-mode` to the marketplace manifest**

Keep naming and description aligned with the standalone skill to reduce drift.

**Step 3: Verify plugin files exist**

Run: `test -f plugins/god-mode/.claude-plugin/plugin.json && test -f plugins/god-mode/commands/god-mode.md && test -f plugins/god-mode/skills/god-mode/SKILL.md`
Expected: exit 0

### Task 5: Rewrite installation and hosting docs

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Test: manual review plus grep for `playbooks`

**Step 1: Add a current skills overview**

List the skills already in the repo and distinguish standalone skills from plugin-only utilities if needed.

**Step 2: Add Playbooks install instructions**

Explain project-local vs global skill installation through Playbooks, using the repo's GitHub owner/name in the command examples.

**Step 3: Add Playbooks hosting/submission instructions**

Document the observed workflow: publish the skill to GitHub, sign in to `playbooks.com` with GitHub, submit the skill or bundle through the site, and use the generated install command from the listing.

**Step 4: Add Claude plugin compatibility instructions**

Keep the old plugin installation flow available as a secondary option.

### Task 6: Verify consistency before completion

**Files:**
- Modify: any mismatched docs or manifests found during verification
- Test: file checks, grep checks, and JSON reads

**Step 1: Run fresh verification commands**

Run commands that prove the key files exist and that docs/manifests mention `god-mode` and `playbooks` where expected.

**Step 2: Read outputs and fix inconsistencies**

If a command or doc check fails, update the relevant file and rerun the failing verification.

**Step 3: Report only verified results**

Summarize the new repo structure and install paths with file references and fresh command evidence.
