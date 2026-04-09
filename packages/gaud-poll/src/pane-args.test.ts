import { describe, expect, test } from "bun:test";

import { parsePaneArg } from "./pane-args";

describe("parsePaneArg", () => {
  test("parses a pane id with role and expected command", () => {
    expect(parsePaneArg("%5:Implementer:codex")).toEqual({
      paneId: "%5",
      role: "Implementer",
      milestone: "current",
      expectedCommand: "codex",
    });
  });

  test("parses a full session:window.pane target without truncating it", () => {
    expect(parsePaneArg("gaud_smoke_40570:1.3:Implementer:cat")).toEqual({
      paneId: "gaud_smoke_40570:1.3",
      role: "Implementer",
      milestone: "current",
      expectedCommand: "cat",
    });
  });
});
