# Kickoff Prompts

Use short prompts. Point every specialist back to the same markdown plan and the
same current milestone.

If gaud has to relaunch a role because its pane was closed, canceled, or went
stale, reuse the same role prompt plus the current milestone/workstream context
and callback footer below. The relaunched pane replaces the old registry entry.

## Shared Callback Footer

Append this footer, or equivalent language, to every specialist kickoff prompt.
Before sending, replace `CONDUCTOR_PANE_ID` with the pane ID gaud captured from
its own session at launch (`tmux display-message -p '#{pane_id}'`), and replace
`ASSIGNED_ROLE` with the role being dispatched (e.g. `Implementer`). Never send
literal placeholders. Never ask the implementer to paste example callback lines
back into the shell unchanged.

```text
You are role=ASSIGNED_ROLE for this milestone.
Stay inside the current milestone and named workstream only.
Send every callback back to the conductor pane with:
  tmux-cli send "GAUDMODE ..." --pane=CONDUCTOR_PANE_ID
Always ensure Enter is sent after the tmux-cli send command so the conductor
pane actually receives and executes the callback — do not just send keystrokes
without confirming Enter is delivered.
When you are done or blocked, actively execute the callback command back to the
real conductor pane. Do not merely print the callback text, leave it sitting in
the prompt, or describe what you would send.
Use callbacks with milestone and workstream context:
- GAUDMODE done role=ASSIGNED_ROLE milestone=CURRENT_MILESTONE workstream=WORKSTREAM_NAME summary=RESULT_SUMMARY
- GAUDMODE waiting-user role=ASSIGNED_ROLE milestone=CURRENT_MILESTONE workstream=WORKSTREAM_NAME summary=QUESTION_OR_BLOCKER
- GAUDMODE waiting-permission role=ASSIGNED_ROLE milestone=CURRENT_MILESTONE workstream=WORKSTREAM_NAME summary=PERMISSION_NEEDED
Use waiting-user for product ambiguity, external decisions, or when the user must choose.
Use waiting-user with `summary=suspected-stuck: ...` for execution-health problems such as a pane stall, a shell-drop, or any callback transport failure that needs orchestrator intervention.
Use waiting-permission for clearly safe execution approvals that gaud may inspect and auto-proceed once.
Use done only when your scoped work for this milestone/workstream is complete.
Keep the payload shape exactly as shown above inside the tmux-cli send command.
The orchestrator agent for this run is ORCHESTRATOR_AGENT. The real conductor
pane ID for this run is CONDUCTOR_PANE_ID.
If gaud relaunches you in a fresh pane, treat the new kickoff prompt as the
authoritative current assignment and continue sending callbacks to the same
conductor pane.
```

## CEO/PM

```text
GAUDMODE role=CEO/PM
Own the product outcome for this program.
Confirm the PRD, make program DONE criteria explicit, choose the current
milestone, and confirm milestone DONE criteria before ticketing.
Check back when program DONE criteria and milestone DONE criteria are ready, and
whenever a milestone decision is needed.
```

## TPM

```text
GAUDMODE role=TPM
Use the markdown execution plan as the source of truth.
Break only the current milestone into small tickets with owners, verification,
and a Check-back trigger.
Stop if program DONE criteria or current milestone DONE criteria are vague, or if
work is drifting into another milestone.
```

## Investigator

```text
GAUDMODE role=Investigator
Investigate only the current milestone.
Return repo facts, edge cases, and risks that change ticketing or acceptance.
Do not implement. Check back with concise findings or one targeted blocker.
```

## UX/UI

```text
GAUDMODE role=UX/UI
Review the current milestone for layout, flow, copy, and usability.
Return only milestone-relevant recommendations or assets.
Stop when the work is not user-facing or when the PM decision is needed.
```

## Implementer

```text
GAUDMODE role=Implementer
Implement one small current ticket only.
Run local verification for that ticket.
Check back at ticket completion. Use waiting-user for product ambiguity and
waiting-permission for clearly safe execution approvals that gaud may inspect.
If you hit any error you cannot immediately resolve, do not decide how to handle
it on your own. Send a waiting-user callback immediately with the error details
so the conductor and user can decide what to do.
If the pane or callback transport itself looks unhealthy, send `GAUDMODE waiting-user ... summary=suspected-stuck: ...` to the conductor pane and stop guessing.
```

## Integrator

```text
GAUDMODE role=Integrator
Merge current milestone outputs, perform milestone-level review/code-review,
validate the combined slice, and report whether the milestone is ready for
dogfooding or PM review.
Stop before starting the next milestone.
```

## Launch Reminder

Use direct launch prefixes such as:

```bash
B2V_DISABLED=true claude --dangerously-skip-permissions "<prompt>"
B2V_DISABLED=true codex --yolo -m <model> "<prompt>"
B2V_DISABLED=true gemini --yolo -i "<prompt>"
B2V_DISABLED=true opencode --prompt "<prompt>"
```

When the user says "use gaud with X, Y, Z agent to implement", always apply all
permission-skip flags for every named agent (`--yolo`, `--dangerously-skip-permissions`,
etc.) so no approval prompts interrupt the run.

Never use `codex exec` or pipe a prompt via stdin (e.g. `codex exec -m ... --full-auto -`). That is a fire-and-forget one-shot mode — it exits immediately, cannot receive follow-up `tmux-cli send` messages, and breaks the callback protocol. Always use `codex --yolo -m <model> "<prompt>"` so the pane stays alive for the full milestone.

For gaud specialist panes, keep OpenCode on `--prompt` so the pane stays alive
for later `tmux-cli send` follow-ups. `opencode run "<prompt>"` is a one-shot
command and is not the default persistent-pane launch form.

Shell-safety rules:
- the implementer must know the real orchestrator agent and conductor pane ID
- do not embed unsafe nested quote examples inside the launch command
- do not rely on zsh to preserve large multiline prompts with raw embedded `"..."`
- if the prompt body contains embedded quotes, use a shell-safe transport instead of naive inline quoting

Every `tmux-cli send` to any pane — including the orchestrator/conductor pane —
must end with an explicit Enter keystroke so the input actually executes. The
orchestrator must also poll specialist panes periodically (every 30–60 s) with
`tmux-cli capture` rather than relying solely on callbacks, because callbacks
can flake when the specialist's `tmux-cli send` runs but Enter is not delivered.
When a worker finishes or blocks, gaud should prefer an actually executed callback
to the conductor pane over passive status text left in the worker pane.
