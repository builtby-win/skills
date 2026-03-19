# Agent Instructions

Make no mistakes.

## Git Commits
- Never add generated-by footers or co-authored-by lines to commits
- Keep commit messages clean and conventional

## Learnings

Keep a running record of bug fixes, failure patterns, and reusable lessons in `/learnings`.

- Before fixing a bug or writing an implementation plan, review relevant notes in `/learnings` so you do not repeat the same mistakes and can watch for known patterns.
- After fixing a bug, add or update a note in `/learnings` with the root cause, the fix, and the pattern or warning signs to watch for next time.
- If a plan surfaces a repeat failure mode or a new preventive pattern, document that in `/learnings` too.

## Implementation Plan Tracking

Whenever you create an implementation plan, you **must** file a GitHub issue in the current repository to ensure plans are tracked and have an audit trail.

### How to File a Plan Issue

1. **Create the issue** using the GitHub CLI after producing your plan:
   ```bash
   gh issue create \
     --repo "$(git config --get remote.origin.url | sed 's|.*github.com[:/]\(.*\)\.git|\1|')" \
     --title "Plan: <short description>" \
     --label "plan" \
     --body "$(cat <<'EOF2'
   **Summary**
   <1-3 sentence overview of the plan>

   **Branch/Worktree**
   - Branch: $(git rev-parse --abbrev-ref HEAD)
   - Worktree: $(git rev-parse --git-dir)

   **Plan**
   <full plan content>

   ---
   _Filed by: AI Agent_
   EOF2
   )"
   ```

2. **Include the issue number** in your output so the user can reference it.

3. If the `plan` label doesn't exist, create it first:
   ```bash
   gh label create plan --description "Implementation plans filed by agents" --color 0E8A16 2>/dev/null || true
   ```

## gstack

Use the `/browse` skill from gstack for **all web browsing**. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
- `/plan-ceo-review` - CEO-level plan review
- `/plan-eng-review` - Engineering plan review
- `/review` - Code review
- `/ship` - Ship workflow
- `/browse` - Web browsing (use this instead of chrome MCP tools)
- `/qa` - QA testing
- `/setup-browser-cookies` - Browser cookie setup
- `/retro` - Retrospective
