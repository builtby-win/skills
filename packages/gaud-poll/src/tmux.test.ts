import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { $ } from "bun";

import { capturePane, paneExists } from "./tmux";

let sessionName = "";
let paneId = "";
let paneTarget = "";
let socketName = "";

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

async function createSocketSession(): Promise<void> {
  socketName = `gaud_poll_socket_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  sessionName = `gaud_poll_test_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  await $`tmux -L ${socketName} new-session -d -s ${sessionName} 'cat'`.quiet();
  paneId = (await $`tmux -L ${socketName} list-panes -t ${sessionName} -F '#{pane_id}'`.text()).trim();
  paneTarget = (
    await $`tmux -L ${socketName} list-panes -t ${sessionName} -F '#{session_name}:#{window_index}.#{pane_index}'`.text()
  ).trim();
}

async function destroySocketSession(): Promise<void> {
  if (!socketName || !sessionName) return;

  try {
    await $`tmux -L ${socketName} kill-session -t ${sessionName}`.quiet();
  } catch {
    // ignore cleanup failures
  }

  socketName = "";
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

describe("private tmux socket integration", () => {
  beforeEach(async () => {
    await createSocketSession();
  });

  afterEach(async () => {
    await destroySocketSession();
  });

  test("pane helpers can target a gaud-managed private tmux server", async () => {
    const callback =
      "GAUDMODE done role=Implementer milestone=M1 workstream=private-tmux summary=socket-capture-ok";

    await $`tmux -L ${socketName} send-keys -t ${paneTarget} -l -- ${callback}`.quiet();
    await $`tmux -L ${socketName} send-keys -t ${paneTarget} Enter`.quiet();

    expect(await paneExists(paneTarget, { socketName })).toBe(true);
    expect(await capturePane(paneTarget, { socketName })).toContain(callback);
  });
});
