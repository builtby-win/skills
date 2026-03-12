---
name: things-cli
description: Use when the user wants to read, search, create, update, move, complete, cancel, or delete Things 3 items from an agent or terminal workflow, especially when they mention Things, Things 3, Things3, things-cli, Things URLs, AppleScript, tags, projects, areas, deadlines, checklists, or task CRUD on macOS.
---

# Things CLI

## Overview

Use this skill to interact with Things 3 safely from a CLI-driven agent session.

Treat the available integration surfaces as different tools with different jobs:
- `things-cli` is the preferred read/search/export surface. It is read-only.
- Things URL commands are the preferred create/update surface for to-dos and projects.
- AppleScript is the preferred delete/trash and Mac-only fallback surface.
- Shortcuts is optional when the user already wants a Shortcuts-based workflow.

The critical constraint is simple: do not pretend `things-cli` can mutate data. It cannot.

## When To Use

Use this skill when the user wants to:
- add a task, project, heading, checklist, tag, or note in Things 3
- search Things data from the terminal
- update an existing item's title, notes, tags, dates, status, or parent list
- move items between inbox, areas, projects, today, anytime, someday, logbook, or trash
- delete or trash Things items safely
- build a small Things automation using `things-cli`, Things URLs, `osascript`, or `shortcuts`

Do not use this skill for:
- generic todo apps that are not Things 3
- non-macOS environments where Things integrations are unavailable
- requests that only need a plain text task list with no Things interaction

## Preflight

Before acting, check what is available:

```bash
command -v things-cli osascript shortcuts python3 open
things-cli -h
```

If the task requires updating an existing item through the URL scheme, also check whether `THINGS_AUTH_TOKEN` is already available in the environment.

```bash
python3 - <<'PY'
import os
print('set' if os.environ.get('THINGS_AUTH_TOKEN') else 'missing')
PY
```

If `THINGS_AUTH_TOKEN` is missing:
- for create-only flows, continue without it
- for update flows, prefer AppleScript on macOS when the target can be resolved safely
- ask the user for the token only if the workflow truly requires URL-based updates and AppleScript is not a safe substitute

## Tool Choice

Pick the least risky surface that fits the request:

| Need | Preferred tool |
|---|---|
| Read/search/list/export | `things-cli` |
| Create one or many to-dos | Things URL `add` or `json` |
| Create a project | Things URL `add-project` or `json` |
| Update an existing to-do/project by exact ID | Things URL `update` / `update-project` |
| Delete or trash an item | AppleScript |
| Empty trash | AppleScript, only with explicit user intent |
| Cross-device or existing personal automation | Shortcuts |

## Safety Rules

- Resolve the target item before mutating it.
- Prefer exact item IDs over fuzzy title matches.
- If search returns multiple plausible matches, stop and ask one focused disambiguation question.
- For destructive actions, verify the item's current state first.
- Never run global trash-emptying commands unless the user explicitly asked for that exact destructive action.
- When using localized built-in list names in AppleScript, use the names as they appear in the user's Things UI.
- When using Things URLs, verify destination project/area names and tag names if placement or tagging matters; missing names can be ignored by Things instead of erroring loudly.

## Read Workflows With `things-cli`

Use plain output for quick inspection and `--json` when you need structured data.

Note: when `things-cli` returns structured results, the identifier field is typically `uuid`. Treat that as the Things item ID you can use in URL updates.

Common commands:

```bash
things-cli inbox
things-cli today
things-cli upcoming
things-cli deadlines
things-cli --json search "passport"
things-cli --json --recursive areas
things-cli --csv --recursive all > all.csv
```

Useful filters:

```bash
things-cli --json -p "PROJECT_UUID" today
things-cli --json -a "AREA_UUID" anytime
things-cli --json -t "Errand" todos
```

`-p` and `-a` expect project and area UUIDs, not display names.

Use search first when the user refers to an item by description instead of exact ID.

## Create Workflows

For new to-dos and projects, prefer Things URLs because they are less brittle than UI scripting and support structured input.

If the destination project/area or the requested tags may not already exist, verify them first with `things-cli` or AppleScript instead of assuming Things will create them.

