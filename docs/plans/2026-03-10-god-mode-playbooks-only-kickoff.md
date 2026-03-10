# God Mode Playbooks-Only Kickoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `god-mode` a Playbooks-first standalone skill only, while teaching it to launch tmux subagents with richer initial prompts, skip non-essential update prompts when safe, escalate confusion back to the user, and always set `B2V_DISABLED=true` for specialist panes.

**Architecture:** Keep `skills/god-mode/SKILL.md` and `skills/god-mode/evals/evals.json` as the only live `god-mode` product surface in this repo. Remove the Claude plugin wrapper for `god-mode`, update repo docs and marketplace metadata so they no longer advertise a `god-mode` plugin install path, then expand the standalone skill text so the conductor uses startup prompts as the primary control channel, treats optional update/setup prompts as skippable noise unless they are required for the task, and routes uncertainty through `waiting-user` callbacks instead of guessing.

**Tech Stack:** Markdown skill docs, JSON eval prompts, tmux orchestration guidance, GitHub issue tracking, Playbooks distribution docs

---

### Task 1: Track the plan before implementation

**Files:**
- Create: `docs/plans/2026-03-10-god-mode-playbooks-only-kickoff.md`
- Modify: none
- Test: `test -f docs/plans/2026-03-10-god-mode-playbooks-only-kickoff.md`

**Step 1: Write the plan document**

Capture the Playbooks-only scope, target deletions, `B2V_DISABLED=true` launch rule, kickoff-prompt expansion, confusion-escalation behavior, and verification commands in this file.

**Step 2: Verify the plan file exists**

Run: `test -f docs/plans/2026-03-10-god-mode-playbooks-only-kickoff.md`
Expected: exit 0

### Task 2: File the plan in GitHub

**Files:**
- Create: GitHub issue only
- Modify: none
- Test: `gh issue view <number>`

**Step 1: Ensure the `plan` label exists**

Run: `gh label create plan --description "Implementation plans filed by agents" --color 0E8A16 2>/dev/null || true`
Expected: success whether the label is new or already present

**Step 2: Create the issue**

Run a `gh issue create` command that references `docs/plans/2026-03-10-god-mode-playbooks-only-kickoff.md`, includes the current branch and worktree, and embeds the full plan text in the issue body.

**Step 3: Verify the issue was created**

Run: `gh issue view <number>`
Expected: issue details render successfully

### Task 3: Remove the `god-mode` Claude plugin wrapper

**Files:**
- Delete: `plugins/god-mode/.claude-plugin/plugin.json`
- Delete: `plugins/god-mode/commands/god-mode.md`
- Delete: `plugins/god-mode/skills/god-mode/SKILL.md`
- Modify: `.claude-plugin/marketplace.json`
- Test: `test ! -e plugins/god-mode && python3 -m json.tool .claude-plugin/marketplace.json >/dev/null`

**Step 1: Remove the marketplace entry**

Delete the `god-mode` object from `.claude-plugin/marketplace.json` and keep the remaining JSON valid.

**Step 2: Remove the wrapper files**

Delete `plugins/god-mode/.claude-plugin/plugin.json`, `plugins/god-mode/commands/god-mode.md`, and `plugins/god-mode/skills/god-mode/SKILL.md` so the repo no longer carries a second `god-mode` spec.

**Step 3: Verify the wrapper is gone**

Run: `test ! -e plugins/god-mode && python3 -m json.tool .claude-plugin/marketplace.json >/dev/null`
Expected: `plugins/god-mode` is absent and the marketplace manifest still parses

### Task 4: Update repo docs for Playbooks-only `god-mode`

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `.claude-plugin/marketplace.json`
- Test: `rg -n "god-mode@builtby-win-skills|plugin install god-mode|plugins/god-mode" README.md CLAUDE.md .claude-plugin/marketplace.json`

**Step 1: Rewrite install guidance in `README.md`**

Remove the `god-mode` plugin install example, remove any language that says `plugins/god-mode/` is a maintained compatibility wrapper, and keep `god-mode` listed only under the standalone `skills/` path.

**Step 2: Rewrite install guidance in `CLAUDE.md`**

Remove the `god-mode` plugin install example and describe `god-mode` as repo-owned Playbooks-first skill content rather than a plugin wrapper.

**Step 3: Tighten marketplace metadata wording**

Update `.claude-plugin/marketplace.json` metadata so it still accurately describes the remaining plugin wrappers without implying that `god-mode` is one of them.

**Step 4: Verify the stale install path is gone**

Run: `rg -n "god-mode@builtby-win-skills|plugin install god-mode|plugins/god-mode" README.md CLAUDE.md .claude-plugin/marketplace.json`
Expected: no matches

### Task 5: Add RED-phase eval coverage for the new orchestration rules

