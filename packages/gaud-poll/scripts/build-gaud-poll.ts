#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getBuildInfoPathForExecutable, getCurrentBuildInfo } from "../src/version";

const PACKAGE_DIR = join(import.meta.dir, "..");
const BINARY_PATH = join(PACKAGE_DIR, "bin", "gaud-poll");
const BUILD_INFO_PATH = getBuildInfoPathForExecutable(BINARY_PATH);
const mode = Bun.argv[2] ?? "build";

switch (mode) {
  case "--print-current": {
    const buildInfo = await getCurrentBuildInfo({ packageDir: PACKAGE_DIR });
    console.log(JSON.stringify(buildInfo));
    break;
  }

  case "build": {
    const buildInfo = await getCurrentBuildInfo({ packageDir: PACKAGE_DIR });

    await mkdir(join(PACKAGE_DIR, "bin"), { recursive: true });
    await Bun.$`bun build --compile src/cli.ts --outfile bin/gaud-poll`.cwd(PACKAGE_DIR);
    await writeFile(
      BUILD_INFO_PATH,
      JSON.stringify(
        {
          ...buildInfo,
          builtAt: new Date().toISOString(),
        },
        null,
        2
      ) + "\n"
    );
    break;
  }

  default:
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
}
