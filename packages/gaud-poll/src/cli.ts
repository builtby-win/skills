#!/usr/bin/env bun
import { parseArgs } from "util";
import { GaudPoller, type PollEvent } from "./poller";
import { listPanes } from "./tmux";
import type { WatchedPane } from "./poller";
import { parsePaneArg } from "./pane-args";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    interval: { type: "string", short: "i", default: "30" },
    output: { type: "string", short: "o" },
    pane: { type: "string", multiple: true, short: "p" },
    conductor: { type: "string", short: "c" },
    "poll-once": { type: "boolean" },
    watch: { type: "boolean", short: "w" },
    scan: { type: "boolean", short: "s" },
  },
  allowPositionals: true,
  strict: false,
});

if (values.help) {
  printUsage();
  process.exit(0);
}

const command = positionals[0] ?? (values.scan ? "scan" : "watch");

switch (command) {
  case "scan":
    await runScan();
    break;
  case "watch":
    await runWatch();
    break;
  case "poll":
    await runPollOnce();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}

async function runScan() {
  // Scan all tmux panes for any GAUDMODE/GODMODE callbacks right now
  const panes = await listPanes();
  if (panes.length === 0) {
    console.error("No tmux panes found.");
    process.exit(1);
  }

  const poller = new GaudPoller({
    onEvents: (events) => printEventsHuman(events),
    // No outputFile — skip JSONL for scan mode
  });

  for (const pane of panes) {
    poller.watch({
      paneId: pane.id,
      role: "unknown",
      milestone: "unknown",
      expectedCommand: pane.command,
    });
  }

  await poller.pollOnce();
}

async function runWatch() {
  const panes = parsePaneArgs();
  if (panes.length === 0) {
    console.error(
      "No panes specified. Use --pane <id>:<role>:<command> or --scan to auto-detect."
    );
    printUsage();
    process.exit(1);
  }

  const interval = parseInt(values.interval as string, 10) || 30;
  const outputFile = (values.output as string) ?? null;
  const conductorPane = (values.conductor as string) ?? null;

  if (!conductorPane) {
    console.error(
      "Warning: no --conductor pane specified. Events will not be forwarded to the orchestrator."
    );
  }

  const poller = new GaudPoller({
    interval,
    outputFile,
    conductorPane,
    onEvents: (events) => printEventsHuman(events),
  });

  for (const pane of panes) {
    poller.watch(pane);
  }

  console.error(
    `gaud-poll: watching ${panes.length} pane(s), polling every ${interval}s`
  );
  for (const p of panes) {
    console.error(`  ${p.paneId} → ${p.role} (${p.expectedCommand})`);
  }
  if (outputFile) {
    console.error(`  output → ${outputFile}`);
  }
  if (values.conductor) {
    console.error(`  conductor → ${values.conductor}`);
  }
  console.error("");

  poller.start();

  // Keep alive
  process.on("SIGINT", () => {
    console.error("\ngaud-poll: stopping");
    poller.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    poller.stop();
    process.exit(0);
  });
}

async function runPollOnce() {
  const panes = parsePaneArgs();
  if (panes.length === 0) {
    // Fall back to scanning all panes
    await runScan();
    return;
  }

  const poller = new GaudPoller({
    conductorPane: (values.conductor as string) ?? null,
    onEvents: (events) => printEventsHuman(events),
  });

  for (const pane of panes) {
    poller.watch(pane);
  }

  await poller.pollOnce();
}

function parsePaneArgs(): WatchedPane[] {
  const paneArgs = values.pane as string[] | undefined;
  if (!paneArgs) return [];

  return paneArgs.map(parsePaneArg);
}

function printEventsHuman(events: PollEvent[]) {
  for (const event of events) {
    const e = event.event;
    const prefix = `[${event.timestamp.slice(11, 19)}] ${event.paneId} (${event.role})`;

    switch (e.kind) {
      case "callback": {
        const cb = e.callback;
        const icon =
          cb.type === "done" ? "✅" : cb.type === "waiting-user" ? "🙋" : "🔑";
        console.error(
          `${icon} ${prefix}: ${cb.type} — ${cb.summary}`
        );
        break;
      }
      case "stuck":
        console.error(
          `⚠️  ${prefix}: STUCK (${e.indicator.type}) — ${e.indicator.detail}`
        );
        break;
      case "pane-dead":
        console.error(`💀 ${prefix}: pane no longer exists`);
        break;
    }
  }
}

function printUsage() {
  console.log(`gaud-poll — Monitor tmux specialist panes for GAUDMODE callbacks

USAGE:
  gaud-poll scan                          Scan all tmux panes for callbacks (one-shot)
  gaud-poll poll -p <pane:role:cmd>       Poll specific panes once
  gaud-poll watch -p <pane:role:cmd>      Watch panes continuously

OPTIONS:
  -c, --conductor <pane_id>   Conductor/orchestrator pane ID. Events are forwarded
                              to this pane as GAUDMODE messages via tmux-cli send.
                              Required for watch mode.
  -p, --pane <id:role:cmd>    Pane to watch (repeatable)
                              Format: %1:Implementer:codex
  -i, --interval <seconds>    Polling interval (default: 30)
  -o, --output <file>         Write events as JSONL to file (default: stdout)
  -s, --scan                  Scan all panes (alias for scan command)
  -h, --help                  Show this help

PANE FORMAT:
  <pane_id>:<role>:<expected_command>
  
  Examples:
    %5:Implementer:codex
    %12:Integrator:opencode
    %8:UX/UI:gemini

EXAMPLES:
  # Quick scan — find any callbacks across all tmux panes
  gaud-poll scan

  # Watch two specialist panes, forward events to conductor pane %0
  gaud-poll watch -c %0 -p %5:Implementer:codex -p %12:Integrator:opencode -i 20

  # Watch and also log events to a file
  gaud-poll watch -c %0 -p %5:Implementer:codex -o /tmp/gaud-events.jsonl

  # One-shot poll of specific panes
  gaud-poll poll -p %5:Implementer:codex
`);
}