**Files:**
- Modify: `skills/god-mode/evals/evals.json`
- Test: `python3 -m json.tool skills/god-mode/evals/evals.json >/dev/null`

**Step 1: Add a Playbooks-only distribution eval**

Add a prompt that expects the agent to keep `god-mode` in `skills/god-mode/` as the only maintained source and to avoid suggesting the Claude plugin wrapper for this skill.

**Step 2: Add a seeded-kickoff eval**

Add a prompt that expects the conductor to pass a fully-formed startup prompt directly into `claude`, `codex`, `gemini`, or `opencode` at launch time instead of launching blank panes and relying on later manual follow-up.

**Step 3: Add a confusion-escalation eval**

Add a prompt that expects the conductor or specialists to ask the user through the conductor when they are unsure what to do, rather than inventing requirements.

**Step 4: Add a `B2V_DISABLED=true` launch eval**

Add a prompt that expects every specialist CLI launch example to be prefixed with `env B2V_DISABLED=true`.

**Step 5: Verify the eval file stays valid JSON**

Run: `python3 -m json.tool skills/god-mode/evals/evals.json >/dev/null`
Expected: exit 0

### Task 6: Expand the standalone `god-mode` skill text

**Files:**
- Modify: `skills/god-mode/SKILL.md`
- Test: `rg -n "B2V_DISABLED=true|skip optional update|confused|waiting-user|startup prompt|initial prompt" skills/god-mode/SKILL.md`

**Step 1: Update the launch pattern to seed the prompt at process start**

Change the pane-launch instructions so they prefer startup commands that already include the kickoff prompt, for example:

```bash
env B2V_DISABLED=true claude --dangerously-skip-permissions "<kickoff prompt>"
env B2V_DISABLED=true codex --yolo "<kickoff prompt>"
env B2V_DISABLED=true gemini --yolo -i "<kickoff prompt>"
env B2V_DISABLED=true opencode --prompt "<kickoff prompt>"
```

The skill should still allow `tmux-cli send` for later rounds, but the first prompt should be carried by the launch command whenever the CLI supports it.

**Step 2: Add explicit optional-update and setup-skip guidance**

Add a new rule block that tells the conductor and specialists to prefer `Skip`, `Not now`, or equivalent choices for optional updates, release notes, telemetry notices, or other non-essential setup interruptions unless the current batch cannot proceed without that update.

Use wording at least this specific:

```text
If a prompt is only about an optional update or non-essential setup step, skip it and continue.
If the update appears required for the assigned task, or you are not sure whether skipping is safe, escalate instead of guessing.
```

**Step 3: Add a confusion-escalation rule**

Teach both the conductor and specialists that uncertainty is a blocker to surface, not a gap to fill with guesses.

Include language like:

```text
If you are confused about the requested outcome, do not invent the missing requirement.
Ask one targeted question through the conductor or to the user directly when the conductor itself is blocked.
```

**Step 4: Expand the kickoff template**

Extend the prompt template in `skills/god-mode/SKILL.md` so it includes an autonomy policy, skip-vs-escalate guidance, and explicit confusion handling. The inserted block should look like this:

```text
Autonomy policy:
- Continue through safe repo exploration, file reads, code edits, and local verification needed for this batch.
- Skip optional update prompts, release notes, telemetry notices, and other non-essential setup screens when they are not required.
- If you are unsure what to do next, stop guessing and ask through the conductor.

If you are confused or the request is ambiguous, send:
- `tmux-cli send "GODMODE waiting-user role=[role] workstream=[name] summary=[targeted question]" --pane=[conductor-pane]`
```

**Step 5: Update the examples and guardrails**

Revise the launch examples, quick reference, rationalizations, red flags, and example scenario so they mention `env B2V_DISABLED=true`, startup-prompt seeding, optional-update skipping, and confusion escalation.

**Step 6: Verify the updated skill text**

Run: `rg -n "B2V_DISABLED=true|skip optional update|confused|waiting-user|startup prompt|initial prompt" skills/god-mode/SKILL.md`
Expected: matches for each new behavior area

### Task 7: Re-run targeted checks after the edit

**Files:**
- Modify: any of the files above if verification finds gaps
- Test: targeted keyword and scenario checks

**Step 1: Re-check docs and marketplace references**

Run: `rg -n "god-mode@builtby-win-skills|plugin install god-mode|plugins/god-mode" README.md CLAUDE.md .claude-plugin/marketplace.json`
Expected: no matches

**Step 2: Re-check skill keywords**

Run: `rg -n "B2V_DISABLED=true|skip optional update|confused|waiting-user|startup prompt|initial prompt" skills/god-mode/SKILL.md skills/god-mode/evals/evals.json`
Expected: matches in both the skill and eval file

**Step 3: Fix any gaps and repeat the focused checks**

If a check misses one of the requested behaviors, tighten the relevant markdown or eval text and rerun only the failing command until it passes.
