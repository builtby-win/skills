---
name: create-pr
description: Create a Pull Request for the current issue branch
---

# PR - Create Pull Request

Create a PR that links to and closes the current issue, with optional screenshot support.

## When to Use

- After implementation is complete
- Claude should run this AUTOMATICALLY when implementation is done
- Can also be invoked manually with `/pr`

## Workflow

### Pre-flight Checks

BEFORE capturing screenshots or creating PR, run these checks:

```bash
# Run typecheck (if project has it)
echo "🔍 Running typecheck..."
npm run typecheck  # or pnpm/yarn equivalent

if [ $? -ne 0 ]; then
  echo "❌ Typecheck failed. Fix type errors before creating PR."
  echo "Hint: Review errors and fix manually."
  exit 1
fi

# Run lint (if project has it)
echo "🔍 Running lint..."
npm run lint  # or pnpm/yarn equivalent

if [ $? -ne 0 ]; then
  echo "❌ Lint errors found."
  echo "💡 Try running auto-fix command if available (e.g., 'npm run check')."
  echo "Then review remaining errors and fix manually."
  exit 1
fi

echo "✅ Pre-flight checks passed - proceeding to PR creation"
```

**Note**: Adjust the commands (`npm`/`pnpm`/`yarn`, `typecheck`/`lint`) based on your project's configuration.

**If checks fail:**
1. For auto-fixable issues: Run your project's auto-fix command
2. For remaining issues: Fix manually
3. Re-run checks before proceeding

### Step 0: Capture Screenshot (Optional - Project Specific)

**Note**: This step is optional and depends on your project having:
- A web UI to screenshot
- Session authentication that can be imported
- Chrome DevTools MCP integration

If your project supports it:

1. **Ask user for session token:**
   Example: "Would you like me to capture a screenshot of the changes? If so, please provide your session token from https://yourproject.com/dev/session"

2. **If user provides token, capture screenshot:**

   a. Ensure dev server is running

   b. Navigate to session import page and import token

   c. Navigate to the relevant page (e.g., dashboard, feature page)

   d. Take screenshot: `.github/pr-screenshots/pr-{issue-number}.png`

   e. Commit the screenshot:
   ```bash
   mkdir -p .github/pr-screenshots
   git add .github/pr-screenshots/pr-{N}.png
   git commit -m "docs: add screenshot for PR"
   ```

3. **If user declines or project doesn't support it**, skip to Step 1.

### Step 1: Detect Issue from Branch

```bash
git branch --show-current
```

Parse the branch name to extract issue number:
- Pattern: `{PROJECT_PREFIX}/issue-{N}-*`
- Example: `myproject/issue-15-dark-mode` → Issue #15

If not on an issue branch, ask user which issue this PR is for.

### Step 2: Fetch Issue Details

```bash
gh issue view {N} --json title,body
```

### Step 3: Ensure Commits are Pushed

```bash
git push
```

### Step 4: Generate PR Summary

Create a summary from:
- The commits on this branch: `git log main..HEAD --oneline`
- The issue description
- Or ask user for summary if unclear

### Step 5: Create PR

```bash
gh pr create \
  --title "feat: {issue title}" \
  --body "Closes #{N}

## Summary
{brief summary of changes}

## Changes
{list key changes or auto-generate from commits}

## Screenshot
{If screenshot was captured in Step 0, include:}
![Screenshot](.github/pr-screenshots/pr-{N}.png)

{If no screenshot, omit this section}

## Test Plan
- [ ] Manual testing completed
- [ ] Build passes
- [ ] No regressions
" \
  --base main
```

### Step 6: Update Issue Label

```bash
gh issue edit {N} --remove-label "status:in-progress"
gh issue edit {N} --add-label "status:pr-ready"
```

### Step 7: Announce

Output:
```
Created PR #{PR_NUM}: feat: {title}
{PR URL}

Closes #{N}
Status updated: pr-ready

Waiting for review.
```

## PR Title Convention

Match the issue type:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for refactoring
- `style:` for styling changes
- `test:` for test additions

## Notes

- The PR body includes `Closes #N` which auto-closes the issue on merge
- Labels help track which issues have PRs ready for review
- Adjust reviewer assignment based on your team structure

## Configuration

In your project's `CLAUDE.md`, set:

```markdown
## GitHub Workflow Configuration
PROJECT_PREFIX=your-project-name
```

Example configurations:
- `PROJECT_PREFIX=myapp`
- `PROJECT_PREFIX=builtby-win-web`