Use the bundled helper to build correctly encoded URLs:

```bash
python3 skills/things-cli/scripts/things_url.py add \
  --params-json '{
    "title": "Book dentist appointment",
    "list": "Health",
    "when": "tomorrow@9:00",
    "tags": ["Health", "Admin"],
    "checklist-items": ["call office", "confirm insurance", "add calendar reminder"],
    "reveal": true
  }' \
  --open
```

Create a project:

```bash
python3 skills/things-cli/scripts/things_url.py add-project \
  --params-json '{
    "title": "Plan summer trip",
    "area": "Personal",
    "when": "anytime",
    "to-dos": ["Pick dates", "Book flights", "Reserve hotel"],
    "reveal": true
  }' \
  --open
```

For nested imports or mixed create/update batches, use the `json` command with a JSON file. See `skills/things-cli/references/things-surfaces.md`.

## Update Workflows

Use this sequence:

1. Search with `things-cli`.
2. Resolve one exact target.
3. Mutate by exact ID.

Example read step:

```bash
things-cli --json search "renew passport"
```

If you have an exact ID and `THINGS_AUTH_TOKEN`, update via Things URL:

```bash
python3 skills/things-cli/scripts/things_url.py update \
  --params-json '{
    "id": "SyJEz273ceSkabUbciM73A",
    "auth-token": "'$THINGS_AUTH_TOKEN'",
    "append-notes": "bring old passport\nprinted photo form",
    "list": "Errands",
    "deadline": "next friday",
    "reveal": true
  }' \
  --open
```

If URL-based update is not practical and AppleScript is safe in context, use AppleScript only after exact target resolution.

## Delete And Trash Workflows

Deletion is not a `things-cli` feature and is not part of the Things URL mutation set. Use AppleScript.

Read state first, then delete only if the guard condition matches.

Example: delete a canceled project only if it is already in Logbook or Trash.

```bash
osascript <<'APPLESCRIPT'
tell application "Things3"
  set targetName to "Old Apartment Search"
  set logbookMatches to every project of list "Logbook" whose name is targetName
  set trashMatches to every project of list "Trash" whose name is targetName
  set eligibleCount to (count of logbookMatches) + (count of trashMatches)

  if eligibleCount is 0 then error "Project not found in Logbook or Trash."
  if eligibleCount > 1 then error "Multiple matching projects found; refusing to guess."

  if (count of trashMatches) is 1 then
    return "No-op: project is already in Trash."
  end if

  delete (item 1 of logbookMatches)
  return "Deleted: moved project from Logbook to Trash."
end tell
APPLESCRIPT
```

If the user wants permanent deletion, explain that item-level purge is not exposed the same way and that `empty trash` is global.

## Shortcuts Guidance

Use Shortcuts when one of these is true:
- the user already has a Things shortcut they want to call
- they want cross-device automation instead of Mac-only AppleScript
- they need richer supported edit/delete flows and prefer the Shortcuts surface

Check available shortcuts with:

```bash
shortcuts list
```

Run a shortcut with:

```bash
shortcuts run "Shortcut Name"
```

If the workflow depends on a custom shortcut that does not exist yet, do not invent it silently. Say so and either create the shortcut with the user or use the URL/AppleScript path instead.

## Common Mistakes

- Treating `things-cli` as writable.
- Updating by fuzzy title without resolving duplicates.
- Forgetting `auth-token` for URL-based updates to existing items.
- Using AppleScript built-in list names that do not match the user's localized app.
- Using `empty trash` to satisfy a request that only asked to delete one item.
- Hand-building Things URLs and breaking encoding for spaces, newlines, tags, or JSON.

## Output Style

When you act for the user:
- say which surface you chose and why
- show the exact command before destructive actions
- mention any prerequisite that blocked a safer path
- summarize what was read or changed in Things terms: item, project, area, tag, date, status

## References

- `skills/things-cli/references/things-surfaces.md` - command matrix, mutation rules, and examples
- `skills/things-cli/scripts/things_url.py` - helper for safely generating and optionally opening Things URLs
