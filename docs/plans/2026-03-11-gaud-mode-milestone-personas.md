# Gaud Mode Milestone Persona Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `gaud-mode` from a one-shot orchestrator into a milestone-driven program runner with explicit CEO/PM, TPM, specialist, and dogfooding phases that check back often and keep tasks small enough to steer.

**Architecture:** Keep `skills/gaud-mode/SKILL.md` as the entrypoint, but move most long-form operating detail into new reference docs under `skills/gaud-mode/references/`. Use BMAD-style persona sharpness for role prompts, Spec-Kit-style DONE-first planning discipline for milestone slicing, and expand `skills/gaud-mode/evals/evals.json` before rewriting the main skill text so the new behavior is testable first.

**Tech Stack:** Markdown skill docs, JSON eval prompts, tmux orchestration guidance, persona prompt templates, GitHub issue tracking

---

## Definition Of Done

- `skills/gaud-mode/SKILL.md` describes gaud as a milestone runner, not a one-shot orchestrator.
- The role model is explicit: `CEO/PM`, `TPM`, `Investigator`, `UX/UI`, `Implementer`, `Integrator`, `Dogfooder`.
- Ticketing does not begin until DONE criteria are clear in a markdown plan.
- User-testable milestones stop for dogfooding before the next milestone starts.
- Specialists are relaunched with fresh context after each accepted milestone.
- `skills/gaud-mode/evals/evals.json` covers DONE-first planning, milestone check-backs, dogfooding gates, fresh-agent resets, and gaud-native persona routing.
- Verification commands pass for JSON validity and for the new milestone/persona language in the skill docs.

## Chosen Defaults

- Keep gaud-native role names instead of BMAD labels.
- Use `current session` as `CEO/PM conductor`.
- Use `Claude` as the default `TPM / investigator`.
- Use `Gemini` as the default `UX/UI frontend engineer`.
- Use `Codex` as the default `implementer`.
- Use `OpenCode` as the default `integrator / generalist / overflow implementer`.
- Require dogfooding only for user-testable milestones.

### Task 1: Track the plan before implementation

**Files:**
- Create: `docs/plans/2026-03-11-gaud-mode-milestone-personas.md`
- Modify: none
- Test: `test -f docs/plans/2026-03-11-gaud-mode-milestone-personas.md`

**Step 1: Write the plan document**

Capture the milestone loop, persona model, dogfooding gate, fresh-agent reset rule, and file split in this plan.

**Step 2: Verify the plan file exists**

Run: `test -f docs/plans/2026-03-11-gaud-mode-milestone-personas.md`
Expected: exit 0

### Task 2: File the plan in GitHub

**Files:**
- Create: GitHub issue only
- Modify: none
- Test: `gh issue view <number>`

**Step 1: Ensure the `plan` label exists**

Run: `gh label create plan --description "Implementation plans filed by agents" --color 0E8A16 2>/dev/null || true`
Expected: success whether the label already exists or not

**Step 2: Create the issue**

Run a `gh issue create` command that references `docs/plans/2026-03-11-gaud-mode-milestone-personas.md`, includes the current branch and worktree, and embeds this full plan in the issue body.

**Step 3: Verify the issue was created**

Run: `gh issue view <number>`
Expected: issue details render successfully

### Task 3: Add RED-phase eval coverage for the milestone program loop

**Files:**
- Modify: `skills/gaud-mode/evals/evals.json`
- Test: `python3 -m json.tool skills/gaud-mode/evals/evals.json >/dev/null`

**Step 1: Add a DONE-before-ticketing eval**

Add a prompt that expects gaud to refuse milestone ticket breakdown until the markdown plan has explicit DONE criteria.

**Step 2: Add a user-testable dogfooding eval**

Add a prompt that expects gaud to stop after a user-testable milestone is implemented, ask for human dogfooding, and avoid launching milestone 2 before that feedback arrives.

**Step 3: Add a fresh-agent reset eval**

Add a prompt that expects gaud to retire or close specialist panes after milestone acceptance, then relaunch fresh specialists for the next milestone instead of reusing stale context.

**Step 4: Add a markdown-plan source-of-truth eval**

Add a prompt that expects gaud to drive execution from one markdown plan containing PRD, milestones, tickets, and dogfooding gates rather than ad hoc pane prompts.

**Step 5: Add a persona-routing eval**

