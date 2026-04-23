# Repo-wide Binary Version Visibility and Rebuild Checks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add repo-wide binary version visibility and reliable update/rebuild checks, starting with `packages/gaud-poll`, without introducing a second hand-maintained version source.

**Architecture:** For binaries under `packages/*`, treat `package.json`'s `version` field as the only semantic version source. For standalone skills under `skills/*`, keep the existing committed `VERSION` file pattern. During binary builds, generate build metadata (version + fingerprint of build inputs) as an output artifact, then have install/update scripts compare current source inputs against that metadata so they can skip, warn, or rebuild deterministically.

**Tech Stack:** Bun CLI/tests, Bun compiled binary output, Bash install/update scripts, markdown docs, generated JSON/TS build metadata.

---

## Why this plan fits the current codebase

- `packages/gaud-poll` already builds a compiled binary with `bun build --compile src/cli.ts --outfile bin/gaud-poll` from `packages/gaud-poll/package.json:13-16`.
- `skills/gaud-mode/bin/gaud-poll-install:21-80` already owns discovery, build, and PATH linking for `gaud-poll`, so it is the natural place for rebuild checks.
- `skills/gaud-mode/bin/gaud-mode-upgrade:110-140` already eagerly reconciles `gaud-poll` after skill upgrades.
- `skills/gaud-mode/VERSION` + `gaud-mode-update-check` already establish a repo precedent for canonical version checks on non-package artifacts.
- `packages/worktree-cli/src/cli.ts:15-20` currently duplicates version state with `const VERSION = '0.1.0'` while `packages/worktree-cli/package.json:3` says `0.1.4`, which is exactly the kind of drift this rollout should prevent.

## PRD

- A user can run `gaud-poll --version` (and `-v`) and get a clear, stable answer.
- `gaud-poll-install` can tell whether the existing compiled binary is current, stale, or missing.
- A normal gaud invocation can cheaply verify whether `gaud-poll` needs a rebuild instead of blindly forcing one every time.
- The rebuild decision catches both semver bumps and source changes that forgot to bump semver.
- Repo-wide rollout uses one semantic-version source per artifact category:
  - `packages/*` binaries → `package.json.version`
  - `skills/*` installable skills → committed `VERSION`
- No new committed `VERSION` file is added under `packages/gaud-poll`.

## Program DONE Criteria

- `packages/gaud-poll` exposes a version flag and emits generated build metadata during build.
- `skills/gaud-mode/bin/gaud-poll-install` skips rebuild when the binary fingerprint matches, rebuilds when it does not, and still honors `--force`.
- The preferred `gaud-poll` path in `skills/gaud-mode/SKILL.md` documents the version/rebuild preflight clearly.
- `packages/worktree-cli` has a follow-up rollout ticket to remove its inline `VERSION` constant and adopt the same pattern.
- Tests exist for CLI version output and install-script stale/current decisions.

## Current Milestone

**Milestone:** Make `gaud-poll` the pilot binary for version visibility and stale-build detection.

**Milestone DONE Criteria:**

- `gaud-poll --version` prints the package version.
- `gaud-poll build` emits machine-readable build metadata derived from source inputs.
- `gaud-poll-install` rebuilds when metadata is missing or stale and skips when it is current.
- `gaud-mode` docs point at the rebuild-aware install path.
- Verification commands pass locally.

## Tickets

1. Add failing tests for `gaud-poll` version visibility and build metadata.
2. Generate build metadata from `gaud-poll` source inputs and wire `--version`.
3. Make `gaud-poll-install` rebuild-aware instead of binary-exists-aware.
4. Update `gaud-mode` docs to describe the new preflight.
5. Write the repo-wide follow-up ticket for `worktree-cli` and future binaries.

## Recommended Architecture

### Canonical version sources

- **Packages (`packages/*`)**: `package.json.version` is the canonical semantic version.
- **Skills (`skills/*`)**: committed `VERSION` file remains canonical.
- **Generated build metadata**: not a source of truth; it is a cache of the current source version plus a build fingerprint.

### For `gaud-poll`

Generate a small metadata file during build, for example:

`packages/gaud-poll/bin/gaud-poll.build.json`

```json
{
  "name": "@builtby.win/gaud-poll",
  "version": "0.1.0",
  "fingerprint": "sha256:...",
  "builtAt": "2026-04-22T00:00:00.000Z"
}
```

