# Things 3 Integration Surfaces

## Read vs Write

`things-cli` is read-only. Use it for:
- `search`
- built-in lists like `today`, `upcoming`, `deadlines`, `logbook`
- exports with `--json`, `--csv`, `--opml`, `--gantt`
- recursive structure inspection for areas and projects

Important identifier mapping:
- `things-cli` structured output usually exposes `uuid`
- Things URL commands and AppleScript examples often call the same value `id`
- treat the `uuid` returned by `things-cli` as the ID to feed into update/show flows

Do not use `things-cli` for create, update, move, complete, cancel, or delete operations.

## Things URL Scheme

Best for:
- creating to-dos with `add`
- creating projects with `add-project`
- updating existing to-dos with `update`
- updating existing projects with `update-project`
- batch create/update with `json`
- opening a list or item with `show`
- invoking search UI with `search`

Key rules:
- create commands do not require `auth-token`
- update commands require `auth-token`
- prefer exact `id` / `list-id` / `area-id` / `heading-id` over fuzzy names
- `tags`, `list`, `area`, and `heading` name-based parameters depend on existing Things objects; verify them when correctness matters
- arrays map differently depending on field:
  - `tags`, `add-tags`, `filter` -> comma separated
  - `titles`, `to-dos`, checklist fields -> newline separated
  - `data` -> compact JSON string

Examples:

```bash
python3 skills/things-cli/scripts/things_url.py add \
  --params-json '{"title":"Buy milk","when":"today","tags":["Errand"],"reveal":true}' \
  --open

python3 skills/things-cli/scripts/things_url.py update \
  --params-json '{"id":"ITEM_ID","auth-token":"TOKEN","completed":true,"reveal":true}' \
  --open
```

## AppleScript

Best for:
- deleting or trashing items
- moving items when URL updates are not practical
- exact Mac automation against Things 3
- emptying trash, only with explicit user consent

Key rules:
- use exact object resolution before mutating
- built-in list names are localized
- avoid broad commands like `empty trash` unless the user explicitly requested global purge behavior

Example: move a to-do to Today

```bash
osascript <<'APPLESCRIPT'
tell application "Things3"
  set targetTodo to to do named "Buy milk"
  move targetTodo to list "Today"
end tell
APPLESCRIPT
```

Example: delete a to-do

```bash
osascript <<'APPLESCRIPT'
tell application "Things3"
  delete (to do named "Temporary errand")
end tell
APPLESCRIPT
```

## Shortcuts

Best for:
- user-owned automations already expressed as Shortcuts
- cross-device flows
- richer supported actions like Find, Edit, Duplicate, Delete, Open List, or Run Things URL

Useful commands:

```bash
shortcuts list
shortcuts run "Things Cleanup"
```

If the workflow depends on a non-existent shortcut, say so. Do not pretend that a named shortcut already exists.
