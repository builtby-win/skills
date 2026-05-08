import { describe, expect, test } from "bun:test";

const PACKAGE_DIR = `${import.meta.dir}/..`;

describe("gaud-poll CLI version flags", () => {
  for (const flag of ["--version", "-v"]) {
    test(`prints the package version for ${flag}`, async () => {
      const proc = Bun.spawn(["bun", "run", "src/cli.ts", flag], {
        cwd: PACKAGE_DIR,
        stderr: "pipe",
        stdout: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect({ exitCode, stderr, stdout }).toMatchObject({ exitCode: 0, stderr: "" });
      expect(stdout.trim()).toBe("gaud-poll 0.2.2");
    });
  }
});
