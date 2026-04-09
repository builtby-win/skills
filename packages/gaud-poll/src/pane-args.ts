import type { WatchedPane } from "./poller";

export function parsePaneArg(arg: string): WatchedPane {
  const parts = arg.split(":");

  if (parts.length < 3) {
    return {
      paneId: arg,
      role: "unknown",
      milestone: "current",
      expectedCommand: "unknown",
    };
  }

  const expectedCommand = parts.pop() ?? "unknown";
  const role = parts.pop() ?? "unknown";

  return {
    paneId: parts.join(":"),
    role,
    milestone: "current",
    expectedCommand,
  };
}
