# Gaud Mode Layout, Init, And Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update `gaud-mode` so it uses less-cluttered tmux window allocation, launches every specialist with direct `B2V_DISABLED=true <cli>` prefixes, supports persisted global defaults plus per-repo overrides for `gaud-mode init`, and falls back when a preferred provider is quota-blocked or otherwise unavailable.

**Architecture:** Keep `skills/gaud-mode/SKILL.md` as the source of truth and extend `skills/gaud-mode/evals/evals.json` first so the new behavior is testable before the skill text changes. Treat layout, init state, and provider health as orchestration concepts owned by the conductor, not as a new standalone CLI surface. Use a merged preference model of global defaults plus repo-local overrides, and keep provider-health checks best-effort so `gaud-mode` can continue even when a CLI exposes only partial status information.

**Tech Stack:** Markdown skill docs, JSON eval prompts, tmux window and pane orchestration guidance, CLI launch command examples, GitHub issue tracking

---

### Task 1: Track the plan before implementation

**Files:**
- Create: `docs/plans/2026-03-10-god-mode-layout-init-fallback.md`
- Modify: none
- Test: `test -f docs/plans/2026-03-10-god-mode-layout-init-fallback.md`

**Step 1: Write the plan document**

Capture the direct `B2V_DISABLED=true <cli>` rule, the three-pane-per-window layout rule, the `gaud-mode init` preference model, and the quota-aware fallback model in this file.

**Step 2: Verify the plan file exists**

Run: `test -f docs/plans/2026-03-10-god-mode-layout-init-fallback.md`
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

Run a `gh issue create` command that references `docs/plans/2026-03-10-god-mode-layout-init-fallback.md`, includes the current branch and worktree, and embeds the full plan text in the issue body.

**Step 3: Verify the issue was created**

Run: `gh issue view <number>`
Expected: issue details render successfully

### Task 3: Add RED-phase eval coverage for the new orchestration rules

**Files:**
- Modify: `skills/gaud-mode/evals/evals.json`
- Test: `python3 -m json.tool skills/gaud-mode/evals/evals.json >/dev/null`

**Step 1: Add a direct-launch-prefix eval**

Add a prompt that expects specialist launch examples to use direct shell prefixes like these, not `env ...` wrappers:

```bash
B2V_DISABLED=true claude --dangerously-skip-permissions "<kickoff prompt>"
B2V_DISABLED=true codex --yolo "<kickoff prompt>"
B2V_DISABLED=true gemini --yolo -i "<kickoff prompt>"
B2V_DISABLED=true opencode --prompt "<kickoff prompt>"
```

**Step 2: Add a window-overflow eval**

Add a prompt that expects the conductor to keep at most three specialist panes in one tmux window, create or reuse another tmux window for the fourth pane onward, and keep routing by tracked `session:window.pane` identifiers.

**Step 3: Add an init-preference eval**

Add one prompt that expects `gaud-mode init` to save global defaults plus repo-local overrides, and a second prompt that expects a later `gaud-mode` run to load the merged map automatically and ask only for overrides.

**Step 4: Add a provider-health fallback eval**

Add a prompt that expects the conductor to check whether the preferred providers for a large batch are ready, quota-blocked, rate-limited, auth-blocked, or unknown, then fall back before dispatching when a preferred provider is clearly unavailable.

**Step 5: Verify the eval file stays valid JSON**

Run: `python3 -m json.tool skills/gaud-mode/evals/evals.json >/dev/null`
Expected: exit 0

### Task 4: Replace `env B2V_DISABLED=true` with direct launch prefixes

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Test: `rg -n "env B2V_DISABLED=true|B2V_DISABLED=true claude|B2V_DISABLED=true codex|B2V_DISABLED=true gemini|B2V_DISABLED=true opencode" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`

**Step 1: Update the launch pattern language**

Rewrite the launch instructions so they explicitly require direct environment-variable prefixes on the agent command itself, for example `B2V_DISABLED=true claude --dangerously-skip-permissions "<kickoff prompt>"`.

**Step 2: Update every launch example**

Replace each existing `env B2V_DISABLED=true ...` example in `skills/gaud-mode/SKILL.md` with the direct shell-prefix form above.

**Step 3: Tighten the invariant in quick reference and guardrails**

Add wording that the conductor should treat the direct `B2V_DISABLED=true <cli>` prefix as required for every specialist launch path, not just an example.

**Step 4: Verify the old form is gone and the new form is present**

Run: `rg -n "env B2V_DISABLED=true|B2V_DISABLED=true claude|B2V_DISABLED=true codex|B2V_DISABLED=true gemini|B2V_DISABLED=true opencode" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`
Expected: no `env B2V_DISABLED=true` matches and positive matches for the direct prefix form