Add a prompt that expects gaud-native roles to map like this: current session as CEO/PM, Claude as TPM or investigator, Gemini as UX/UI, Codex as implementer, and OpenCode as integrator or overflow implementer.

**Step 6: Verify the eval file stays valid JSON**

Run: `python3 -m json.tool skills/gaud-mode/evals/evals.json >/dev/null`
Expected: exit 0

### Task 4: Split the skill into an entrypoint plus focused reference docs

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Create: `skills/gaud-mode/references/personas.md`
- Create: `skills/gaud-mode/references/milestone-loop.md`
- Create: `skills/gaud-mode/references/markdown-plan-template.md`
- Create: `skills/gaud-mode/references/kickoff-prompts.md`
- Create: `skills/gaud-mode/references/dogfooding.md`
- Test: `test -f skills/gaud-mode/references/personas.md && test -f skills/gaud-mode/references/milestone-loop.md && test -f skills/gaud-mode/references/markdown-plan-template.md && test -f skills/gaud-mode/references/kickoff-prompts.md && test -f skills/gaud-mode/references/dogfooding.md`

**Step 1: Create the reference-doc scaffold**

Add the `references/` files listed above so `SKILL.md` can stop carrying every operating detail inline.

**Step 2: Rewrite the main skill as the dispatcher**

Turn `skills/gaud-mode/SKILL.md` into a shorter entrypoint that explains when to use gaud, the operating loop, the hard gates, the role map, and which reference file to consult next.

**Step 3: Verify the new files exist**

Run: `test -f skills/gaud-mode/references/personas.md && test -f skills/gaud-mode/references/milestone-loop.md && test -f skills/gaud-mode/references/markdown-plan-template.md && test -f skills/gaud-mode/references/kickoff-prompts.md && test -f skills/gaud-mode/references/dogfooding.md`
Expected: exit 0

### Task 5: Write the persona model and provider routing rules

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Modify: `skills/gaud-mode/references/personas.md`
- Test: `rg -n "CEO/PM|TPM|Investigator|UX/UI|Implementer|Integrator|Dogfooder|Claude|Gemini|Codex|OpenCode" skills/gaud-mode/SKILL.md skills/gaud-mode/references/personas.md`

**Step 1: Define each gaud persona clearly**

In `skills/gaud-mode/references/personas.md`, give each role a short mission, ownership boundary, stop conditions, callback behavior, and default provider bias.

**Step 2: Merge BMAD and Spec-Kit ideas without copying their labels**

Use BMAD-style role sharpness for prompt tone and accountability, but keep gaud-native role names and a lighter tmux-first execution model.

**Step 3: Add explicit provider routing defaults**

Document this default map unless the user overrides it:

```text
CEO/PM conductor -> current session
TPM / investigator -> Claude
UX/UI frontend engineer -> Gemini
Implementer -> Codex
Integrator / overflow -> OpenCode
Dogfooder -> real humans
```

**Step 4: Verify the persona language is present**

Run: `rg -n "CEO/PM|TPM|Investigator|UX/UI|Implementer|Integrator|Dogfooder|Claude|Gemini|Codex|OpenCode" skills/gaud-mode/SKILL.md skills/gaud-mode/references/personas.md`
Expected: matches in both files for the new role system

### Task 6: Replace round-based orchestration with a milestone loop

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Modify: `skills/gaud-mode/references/milestone-loop.md`
- Modify: `skills/gaud-mode/references/dogfooding.md`
- Test: `rg -n "milestone|DONE criteria|dogfood|fresh agent|fresh context|user-testable|CEO/PM" skills/gaud-mode/SKILL.md skills/gaud-mode/references/milestone-loop.md skills/gaud-mode/references/dogfooding.md`

**Step 1: Define the canonical gaud loop**

Document the required order:

```text
CEO/PM -> clarify outcome and DONE criteria
TPM -> break one milestone into small tickets
Agents -> implement the current milestone only
Dogfooders -> test user-testable milestone output
CEO/PM -> review feedback and decide accept, rework, or next milestone
```

**Step 2: Remove the stale-context preference**

Replace the current stable-pane guidance with a fresh-agent rule that keeps only the conductor stable across milestones while relaunching specialists after each accepted milestone.

**Step 3: Add frequent check-back rules**

Require check-backs at ticket completion, milestone readiness, dogfooding handoff, and milestone decision time instead of waiting for long one-shot runs.

**Step 4: Restrict dogfooding to user-testable milestones**

Document that internal-only work can stay inside the milestone until it yields something a human can exercise.

