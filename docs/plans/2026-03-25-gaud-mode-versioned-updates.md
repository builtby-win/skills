# Gaud Mode Versioned Update Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `gaud-mode` update reliably from a versioned skill artifact and eagerly install `gaud-poll` during upgrade while preserving lazy runtime fallback.

**Architecture:** Keep `skills/gaud-mode/VERSION` as the source of truth for skill upgrades, keep the lightweight remote version check in `gaud-mode-update-check`, and make `gaud-mode-upgrade` responsible for both refreshing the skill and reconciling companion runtime assets. Treat `gaud-poll` as a companion compiled binary built from `packages/gaud-poll`, installed after successful skill upgrade, and still rechecked at invocation time.

**Tech Stack:** Bash upgrade scripts, Bun-compiled `gaud-poll`, markdown skill docs

---

## PRD

- Users who invoke `gaud-mode` should get a reliable update prompt based on a real semver file.
- When `gaud-mode` upgrades successfully, the install should also ensure `gaud-poll` is present and executable.
- If `bun` is missing or `gaud-poll` cannot be built, `gaud-mode` should warn clearly and continue with the shell polling fallback.
- Repo source checkouts should remain non-self-upgrading development copies.

## Program DONE Criteria

- `skills/gaud-mode/VERSION` remains the canonical version file and is bumped for this behavior change.
- `skills/gaud-mode/bin/gaud-mode-upgrade` eagerly installs `gaud-poll` after successful skill refresh.
- `skills/gaud-mode/bin/gaud-mode-upgrade` soft-fails `gaud-poll` reconciliation when `bun` is unavailable, while `skills/gaud-mode/bin/gaud-poll-install` remains a strict installer command.
- `skills/gaud-mode/SKILL.md` documents eager-on-upgrade plus lazy-on-invocation fallback clearly.
- Targeted verification shows the upgrade/install scripts stay syntactically valid and that the package build command remains intact.

## Current Milestone

**Milestone:** Versioned updater + eager companion binary install

**Milestone DONE Criteria:**

- Upgrade path updates the skill and then reconciles `gaud-poll`.
- Documentation matches the implemented behavior.
- Verification commands pass.

## Tickets

1. Update `gaud-mode` upgrade/install scripts for eager `gaud-poll` install.
2. Bump `skills/gaud-mode/VERSION` for the new upgrade contract.
3. Refresh `skills/gaud-mode/SKILL.md` so the documented flow matches the scripts.
4. Run targeted verification and inspect the diff.

## Dogfooding Gate

- Not required for this milestone because the output is an internal packaging/update flow, not a user-testable product UI.

## PM Decisions

- Chosen behavior: eager install on upgrade, lazy fallback on invocation.
- Keep `gaud-poll` as a companion binary, not a separately versioned product for now.
