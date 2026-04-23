import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PACKAGE_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BUILD_INFO_FILE = "gaud-poll.build.json";

export interface BuildInfo {
  name: string;
  version: string;
  fingerprint: string;
  builtAt?: string;
}

interface BuildInfoOptions {
  executablePath?: string;
  packageDir?: string;
}

interface PackageManifest {
  name: string;
  version: string;
}

export async function getBuildInfo(options: BuildInfoOptions = {}): Promise<BuildInfo> {
  const runtimeBuildInfo = await readAdjacentBuildInfo(options.executablePath ?? process.execPath);
  if (runtimeBuildInfo) {
    return runtimeBuildInfo;
  }

  return getCurrentBuildInfo(options);
}

export async function getCurrentBuildInfo(options: Pick<BuildInfoOptions, "packageDir"> = {}): Promise<BuildInfo> {
  const packageDir = options.packageDir ?? DEFAULT_PACKAGE_DIR;
  const manifest = await readPackageManifest(packageDir);

  return {
    name: manifest.name,
    version: manifest.version,
    fingerprint: await computeFingerprint({ packageDir }),
  };
}

export async function computeFingerprint(options: Pick<BuildInfoOptions, "packageDir"> = {}): Promise<string> {
  const packageDir = options.packageDir ?? DEFAULT_PACKAGE_DIR;
  const hash = createHash("sha256");

  for (const relativePath of await listTrackedInputs(packageDir)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(join(packageDir, relativePath)));
    hash.update("\0");
  }

  return `sha256:${hash.digest("hex")}`;
}

export function getBuildInfoPathForExecutable(executablePath: string): string {
  return join(dirname(executablePath), BUILD_INFO_FILE);
}

async function readAdjacentBuildInfo(executablePath: string): Promise<BuildInfo | null> {
  const buildInfoPath = getBuildInfoPathForExecutable(executablePath);
  if (!existsSync(buildInfoPath)) {
    return null;
  }

  const buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8")) as Partial<BuildInfo>;
  if (!buildInfo.name || !buildInfo.version || !buildInfo.fingerprint) {
    return null;
  }

  return {
    name: buildInfo.name,
    version: buildInfo.version,
    fingerprint: buildInfo.fingerprint,
    builtAt: buildInfo.builtAt,
  };
}

async function readPackageManifest(packageDir: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(join(packageDir, "package.json"), "utf8")) as PackageManifest;
}

async function listTrackedInputs(packageDir: string): Promise<string[]> {
  const files = ["package.json", "tsconfig.json"];
  const bunLockPath = join(packageDir, "bun.lock");

  if (existsSync(bunLockPath)) {
    files.push("bun.lock");
  }

  const srcDir = join(packageDir, "src");
  files.push(...(await listTypeScriptFiles(srcDir, packageDir)));

  return files.sort();
}

async function listTypeScriptFiles(directory: string, packageDir: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(fullPath, packageDir)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(relative(packageDir, fullPath));
    }
  }

  return files;
}
