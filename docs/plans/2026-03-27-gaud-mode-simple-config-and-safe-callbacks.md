# Gaud Mode Simple Config And Safe Callbacks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify `gaud-mode` so users can configure one orchestrator plus implementer agents locally, and make gaud launch/callback transport reliable even when `gaud-poll` is unavailable.

**Architecture:** Keep `skills/gaud-mode/SKILL.md` as a short entrypoint with a simple config contract, and move detailed launch/callback rules into focused reference docs. Treat the orchestrator pane ID as the one source of truth injected into each implementer kickoff. Prefer `gaud-poll` for pane watching, but keep a direct callback fallback using `tmux-cli send` plus periodic pane polling.

**Tech Stack:** Markdown skill docs, JSONL config, tmux, tmux-cli, Bun-based `gaud-poll`

---

## Root Cause Summary

- Codex launch prompts are being shell-broken before the CLI starts because multiline kickoff prompts contain nested double quotes.
- `gaud-poll` currently over-parses callback examples copied from prompt text as if they were real callback events.
- The current skill text mixes config, launch policy, pane lifecycle, and callback transport in one large document, which makes the contract hard to follow.

## Program DONE Criteria

- Users can configure `orchestrator` and `implementers` in one simple JSONL object.
- `gaud-mode` always tells implementers which agent is the orchestrator and what pane ID to callback to.
- Launch docs specify shell-safe kickoff transport, especially for Codex implementers.
- `gaud-poll` only accepts real callback lines, not template/example lines.
- Direct callback fallback is documented and works when `gaud-poll` is unavailable.

## Current Milestone

**Milestone:** Simplify the skill contract and fix launch/callback reliability.

**Milestone DONE Criteria:**

- `skills/gaud-mode/SKILL.md` is short and clear.
- Config format is explicit and simple.
- Reference docs explain safe launch/callback behavior.
- The implementation plan covers code changes for parser and launch transport.

### Task 1: Simplify the gaud-mode entrypoint skill

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Test: `rg -n "orchestrator|implementers|gaud-poll|tmux-cli send|Launch Rules" skills/gaud-mode/SKILL.md`

**Step 1: Rewrite the overview and use cases**

Describe gaud as a tmux milestone runner with one orchestrator and one or more implementers.

**Step 2: Add the simple config contract**

Document `orchestrator`, `implementers`, and optional `fallbacks` in one JSON example.

**Step 3: Add the callback transport summary**

Document preferred `gaud-poll` watch mode plus direct callback fallback with `tmux-cli send`.

**Step 4: Verify the new language exists**

Run: `rg -n "orchestrator|implementers|gaud-poll|tmux-cli send|Launch Rules" skills/gaud-mode/SKILL.md`
Expected: matches for all of the simplified contract terms

### Task 2: Rewrite kickoff guidance so prompts are shell-safe

**Files:**
- Modify: `skills/gaud-mode/references/kickoff-prompts.md`
- Test: `rg -n "shell-safe|conductor pane ID|do not paste literal|codex --yolo|tmux-cli send" skills/gaud-mode/references/kickoff-prompts.md`

**Step 1: Remove unsafe literal command examples from kickoff bodies**

Replace raw nested-quote callback examples with shell-safe guidance that tells gaud to inject real values at send time.

**Step 2: Tighten Codex launch guidance**

Document the minimal launch form for Codex implementers: `codex --yolo -m <model> "<prompt>"`, with no extra flags by default.

**Step 3: Add transport constraints**

State that multiline prompts must use a transport that preserves quotes safely and does not let zsh interpret prompt body lines as commands.

**Step 4: Verify the new guidance exists**

Run: `rg -n "shell-safe|conductor pane ID|do not paste literal|codex --yolo|tmux-cli send" skills/gaud-mode/references/kickoff-prompts.md`
Expected: matches for the safe transport rules

### Task 3: Fix gaud-poll callback parsing

**Files:**
- Modify: `packages/gaud-poll/src/parser.ts`
- Test: `bun test` or focused parser test command once tests exist

**Step 1: Write the failing parser test**

Add a test that feeds prompt-template lines like ``tmux-cli send "GAUDMODE done ..."`` into the parser and asserts that they are ignored.

**Step 2: Run the failing test**

Run the focused parser test and confirm it fails against the current parser.

**Step 3: Implement the minimal parser fix**

Restrict callback parsing so only real callback lines are accepted, and ignore template/example lines that contain `tmux-cli send`, backticks, or placeholder values.

**Step 4: Run the focused test again**

Expected: PASS

### Task 4: Fix implementer launch transport

**Files:**
- Modify: launcher/orchestration code once the concrete file is identified in the consuming repo
- Create: targeted tests in that repo for Codex kickoff command generation
- Test: exact test command depends on that repo

**Step 1: Identify the real launcher file**

Find the code that builds tmux launch commands for implementers in the consuming repo.

**Step 2: Write a failing test for nested quotes**

Create a test that builds a Codex kickoff prompt containing callback text and asserts the generated shell command remains a single valid command string.

**Step 3: Implement a safe transport**

Use a launch strategy that preserves multiline prompt text safely. Options to evaluate:
- heredoc wrapper
- temp file plus command substitution
- another shell-safe transport that avoids zsh interpreting prompt body lines

**Step 4: Re-run the failing test**

Expected: PASS

### Task 5: Document the direct callback fallback clearly

**Files:**
- Modify: `skills/gaud-mode/references/milestone-loop.md`
- Modify: `skills/gaud-mode/references/personas.md`
- Test: `rg -n "gaud-poll|fallback|conductor pane|callback" skills/gaud-mode/references/milestone-loop.md skills/gaud-mode/references/personas.md`

**Step 1: Add fallback rules to the milestone loop**

Describe that gaud should keep polling even when implementers also send direct callbacks.

**Step 2: Add implementer callback responsibility**

State that implementers must know the orchestrator agent and the conductor pane ID from kickoff.

**Step 3: Verify the fallback language exists**

Run: `rg -n "gaud-poll|fallback|conductor pane|callback" skills/gaud-mode/references/milestone-loop.md skills/gaud-mode/references/personas.md`
Expected: matches in both files

### Task 6: Verify the docs and skill stay internally consistent

**Files:**
- Modify: docs touched above as needed
- Test: `git diff --check && rg -n "orchestrator|implementers|shell-safe|gaud-poll|fallback" skills/gaud-mode/SKILL.md skills/gaud-mode/references/*.md`

**Step 1: Run diff hygiene checks**

Run: `git diff --check`
Expected: no whitespace or conflict-marker issues

**Step 2: Run consistency grep**

Run: `rg -n "orchestrator|implementers|shell-safe|gaud-poll|fallback" skills/gaud-mode/SKILL.md skills/gaud-mode/references/*.md`
Expected: the simplified contract and fallback language appear consistently across docs