**Step 5: Verify the milestone-loop language is present**

Run: `rg -n "milestone|DONE criteria|dogfood|fresh agent|fresh context|user-testable|CEO/PM" skills/gaud-mode/SKILL.md skills/gaud-mode/references/milestone-loop.md skills/gaud-mode/references/dogfooding.md`
Expected: matches across all three files

### Task 7: Add the markdown execution plan and kickoff templates

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Modify: `skills/gaud-mode/references/markdown-plan-template.md`
- Modify: `skills/gaud-mode/references/kickoff-prompts.md`
- Test: `rg -n "# <Project> Execution Plan|## PRD|## Milestone|## Dogfooding Gate|Check-back trigger|GAUDMODE" skills/gaud-mode/SKILL.md skills/gaud-mode/references/markdown-plan-template.md skills/gaud-mode/references/kickoff-prompts.md`

**Step 1: Add the markdown plan schema**

Document one required plan format with sections for PRD, success metrics, DONE criteria, milestone status, tickets, dogfooding gates, and PM decisions.

**Step 2: Add small-ticket rules**

Teach the TPM to keep tickets narrow, testable, and easy to steer, with explicit deliverables and check-back triggers.

**Step 3: Add role-specific kickoff prompts**

Provide short startup prompt templates for CEO/PM, TPM, investigator, UX/UI, implementer, and integrator so specialists know exactly what to do, when to stop, and how to report back.

**Step 4: Verify the markdown-plan and kickoff text is present**

Run: `rg -n "# <Project> Execution Plan|## PRD|## Milestone|## Dogfooding Gate|Check-back trigger|GAUDMODE" skills/gaud-mode/SKILL.md skills/gaud-mode/references/markdown-plan-template.md skills/gaud-mode/references/kickoff-prompts.md`
Expected: matches for the plan schema and callback language

### Task 8: Rewrite the entrypoint sections that currently encourage long runs

**Files:**
- Modify: `skills/gaud-mode/SKILL.md`
- Test: `rg -n "milestone runner|check back|small tasks|fresh specialists|do not one-shot|dogfooding" skills/gaud-mode/SKILL.md`

**Step 1: Update the overview and core principle**

Describe gaud as a supervised milestone runner that deliberately interrupts for review rather than as an orchestrator that should simply fan out and integrate in long rounds.

**Step 2: Update the role guidance and check-in sections**

Replace `orchestrator`, `designer`, and `reviewer` framing where needed so the entrypoint matches the new gaud-native role map and milestone check-back cadence.

**Step 3: Update quick reference and examples**

Make the examples show DONE-first planning, one current milestone, human dogfooding for user-testable work, and fresh specialist relaunches for the next milestone.

**Step 4: Verify the new entrypoint language is present**

Run: `rg -n "milestone runner|check back|small tasks|fresh specialists|do not one-shot|dogfooding" skills/gaud-mode/SKILL.md`
Expected: positive matches for the new operating model

### Task 9: Re-run focused verification after the edit

**Files:**
- Modify: any of the files above if verification finds gaps
- Test: targeted JSON and keyword checks

**Step 1: Re-check JSON validity**

Run: `python3 -m json.tool skills/gaud-mode/evals/evals.json >/dev/null`
Expected: exit 0

**Step 2: Re-check the new milestone and persona keywords**

Run: `rg -n "CEO/PM|TPM|Dogfooder|DONE criteria|user-testable|fresh agent|markdown plan|OpenCode" skills/gaud-mode/SKILL.md skills/gaud-mode/references/*.md skills/gaud-mode/evals/evals.json`
Expected: matches across the entrypoint, reference docs, and evals

**Step 3: Re-check that the old stable-context bias is gone**

Run: `rg -n "Stable panes reduce repeated setup cost and preserve short-term context" skills/gaud-mode/SKILL.md skills/gaud-mode/references/*.md`
Expected: no matches

**Step 4: Fix only the failing areas and rerun the relevant check**

If any verification command fails, tighten the affected markdown or eval text and rerun just that command until it passes.

## Execution Notes

- Keep edits ASCII-only.
- Prefer short, scan-friendly prose over giant paragraphs.
- Do not preserve old terms just for backward comfort if they conflict with the new operating model.
- Preserve alias handling for `gaud`, `god-mode`, `godmode`, and `god`.
- Keep tmux operational details available, but move most of them out of the main `SKILL.md` body so the entrypoint stays under control.
