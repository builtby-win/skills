# God Mode Permission Watchdog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Teach `god-mode` to supervise specialist panes actively by preferring yolo-style launches, unblocking safe permission prompts, and accepting explicit done notifications back to the conductor.

**Architecture:** Keep `skills/god-mode/SKILL.md` as the source of truth, then mirror the behavior into the Claude plugin wrapper docs. Extend the skill with a lightweight pane-state protocol (`working`, `waiting-permission`, `waiting-user`, `done`), a narrow auto-proceed policy, and an explicit `tmux-cli` callback message specialists can send to the conductor when they finish a batch.

**Tech Stack:** Markdown skill files, tmux orchestration guidance, `tmux-cli` command examples, JSON eval scenarios, GitHub issue tracking

---

### Task 1: Track the plan before implementation

**Files:**
- Create: `docs/plans/2026-03-09-god-mode-permission-watchdog.md`
- Modify: none
- Test: `test -f docs/plans/2026-03-09-god-mode-permission-watchdog.md`

**Step 1: Write the plan document**

Capture the baseline gaps, target files, permission-handling rules, and verification approach in this plan file.

**Step 2: Verify plan file exists**

Run: `test -f docs/plans/2026-03-09-god-mode-permission-watchdog.md`
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

Run a `gh issue create` command that summarizes this plan, includes the current branch/worktree, and references `docs/plans/2026-03-09-god-mode-permission-watchdog.md`.

**Step 3: Verify the issue was created**

Run: `gh issue view <number>`
Expected: issue details render successfully

### Task 3: Update the standalone `god-mode` skill

**Files:**
- Modify: `skills/god-mode/SKILL.md`
- Test: scenario-based review plus keyword checks

**Step 1: Tighten the skill metadata**

Keep YAML frontmatter limited to `name` and `description`, and make sure the description still focuses on triggering conditions while adding searchable wording for supervision and unblocking.

**Step 2: Add pane-state supervision guidance**

Document the conductor loop for `working`, `waiting-permission`, `waiting-user`, and `done`, including how to distinguish safe auto-proceed prompts from prompts that must stay blocked.

**Step 3: Add launch guidance for permissive modes**

Show preferred launch commands for `codex --yolo`, `claude --dangerously-skip-permissions`, and `gemini --yolo`, while noting that agents without a yolo mode still require watchdog handling.

**Step 4: Add explicit tmux callback guidance**

Define how specialists should notify the conductor with `tmux-cli send` when they finish a batch or hit a permission gate, including a compact message format the conductor can parse quickly.

**Step 5: Add quick-reference and guardrail sections**

Add a quick reference table, a rationalization table, and a red-flags list that close the loopholes found in baseline testing.

**Step 6: Verify the updated skill text**

Run: `rg -n "yolo|dangerously-skip-permissions|waiting-permission|waiting-user|done|tmux-cli send" skills/god-mode/SKILL.md`
Expected: matches for each new behavior area

### Task 4: Sync the Claude plugin wrapper docs

**Files:**
- Modify: `plugins/god-mode/skills/god-mode/SKILL.md`
- Modify: `plugins/god-mode/commands/god-mode.md`
- Modify: `plugins/god-mode/.claude-plugin/plugin.json`
- Test: manual diff review and keyword checks

**Step 1: Mirror the standalone skill updates into the plugin skill wrapper**

Keep the plugin skill behavior aligned with the standalone source-of-truth text.

**Step 2: Update the slash-command wrapper**

Teach the command doc to mention supervision, auto-proceed handling, and explicit done notifications.

**Step 3: Align the plugin manifest description if needed**

Keep the marketplace description consistent with the updated triggering conditions.

**Step 4: Verify wrapper files mention the new behavior**

Run: `rg -n "yolo|permission|done|tmux-cli" plugins/god-mode`
Expected: wrapper docs reflect the new supervision model

### Task 5: Extend eval coverage for the new behavior

**Files:**
- Modify: `skills/god-mode/evals/evals.json`
- Test: manual JSON review

**Step 1: Add a permission-watchdog eval**

Add a prompt that requires the conductor to prefer yolo flags when available and to unblock safe permission prompts when a pane stalls.

**Step 2: Add a specialist-done callback eval**

Add a prompt that requires the conductor to support explicit `tmux-cli` notifications from specialists back to the orchestrator.

**Step 3: Verify the JSON stays valid**

Run: `python3 -m json.tool skills/god-mode/evals/evals.json >/dev/null`
Expected: exit 0

### Task 6: Re-run scenario checks after the edit

**Files:**
- Modify: any of the files above if verification finds gaps
- Test: repeat the baseline scenarios with the updated skill text

**Step 1: Re-run the permission-handling scenario**

Use the same subagent prompt as the RED phase and verify the simulated conductor now includes yolo preferences, safe auto-proceed behavior, and escalation rules.

**Step 2: Re-run the done-notification scenario**

Use the same subagent prompt as the RED phase and verify the simulated conductor now includes an explicit specialist-to-conductor `tmux-cli send` callback.

**Step 3: Fix any remaining loopholes and re-check**

If the post-edit scenario output still leaves obvious gaps, tighten the skill text and repeat the targeted verification.