Where `fingerprint` is computed from the exact inputs that should trigger rebuilds:

- `packages/gaud-poll/package.json`
- `packages/gaud-poll/tsconfig.json`
- `packages/gaud-poll/bun.lock`
- every `packages/gaud-poll/src/**/*.ts`

That gives two separate but compatible checks:

- **Version visibility** → human-facing semver from `package.json.version`
- **Rebuild need** → machine-facing fingerprint from real source inputs

### Shared repo rule after the pilot

After `gaud-poll` lands, extract the metadata/fingerprint helper into a shared repo script, for example:

- Create: `scripts/package-build-meta.mjs`

That script should support:

- `write <package-dir> <output-file>`
- `print-version <package-dir>`
- `print-fingerprint <package-dir>`

Then future binaries (`worktree-cli`, anything else under `packages/*`) can use the same helper without inventing local parsing logic.

This avoids duplicate version sources because the helper always reads `package.json`; it never stores a second committed semver file.

---

### Task 1: Add the failing version/build-contract tests for `gaud-poll`

**Files:**
- Modify: `packages/gaud-poll/package.json:13-16`
- Create: `packages/gaud-poll/src/version.test.ts`
- Create: `packages/gaud-poll/src/cli-version.test.ts`
- Create: `skills/gaud-mode/evals/gaud-poll-install.test.sh`

**Step 1: Write the failing unit test for version resolution**

Create `packages/gaud-poll/src/version.test.ts` with assertions that the version helper reads the semantic version from package metadata and that the fingerprint changes when relevant inputs change.

Example skeleton:

```ts
import { describe, expect, test } from "bun:test";
import { getBuildInfo, computeFingerprint } from "./version";

describe("version/build info", () => {
  test("reads semantic version from package metadata", async () => {
    const info = await getBuildInfo();
    expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("fingerprint includes source inputs", async () => {
    const fingerprint = await computeFingerprint();
    expect(fingerprint).toMatch(/^sha256:/);
  });
});
```

**Step 2: Write the failing CLI test for `--version`**

Create `packages/gaud-poll/src/cli-version.test.ts`.

Prefer a subprocess-style assertion so the test covers the real command surface:

```ts
import { describe, expect, test } from "bun:test";

describe("gaud-poll CLI version flag", () => {
  test("prints the package version", async () => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "--version"], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^gaud-poll \d+\.\d+\.\d+$/);
  });
});
```

**Step 3: Write the failing shell test for rebuild decisions**

Create `skills/gaud-mode/evals/gaud-poll-install.test.sh` that verifies the current script is too naive, then locks in the desired behavior.

Test cases:

- existing binary + matching metadata → script prints `already current` and exits 0
- existing binary + missing metadata → script rebuilds
- existing binary + stale fingerprint → script rebuilds
- `--force` → script rebuilds even when current

**Step 4: Wire test commands into the package**

Update `packages/gaud-poll/package.json` to add a real test entry, for example:

```json
"scripts": {
  "build": "bun run scripts/build-gaud-poll.mjs",
  "dev": "bun run src/cli.ts",
  "test": "bun test"
}
```

**Step 5: Run the new tests to verify they fail first**

Run:

```bash
cd packages/gaud-poll && bun test src/version.test.ts src/cli-version.test.ts
bash skills/gaud-mode/evals/gaud-poll-install.test.sh
```

Expected: failures for missing `./version` module, missing `--version`, and install script still treating `-x bin/gaud-poll` as the only freshness check.

**Step 6: Commit**

```bash
git add packages/gaud-poll/package.json packages/gaud-poll/src/version.test.ts packages/gaud-poll/src/cli-version.test.ts skills/gaud-mode/evals/gaud-poll-install.test.sh
git commit -m "test: lock gaud-poll version and rebuild behavior"
```

---

### Task 2: Generate build metadata from `gaud-poll` inputs

**Files:**
- Create: `packages/gaud-poll/scripts/build-gaud-poll.mjs`
- Create: `packages/gaud-poll/src/version.ts`
- Modify: `packages/gaud-poll/package.json:13-16`
- Likely gitignore or treat as generated: `packages/gaud-poll/bin/gaud-poll.build.json`

**Step 1: Write the minimal build helper**

Create `packages/gaud-poll/scripts/build-gaud-poll.mjs` to:

1. read `package.json`
2. collect the fingerprint inputs
3. hash them
4. run `bun build --compile src/cli.ts --outfile bin/gaud-poll`
5. write `bin/gaud-poll.build.json`