### Task 5: Add tmux window-capacity guidance and tracking

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Modify: `skills/gaud-mode/evals/evals.json`
- Test: `rg -n "three specialist panes|max three|new tmux window|role registry|session:window.pane" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`

**Step 1: Add a window-layout model**

Document that the conductor should treat tmux windows as capacity buckets, keep at most three specialist panes in one window, and switch to a new or reusable window after that point.

**Step 2: Add a registry rule**

Teach the conductor to maintain a role registry keyed by role and pane identity, for example `implementer -> session:2.1`, so specialists remain addressable even after work spreads across multiple windows.

**Step 3: Add a reuse rule before creation**

Document that the conductor should first reuse an existing tmux window with fewer than three specialist panes before creating a brand-new tmux window.

**Step 4: Update user-facing progress output**

Extend the reporting guidance so setup or progress summaries can show which roles live in which tmux windows when multi-window orchestration is active.

**Step 5: Verify the new layout language is present**

Run: `rg -n "three specialist panes|max three|new tmux window|role registry|session:window.pane" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`
Expected: matches in both files for the new layout model

### Task 6: Add `gaud-mode init` with global defaults and per-repo overrides

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Modify: `skills/gaud-mode/evals/evals.json`
- Test: `rg -n "gaud-mode init|~/.config/gaud.config.jsonl|\.gaud.config.jsonl|global defaults|repo override" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`

**Step 1: Define the persisted preference model**

Document that `gaud-mode init` writes global defaults to `~/.config/gaud.config.jsonl` and repo-local overrides to `.gaud.config.jsonl`, with later runs merging them in that order: repo override first, then global defaults, then detected fallbacks.

**Step 2: Add init handshake wording**

Teach `gaud-mode init` to show detected tools, the recommended role map, the merged default role map, and one focused question for overrides before persisting the result.

**Step 3: Add a no-new-CLI rule**

Document that this behavior belongs to the skill workflow first and does not require introducing a separate management CLI in this change set.

**Step 4: Add later-run reuse guidance**

Teach normal `gaud-mode` runs to load saved preferences automatically, reflect the merged map back to the user, and ask only for task-specific overrides.

**Step 5: Verify the new init model is present**

Run: `rg -n "gaud-mode init|~/.config/gaud.config.jsonl|\.gaud.config.jsonl|global defaults|repo override" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`
Expected: matches for init, global config, repo config, and merged defaults

### Task 7: Add best-effort provider-health fallback guidance

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Modify: `skills/gaud-mode/evals/evals.json`
- Test: `rg -n "quota-blocked|rate-limited|auth-blocked|status unknown|provider health|fallback before dispatch" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`

**Step 1: Add a preflight rule for large batches**

Document that before launching a substantial multi-role batch, the conductor should check the preferred providers for the roles it is about to launch and classify them as `ready`, `quota-blocked`, `rate-limited`, `auth-blocked`, or `unknown`.

**Step 2: Add bounded probing guidance**

Teach the conductor to keep status checks light and best-effort, to avoid blocking on provider introspection, and to continue with `status unknown` messaging when a CLI does not expose a reliable health command.

**Step 3: Add fallback wording for soft and hard failures**

Document that `quota-blocked`, `rate-limited`, or `auth-blocked` providers should trigger explicit fallback messages before dispatch, while `unknown` status should not stall the workflow by itself.

**Step 4: Add launch-failure reclassification guidance**

Teach the conductor that if a provider looked healthy but fails at launch with a quota or usage error, it should immediately reclassify that provider as unavailable for the round and reassign the role.

**Step 5: Verify the health-check language is present**

Run: `rg -n "quota-blocked|rate-limited|auth-blocked|status unknown|provider health|fallback before dispatch" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`
Expected: matches for all new provider-health states and fallback behavior

### Task 8: Re-run focused verification after the edit

**Files:**
- Modify: any of the files above if verification finds gaps
- Test: targeted keyword and JSON checks

**Step 1: Re-check JSON validity**

Run: `python3 -m json.tool skills/gaud-mode/evals/evals.json >/dev/null`
Expected: exit 0

**Step 2: Re-check direct launch prefixes and layout/init/health keywords**

Run: `rg -n "B2V_DISABLED=true claude|B2V_DISABLED=true codex|B2V_DISABLED=true gemini|B2V_DISABLED=true opencode|gaud-mode init|new tmux window|quota-blocked|status unknown" skills/gaud-mode/SKILL.md skills/gaud-mode/evals/evals.json`
Expected: matches across both files for each requested behavior area

**Step 3: Fix any gaps and repeat only the failing checks**

If one of the checks misses a requested behavior, tighten the relevant markdown or eval text and rerun just that verification command until it passes.
