import { capturePane, paneExists, listPanes, sendToPane, type TmuxOptions } from "./tmux";
import {
  parseCallbacks,
  detectStuck,
  type GaudCallback,
  type StuckIndicator,
} from "./parser";

export interface WatchedPane {
  paneId: string;
  role: string;
  milestone: string;
  /** The CLI command we expect to be running (e.g. "claude", "codex") */
  expectedCommand: string;
}

export interface PollEvent {
  timestamp: string;
  paneId: string;
  role: string;
  milestone: string;
  event:
    | { kind: "callback"; callback: GaudCallback }
    | { kind: "stuck"; indicator: StuckIndicator }
    | { kind: "pane-dead" };
}

/**
 * Poll a single pane: capture its output, look for new callbacks and stuck states.
 */
export async function pollPane(
  pane: WatchedPane,
  seenCallbacks: Set<string>,
  tmuxOptions: TmuxOptions = {}
): Promise<PollEvent[]> {
  const events: PollEvent[] = [];
  const now = new Date().toISOString();

  // Check if pane still exists
  const alive = await paneExists(pane.paneId, tmuxOptions);
  if (!alive) {
    events.push({
      timestamp: now,
      paneId: pane.paneId,
      role: pane.role,
      milestone: pane.milestone,
      event: { kind: "pane-dead" },
    });
    return events;
  }

  // Check if the specialist process dropped to a shell
  const shells = new Set(["zsh", "bash", "sh", "fish"]);
  if (
    pane.expectedCommand !== "unknown" &&
    !shells.has(pane.expectedCommand)
  ) {
    const allPanes = await listPanes(tmuxOptions);
    const current = allPanes.find((p) => p.id === pane.paneId);
    if (current && shells.has(current.command)) {
      events.push({
        timestamp: now,
        paneId: pane.paneId,
        role: pane.role,
        milestone: pane.milestone,
        event: {
          kind: "stuck",
          indicator: {
            type: "shell-dropped",
            detail: `Expected ${pane.expectedCommand}, pane now running ${current.command}`,
          },
        },
      });
    }
  }

  // Capture pane content
  const output = await capturePane(pane.paneId, tmuxOptions);
  if (!output) return events;

  // Parse for new callbacks
  const callbacks = parseCallbacks(output);
  for (const cb of callbacks) {
    // Deduplicate by raw line content
    if (seenCallbacks.has(cb.raw)) continue;
    seenCallbacks.add(cb.raw);

    events.push({
      timestamp: now,
      paneId: pane.paneId,
      role: pane.role,
      milestone: pane.milestone,
      event: { kind: "callback", callback: cb },
    });
  }

  // Check for error patterns in output
  const stuck = detectStuck(output, pane.expectedCommand);
  if (stuck) {
    events.push({
      timestamp: now,
      paneId: pane.paneId,
      role: pane.role,
      milestone: pane.milestone,
      event: { kind: "stuck", indicator: stuck },
    });
  }

  return events;
}

export interface PollerOptions {
  /** Polling interval in seconds (default: 30) */
  interval: number;
  /** File to write events to (default: stdout) */
  outputFile: string | null;
  /** Conductor/orchestrator pane ID to forward events to */
  conductorPane: string | null;
  /** Optional tmux socket name for watched implementer panes. */
  tmuxSocketName: string | null;
  /** Callback for each batch of events */
  onEvents?: (events: PollEvent[]) => void;
  /** Fired right before each pollOnce() cycle begins */
  onPollStart?: () => void;
  /** Fired after each pollOnce() cycle, with the timestamp of the next one */
  onPollEnd?: (nextPollAt: number) => void;
}

/**
 * Format a PollEvent into a GAUDMODE message the conductor can parse.
 * Uses the same callback protocol the specialists use.
 */
export function formatEventForConductor(event: PollEvent): string | null {
  const e = event.event;
  const paneId = event.paneId;
  const role = event.role;
  const milestone = event.milestone;

  switch (e.kind) {
    case "callback": {
      const cb = e.callback;
      // Preserve the worker callback contract so the conductor sees the same event
      // shape the specialist was instructed to send.
      return `GAUDMODE ${cb.type} role=${cb.role} milestone=${cb.milestone} workstream=${cb.workstream} summary=${cb.summary}`;
    }
    case "stuck":
      return `GAUDMODE waiting-user role=${role} milestone=${milestone} workstream=gaud-poll summary=suspected-stuck: pane ${paneId} ${e.indicator.type} - ${e.indicator.detail}`;
    case "pane-dead":
      return `GAUDMODE waiting-user role=${role} milestone=${milestone} workstream=gaud-poll summary=suspected-stuck: pane ${paneId} pane-dead - specialist exited or was killed`;
  }
}

export class GaudPoller {
  private panes: Map<string, WatchedPane> = new Map();
  private seenCallbacks: Set<string> = new Set();
  private timer: ReturnType<typeof setInterval> | null = null;
  private options: PollerOptions;

  constructor(options: Partial<PollerOptions> = {}) {
    this.options = {
      interval: options.interval ?? 30,
      outputFile: options.outputFile ?? null,
      conductorPane: options.conductorPane ?? null,
      tmuxSocketName: options.tmuxSocketName ?? null,
      onEvents: options.onEvents,
      onPollStart: options.onPollStart,
      onPollEnd: options.onPollEnd,
    };
  }

  /** Register a pane to watch. */
  watch(pane: WatchedPane): void {
    this.panes.set(pane.paneId, pane);
  }

  /** Unregister a pane. */
  unwatch(paneId: string): void {
    this.panes.delete(paneId);
  }

  /** Run one poll cycle across all watched panes. */
  async pollOnce(): Promise<PollEvent[]> {
    this.options.onPollStart?.();
    const allEvents: PollEvent[] = [];

    try {
      for (const pane of this.panes.values()) {
        const events = await pollPane(pane, this.seenCallbacks, {
          socketName: this.options.tmuxSocketName,
        });
        allEvents.push(...events);
      }

      if (allEvents.length > 0) {
        this.options.onEvents?.(allEvents);
        await this.writeEvents(allEvents);
        await this.forwardToConductor(allEvents);
      }
    } finally {
      this.options.onPollEnd?.(Date.now() + this.options.interval * 1000);
    }

    return allEvents;
  }

  /** Start the polling loop. */
  start(): void {
    if (this.timer) return;
    // Run immediately, then on interval
    this.pollOnce();
    this.timer = setInterval(
      () => this.pollOnce(),
      this.options.interval * 1000
    );
  }

  /** Stop the polling loop. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Get current watched pane count. */
  get watchCount(): number {
    return this.panes.size;
  }

  private async forwardToConductor(events: PollEvent[]): Promise<void> {
    const conductorPane = this.options.conductorPane;
    if (!conductorPane) return;

    for (const event of events) {
      const message = formatEventForConductor(event);
      if (!message) continue;

      const ok = await sendToPane(conductorPane, message);
      if (!ok) {
        console.error(
          `gaud-poll: failed to forward event to conductor ${conductorPane}`
        );
      }
    }
  }

  private async writeEvents(events: PollEvent[]): Promise<void> {
    for (const event of events) {
      const line = JSON.stringify(event);
      if (this.options.outputFile) {
        await Bun.write(
          Bun.file(this.options.outputFile),
          (await Bun.file(this.options.outputFile).exists()
            ? await Bun.file(this.options.outputFile).text()
            : "") +
            line +
            "\n"
        );
      } else {
        console.log(line);
      }
    }
  }
}