Keep it simple; do not introduce a repo-wide helper yet.

Suggested shape:

```js
import { createHash } from "node:crypto";
import { globSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

// read package.json, tsconfig, bun.lock, src/**/*.ts
// hash contents in deterministic sorted order
// run bun build
// write bin/gaud-poll.build.json
```

**Step 2: Add a small runtime helper**

Create `packages/gaud-poll/src/version.ts`.

Responsibilities:

- expose `getBuildInfo()` for the CLI
- expose `computeFingerprint()` for tests/build helper reuse if useful
- keep the public return shape boring:

```ts
export interface BuildInfo {
  name: string;
  version: string;
  fingerprint: string;
  builtAt?: string;
}
```

For the first pass, it is fine for `getBuildInfo()` to read from `package.json` and from the generated `bin/gaud-poll.build.json` when present.

**Step 3: Update the build script**

Replace the current `build` command in `packages/gaud-poll/package.json` so all future builds produce metadata automatically.

**Step 4: Run the focused tests**

Run:

```bash
cd packages/gaud-poll && bun test src/version.test.ts
cd packages/gaud-poll && bun run build
```

Expected: `version.test.ts` passes, and `bin/gaud-poll.build.json` exists after build.

**Step 5: Commit**

```bash
git add packages/gaud-poll/package.json packages/gaud-poll/scripts/build-gaud-poll.mjs packages/gaud-poll/src/version.ts
git commit -m "feat: generate gaud-poll build metadata"
```

---

### Task 3: Expose `gaud-poll --version`

**Files:**
- Modify: `packages/gaud-poll/src/cli.ts:11-48`
- Reuse: `packages/gaud-poll/src/version.ts`
- Test: `packages/gaud-poll/src/cli-version.test.ts`

**Step 1: Make the version test fail in the exact way you expect**

Run:

```bash
cd packages/gaud-poll && bun test src/cli-version.test.ts
```

Expected: failure because `--version` is not recognized yet.

**Step 2: Add `version` parsing before command dispatch**

In `packages/gaud-poll/src/cli.ts`, extend the parser options with:

```ts
version: { type: "boolean", short: "v" }
```

Then handle it before command selection:

```ts
if (values.version) {
  const info = await getBuildInfo();
  console.log(`gaud-poll ${info.version}`);
  process.exit(0);
}
```

Also update `printUsage()` to document `-v, --version`.

**Step 3: Run the targeted tests**

Run:

```bash
cd packages/gaud-poll && bun test src/cli-version.test.ts src/version.test.ts
```

Expected: both pass.

**Step 4: Commit**

```bash
git add packages/gaud-poll/src/cli.ts packages/gaud-poll/src/cli-version.test.ts packages/gaud-poll/src/version.ts
git commit -m "feat: expose gaud-poll version"
```

---

### Task 4: Make `gaud-poll-install` rebuild-aware

**Files:**
- Modify: `skills/gaud-mode/bin/gaud-poll-install:44-64`
- Modify if needed: `skills/gaud-mode/bin/gaud-mode-upgrade:110-140`
- Test: `skills/gaud-mode/evals/gaud-poll-install.test.sh`

**Step 1: Run the failing shell test first**

Run:

```bash
bash skills/gaud-mode/evals/gaud-poll-install.test.sh
```

Expected: failure because the current installer only checks whether `bin/gaud-poll` exists.

**Step 2: Add a `needs_rebuild` helper to the installer**

Keep the Bash script boring. Recommended decision tree:

1. if `--force` → rebuild
2. if binary missing → rebuild
3. if metadata missing → rebuild
4. read source version from `package.json`
5. read built version + fingerprint from `bin/gaud-poll.build.json`
6. recompute current fingerprint with the package build helper
7. if version mismatch or fingerprint mismatch → rebuild
8. otherwise print `gaud-poll already current at ...`

Pragmatic implementation detail for this repo:

- use `bun "$PKG_DIR/scripts/build-gaud-poll.mjs" --print-current` or a small sibling helper to avoid reimplementing hashing in Bash
- do **not** add a second committed version file for the package

**Step 3: Keep `gaud-mode-upgrade` simple**

`skills/gaud-mode/bin/gaud-mode-upgrade` can continue calling `gaud-poll-install --force` after a successful skill refresh. The smarter stale check matters most for normal invocation and local repo-checkout workflows.

