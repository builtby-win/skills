import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { $ } from "bun";

import { capturePane, paneExists } from "./tmux";

let sessionName = "";
let paneId = "";
let paneTarget = "";

async function createSession(): Promise<void> {
  sessionName = `gaud_poll_test_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  await $`tmux new-session -d -s ${sessionName} 'cat'`.quiet();
  paneId = (await $`tmux list-panes -t ${sessionName} -F '#{pane_id}'`.text()).trim();
  paneTarget = (
    await $`tmux list-panes -t ${sessionName} -F '#{session_name}:#{window_index}.#{pane_index}'`.text()
  ).trim();
}

async function destroySession(): Promise<void> {
  if (!sessionName) return;

  try {
    await $`tmux kill-session -t ${sessionName}`.quiet();
  } catch {
    // ignore cleanup failures
  }

  sessionName = "";
  paneId = "";
  paneTarget = "";
}

describe("tmux integration", () => {
  beforeEach(async () => {
    await createSession();
  });

  afterEach(async () => {
    await destroySession();
  });

  test("paneExists accepts full pane targets", async () => {
    expect(await paneExists(paneTarget)).toBe(true);
    expect(await paneExists(paneId)).toBe(true);
  });

  test("capturePane joins wrapped lines from tmux", async () => {
    const callback =
      "GAUDMODE waiting-user role=Implementer milestone=M1 workstream=tmux summary=wrapped-callback-summary-abcdefghijklmnopqrstuvwxyz-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ-end";

    await $`tmux send-keys -t ${paneTarget} -l -- ${callback}`.quiet();
    await $`tmux send-keys -t ${paneTarget} Enter`.quiet();

    const capture = await capturePane(paneTarget);

    expect(capture).toContain(callback);
  });
});
