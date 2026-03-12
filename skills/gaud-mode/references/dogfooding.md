# Dogfooding

Dogfooding is required only for user-testable milestones.

## What Counts As User-Testable

A milestone is user-testable when a real human can exercise the output directly,
such as:
- a UI flow
- a CLI workflow with visible behavior
- an interaction change with observable results
- a content or copy change a human can judge in context

Internal refactors, plumbing, or invisible infrastructure work are not
user-testable until they produce something a human can exercise.

## Who Dogfoods

- Preferred dogfooders: real humans, including the user, stakeholders, or a
  teammate acting as the target user
- Agents can help prepare scenarios, but agents do not replace human dogfooding

## Must-Pass Outcomes

Before a user-testable milestone is accepted, dogfooding should confirm:
- the main scenario works end to end
- the behavior matches the milestone DONE criteria
- no obvious blocker or severe confusion remains
- the PM has enough signal to accept or request rework

## Feedback Format

Ask dogfooders to report in plain text:
- What I tried:
- What happened:
- What felt wrong:
- Severity: blocker | major | minor | nit

Keep feedback grounded in real usage, not speculative redesign.

## PM Decision Rule

After dogfooding, the `CEO/PM` must decide one of:
- `accepted`: milestone is done and specialists can be retired
- `rework`: milestone returns to small-ticket execution
- `blocked`: milestone needs an external choice or missing dependency

Do not start the next milestone until that decision is made.

## Fresh Context After Acceptance

When a user-testable milestone is accepted:
- clean up the gaud-created specialist panes for that milestone
- keep only the conductor stable
- launch fresh specialists for the next milestone with the updated plan context
