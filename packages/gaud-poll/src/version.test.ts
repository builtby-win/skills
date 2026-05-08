import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { computeFingerprint, getBuildInfo } from "./version";

const TEMP_DIRS: string[] = [];
const PACKAGE_DIR = join(import.meta.dir, "..");

afterEach(async () => {
  while (TEMP_DIRS.length > 0) {
    const tempDir = TEMP_DIRS.pop();
    if (!tempDir) {
      continue;
    }

    await rm(tempDir, { force: true, recursive: true });
  }
});

describe("build info", () => {
  test("falls back to package inputs when runtime metadata is absent", async () => {
    const packageDir = await createFixturePackage();

    const info = await getBuildInfo({
      executablePath: join(packageDir, "bin", "gaud-poll"),
      packageDir,
    });

    expect(info).toMatchObject({
      name: "@builtby.win/gaud-poll",
      version: "1.2.3",
    });
    expect(info.fingerprint).toMatch(/^sha256:/);
  });

  test("prefers metadata adjacent to the compiled binary when available", async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), "gaud-poll-runtime-"));
    TEMP_DIRS.push(runtimeDir);

    const executablePath = join(runtimeDir, "bin", "gaud-poll");
    const metadataPath = join(runtimeDir, "bin", "gaud-poll.build.json");

    await mkdir(dirname(executablePath), { recursive: true });
    await writeFile(
      executablePath,
      ["#!/usr/bin/env bash", "printf 'gaud-poll 9.9.9\\n'"].join("\n") + "\n"
    );
    await chmod(executablePath, 0o755);
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          name: "@builtby.win/gaud-poll",
          version: "9.9.9",
          fingerprint: "sha256:compiled-runtime",
        },
        null,
        2
      ) + "\n"
    );

    const info = await getBuildInfo({
      executablePath,
      packageDir: join(runtimeDir, "missing-package"),
    });

    expect(info).toEqual({
      name: "@builtby.win/gaud-poll",
      version: "9.9.9",
      fingerprint: "sha256:compiled-runtime",
    });
  });

  test("changes the fingerprint when a tracked input changes", async () => {
    const packageDir = await createFixturePackage();

    const before = await computeFingerprint({ packageDir });
    await writeFile(join(packageDir, "src", "extra.ts"), "export const value = 2;\n");
    const after = await computeFingerprint({ packageDir });

    expect(after).not.toBe(before);
  });

  test("build writes machine-readable metadata next to the compiled binary", async () => {
    const proc = Bun.spawn(["bun", "run", "build"], {
      cwd: PACKAGE_DIR,
      stderr: "pipe",
      stdout: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect({ exitCode, stderr, stdout }).toMatchObject({ exitCode: 0 });

    const metadataText = await readFile(join(PACKAGE_DIR, "bin", "gaud-poll.build.json"), "utf8");
    const metadata = JSON.parse(metadataText) as {
      fingerprint?: string;
      name?: string;
      version?: string;
    };

    expect(metadata).toMatchObject({
      name: "@builtby.win/gaud-poll",
      version: "0.2.2",
    });
    expect(metadata.fingerprint).toMatch(/^sha256:/);
  });
});

async function createFixturePackage(): Promise<string> {
  const packageDir = await mkdtemp(join(tmpdir(), "gaud-poll-package-"));
  TEMP_DIRS.push(packageDir);

  await mkdir(join(packageDir, "src"), { recursive: true });
  await writeFile(
    join(packageDir, "package.json"),
    JSON.stringify(
      {
        name: "@builtby.win/gaud-poll",
        version: "1.2.3",
      },
      null,
      2
    ) + "\n"
  );
  await writeFile(join(packageDir, "tsconfig.json"), '{"compilerOptions":{"strict":true}}\n');
  await writeFile(join(packageDir, "bun.lock"), "lockfile-version = 1\n");
  await writeFile(join(packageDir, "src", "cli.ts"), "export const command = 'watch';\n");

  return packageDir;
}