Only change `gaud-mode-upgrade` if you need clearer stderr messaging.

**Step 4: Run verification**

Run:

```bash
bash skills/gaud-mode/evals/gaud-poll-install.test.sh
cd packages/gaud-poll && bun run build
```

Expected: install-script test passes, build still produces the compiled binary plus metadata.

**Step 5: Commit**

```bash
git add skills/gaud-mode/bin/gaud-poll-install skills/gaud-mode/bin/gaud-mode-upgrade skills/gaud-mode/evals/gaud-poll-install.test.sh
git commit -m "feat: rebuild gaud-poll only when stale"
```

---

### Task 5: Document the new preflight in gaud-mode

**Files:**
- Modify: `skills/gaud-mode/SKILL.md:120-126`
- Modify: `README.md:52-58`
- Modify: `packages/gaud-poll/README.md`

**Step 1: Update `SKILL.md` preferred-path wording**

Change the preferred path from simply “run `gaud-poll watch ...`” to:

- verify/install the current `gaud-poll` binary via `gaud-poll-install`
- then run `gaud-poll watch ...`

Keep the fallback wording intact.

**Step 2: Update root README setup notes**

Clarify that:

- skill updates still come from `skills/gaud-mode/VERSION`
- companion binary freshness comes from `packages/gaud-poll/package.json` + generated build metadata

**Step 3: Update package README**

Document:

- `gaud-poll --version`
- the meaning of rebuild checks
- when `gaud-poll-install --force` is still useful

**Step 4: Sanity-check docs**

Run:

```bash
grep -n "gaud-poll" skills/gaud-mode/SKILL.md README.md packages/gaud-poll/README.md
```

Expected: docs consistently mention version visibility and rebuild-aware install behavior.

**Step 5: Commit**

```bash
git add skills/gaud-mode/SKILL.md README.md packages/gaud-poll/README.md
git commit -m "docs: explain gaud-poll version and rebuild checks"
```

---

### Task 6: Queue the repo-wide follow-up after the pilot lands

**Files:**
- Modify later: `packages/worktree-cli/src/cli.ts:15-20`
- Modify later: `packages/worktree-cli/package.json:19-26`
- Create later: `scripts/package-build-meta.mjs`
- Create later: `packages/worktree-cli/src/version.ts`
- Create later: `packages/worktree-cli/src/cli-version.test.ts`

**Step 1: Remove the known duplicate-version smell in `worktree-cli`**

After the `gaud-poll` pilot proves out, replace `const VERSION = '0.1.0'` in `packages/worktree-cli/src/cli.ts` with a helper that reads the package version from one place.

**Step 2: Extract the shared helper only after the second adopter exists**

Do not prematurely centralize before `gaud-poll` works. Once `worktree-cli` is ready, extract the package metadata/fingerprint logic into `scripts/package-build-meta.mjs` and migrate both packages onto it.

**Step 3: Add the same contract to every future binary**

Rule for future `packages/*` binaries:

- `--version` must exist
- build must emit metadata
- installer must compare metadata before rebuilding
- no committed `VERSION` file under `packages/*`

**Step 4: Commit the rollout separately**

```bash
git commit -m "refactor: standardize package binary version metadata"
```

---

## Verification Checklist for the implementation session

Run all of these before calling the work complete:

```bash
cd packages/gaud-poll && bun test
cd packages/gaud-poll && bun run build
bash skills/gaud-mode/evals/gaud-poll-install.test.sh
bash skills/gaud-mode/evals/update-check-path.test.sh
```

If the implementation touches TypeScript compiler settings or introduces JSON imports, also run:

```bash
cd packages/gaud-poll && bunx tsc --noEmit
```

## Recommended implementation order

1. tests for `gaud-poll` version/build contract
2. local `gaud-poll` build metadata generator
3. `gaud-poll --version`
4. rebuild-aware `gaud-poll-install`
5. docs
6. later shared helper + `worktree-cli` adoption

## Non-goals for this milestone

- Do not add a second committed version file under `packages/gaud-poll`.
- Do not build a root-level monorepo toolchain just to support one binary.
- Do not force `worktree-cli` migration in the same change as the `gaud-poll` pilot.
- Do not try to make gaud-mode’s remote skill update checker also fetch package versions from GitHub in this milestone.

Plan complete and saved to `docs/plans/2026-04-22-repo-binary-version-visibility-and-rebuild-checks.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
