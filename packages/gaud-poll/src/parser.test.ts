import { describe, expect, test } from "bun:test";

import { parseCallbacks } from "./parser";

describe("parseCallbacks", () => {
  test("parses a plain GAUDMODE callback", () => {
    const callbacks = parseCallbacks(
      'GAUDMODE done role=Implementer milestone=M1 workstream=parser summary=[fixed parser] callback forwarded'
    );

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toMatchObject({
      type: "done",
      role: "Implementer",
      milestone: "M1",
      workstream: "parser",
      summary: "fixed parser",
    });
  });

  test("parses callbacks with decorative pane prefixes", () => {
    const callbacks = parseCallbacks(
      '∙   GAUDMODE waiting-user role=TPM milestone=M1 workstream=plan summary=need PM acceptance'
    );

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toMatchObject({
      type: "waiting-user",
      role: "TPM",
      milestone: "M1",
      workstream: "plan",
      summary: "need PM acceptance",
    });
  });

  test("ignores shell command lines that contain callback text", () => {
    const output = [
      '$ tmux-cli send "GAUDMODE done role=Implementer milestone=M1 workstream=impl summary=finished" --pane=%66',
      'Bash(tmux-cli send "GAUDMODE waiting-user role=TPM milestone=M1 workstream=plan summary=need decision")',
      '┃    tmux-cli send "GAUDMODE done role=Integrator milestone=M1 workstream=merge summary=green"',
    ].join("\n");

    expect(parseCallbacks(output)).toHaveLength(0);
  });

  test("ignores callback template lines with placeholders", () => {
    const callbacks = parseCallbacks(
      'GAUDMODE done role=ASSIGNED_ROLE milestone=CURRENT_MILESTONE workstream=WORKSTREAM_NAME summary=RESULT_SUMMARY'
    );

    expect(callbacks).toHaveLength(0);
  });

  test("parses suspected-stuck waiting-user callbacks without losing the summary text", () => {
    const callbacks = parseCallbacks(
      "GAUDMODE waiting-user role=Implementer milestone=M1 workstream=gaud-poll summary=suspected-stuck: pane %5 shell-dropped - Expected codex, pane now running zsh"
    );

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toMatchObject({
      type: "waiting-user",
      role: "Implementer",
      milestone: "M1",
      workstream: "gaud-poll",
      summary:
        "suspected-stuck: pane %5 shell-dropped - Expected codex, pane now running zsh",
    });
  });
});
