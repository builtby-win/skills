import { describe, expect, test } from "bun:test";

import { formatEventForConductor, type PollEvent } from "./poller";

describe("formatEventForConductor", () => {
  test("preserves worker callback events without rewriting their summary", () => {
    const event: PollEvent = {
      timestamp: "2026-04-08T12:00:00.000Z",
      paneId: "%5",
      role: "Implementer",
      milestone: "M1",
      event: {
        kind: "callback",
        callback: {
          type: "done",
          role: "Implementer",
          milestone: "M1",
          workstream: "parser",
          summary: "finished parser fix",
          raw: "GAUDMODE done role=Implementer milestone=M1 workstream=parser summary=finished parser fix",
        },
      },
    };

    expect(formatEventForConductor(event)).toBe(
      "GAUDMODE done role=Implementer milestone=M1 workstream=parser summary=finished parser fix"
    );
  });

  test("formats stuck pane notifications as suspected-stuck waiting-user events", () => {
    const event: PollEvent = {
      timestamp: "2026-04-08T12:00:00.000Z",
      paneId: "%5",
      role: "Implementer",
      milestone: "M1",
      event: {
        kind: "stuck",
        indicator: {
          type: "shell-dropped",
          detail: "Expected codex, pane now running zsh",
        },
      },
    };

    expect(formatEventForConductor(event)).toBe(
      "GAUDMODE waiting-user role=Implementer milestone=M1 workstream=gaud-poll summary=suspected-stuck: pane %5 shell-dropped - Expected codex, pane now running zsh"
    );
  });

  test("formats dead pane notifications as suspected-stuck waiting-user events", () => {
    const event: PollEvent = {
      timestamp: "2026-04-08T12:00:00.000Z",
      paneId: "%5",
      role: "Implementer",
      milestone: "M1",
      event: {
        kind: "pane-dead",
      },
    };

    expect(formatEventForConductor(event)).toBe(
      "GAUDMODE waiting-user role=Implementer milestone=M1 workstream=gaud-poll summary=suspected-stuck: pane %5 pane-dead - specialist exited or was killed"
    );
  });
});
