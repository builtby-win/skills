import type { PollEvent, WatchedPane } from "./poller";
import { appendFile } from "node:fs/promises";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 100;
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\x1b[2K\r";

type AgentStatus = "starting" | "working" | "done" | "waiting" | "stuck" | "dead";
type Phase = "idle" | "polling";

interface AgentRow {
  paneId: string;
  role: string;
  milestone: string;
  expectedCommand: string;
  status: AgentStatus;
  detail: string;
  startedAt: number;
  updatedAt: number;
}

interface TimelineEntry {
  timestamp: string;
  role: string;
  status: string;
  detail: string;
}

export interface AgentDashboardOptions {
  title?: string;
  tmuxSocketName?: string | null;
  logFilePath?: string | null;
}

export class AgentDashboard {
  private readonly enabled: boolean;
  private readonly title: string;
  private readonly tmuxSocketName: string | null;
  private readonly logFilePath: string | null;
  private readonly agents = new Map<string, AgentRow>();
  private frame = 0;
  private phase: Phase = "idle";
  private nextPollAt = 0;
  private pollStartedAt = 0;
  private startedAt = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private renderedLines = 0;
  private lastEvent = "waiting for first poll";
  private timeline: TimelineEntry[] = [];

  constructor(panes: WatchedPane[], options: AgentDashboardOptions = {}) {
    this.enabled = Boolean(process.stderr.isTTY);
    this.title = options.title ?? "gaud";
    this.tmuxSocketName = options.tmuxSocketName ?? null;
    this.logFilePath = options.logFilePath ?? null;

    const now = Date.now();
    for (const pane of panes) {
      this.agents.set(pane.paneId, {
        paneId: pane.paneId,
        role: pane.role,
        milestone: pane.milestone,
        expectedCommand: pane.expectedCommand,
        status: "starting",
        detail: pane.expectedCommand,
        startedAt: now,
        updatedAt: now,
      });
    }

    if (this.logFilePath) {
      this.writeLog(`gaud-poll dashboard started (title=${this.title}, panes=${panes.length}, tty=${this.enabled})`);
    }
  }

  private writeLog(message: string): void {
    if (!this.logFilePath) return;
    const timestamp = new Date().toISOString();
    // Fire-and-forget; don't block rendering on disk writes
    appendFile(this.logFilePath, `[${timestamp}] ${message}\n`, "utf8").catch(() => {});
  }

  start(): void {
    if (!this.enabled || this.timer) return;
    process.stderr.write(HIDE_CURSOR);
    this.timer = setInterval(() => this.render(), FRAME_INTERVAL_MS);
    this.render();
    this.writeLog("dashboard start (TUI enabled)");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.enabled) {
      this.clearRenderedBlock();
      process.stderr.write(SHOW_CURSOR);
    }
    this.writeLog("dashboard stop");
  }

  setPolling(): void {
    this.phase = "polling";
    this.pollStartedAt = Date.now();
    this.writeLog("polling start");

    for (const agent of this.agents.values()) {
      if (agent.status === "starting") {
        agent.status = "working";
        agent.updatedAt = this.pollStartedAt;
      }
    }

    this.render();
  }

  setIdle(nextPollAt: number): void {
    this.phase = "idle";
    this.nextPollAt = nextPollAt;
    this.render();
  }

  applyEvents(events: PollEvent[]): void {
    for (const event of events) {
      const agent = this.ensureAgent(event);
      agent.milestone = event.milestone;
      agent.updatedAt = Date.parse(event.timestamp) || Date.now();

      switch (event.event.kind) {
        case "callback": {
          const callback = event.event.callback;
          agent.status = callback.type === "done" ? "done" : "waiting";
          agent.detail = `${callback.workstream}: ${callback.summary}`;
          this.lastEvent = `${timeOf(event.timestamp)} ${agent.role} → ${callback.type}: ${callback.summary}`;
          this.addTimeline(event.timestamp, agent.role, callback.type, `${callback.workstream}: ${callback.summary}`);
          this.writeLog(`event callback role=${agent.role} pane=${event.paneId} type=${callback.type} summary=${callback.summary}`);
          break;
        }
        case "stuck":
          agent.status = "stuck";
          agent.detail = `${event.event.indicator.type}: ${event.event.indicator.detail}`;
          this.lastEvent = `${timeOf(event.timestamp)} ${agent.role} → stuck: ${event.event.indicator.type}`;
          this.addTimeline(event.timestamp, agent.role, "stuck", agent.detail);
          this.writeLog(`event stuck role=${agent.role} pane=${event.paneId} type=${event.event.indicator.type} detail=${event.event.indicator.detail}`);
          break;
        case "pane-dead":
          agent.status = "dead";
          agent.detail = "pane no longer exists";
          this.lastEvent = `${timeOf(event.timestamp)} ${agent.role} → dead`;
          this.addTimeline(event.timestamp, agent.role, "dead", agent.detail);
          this.writeLog(`event pane-dead role=${agent.role} pane=${event.paneId}`);
          break;
      }
    }

    this.render();
  }

  log(message: string): void {
    this.lastEvent = message;
    this.writeLog(`msg ${message}`);
    if (!this.enabled) {
      process.stderr.write(message + "\n");
      return;
    }
    this.render();
  }

  private ensureAgent(event: PollEvent): AgentRow {
    const current = this.agents.get(event.paneId);
    if (current) return current;

    const now = Date.now();
    const agent: AgentRow = {
      paneId: event.paneId,
      role: event.role,
      milestone: event.milestone,
      expectedCommand: "unknown",
      status: "working",
      detail: "discovered by poll event",
      startedAt: now,
      updatedAt: now,
    };
    this.agents.set(event.paneId, agent);
    return agent;
  }

  private addTimeline(timestamp: string, role: string, status: string, detail: string): void {
    this.timeline.push({ timestamp, role, status, detail });
    if (this.timeline.length > 8) this.timeline.shift();
  }

  private render(): void {
    if (!this.enabled) return;

    const lines = this.buildLines();
    const lineCount = Math.max(lines.length, this.renderedLines);

    if (this.renderedLines > 0) {
      process.stderr.write(`\x1b[${this.renderedLines - 1}A`);
    }

    for (let i = 0; i < lineCount; i += 1) {
      process.stderr.write(CLEAR_LINE);
      if (i < lines.length) process.stderr.write(lines[i]);
      if (i < lineCount - 1) process.stderr.write("\n");
    }

    this.renderedLines = lines.length;
    this.frame = (this.frame + 1) % FRAMES.length;
  }

  private clearRenderedBlock(): void {
    if (this.renderedLines === 0) return;
    process.stderr.write(`\x1b[${this.renderedLines - 1}A`);
    for (let i = 0; i < this.renderedLines; i += 1) {
      process.stderr.write(CLEAR_LINE);
      if (i < this.renderedLines - 1) process.stderr.write("\n");
    }
    this.renderedLines = 0;
  }

  private buildLines(): string[] {
    const width = terminalWidth();
    const rule = muted("─".repeat(width - 2));
    const header = ` GAUD — ${this.title} ${muted(`uptime ${formatDuration(Date.now() - this.startedAt)}`)}`;
    const source = this.tmuxSocketName ? `private tmux: ${this.tmuxSocketName}` : "current tmux";
    const phase = this.phase === "polling"
      ? `polling ${formatDuration(Date.now() - this.pollStartedAt)}`
      : `next poll ${formatDuration(Math.max(0, this.nextPollAt - Date.now()))}`;

    const rows = [...this.agents.values()]
      .sort((a, b) => a.role.localeCompare(b.role) || a.paneId.localeCompare(b.paneId))
      .flatMap((agent) => this.renderAgent(agent, width));

    const timeline = this.timeline.slice(-4).map((entry) => this.renderTimeline(entry, width));

    return [
      header,
      ` ${muted(source)} ${muted("·")} ${muted(phase)}`,
      ` ${rule}`,
      ...rows,
      ` ${rule}`,
      ` ${muted("timeline")}`,
      ...(timeline.length > 0 ? timeline : [` ${muted("  waiting for first poll")}`]),
      ` ${rule}`,
      ` ${muted("last:")} ${truncate(this.lastEvent, width - 8)}`,
    ];
  }

  private renderAgent(agent: AgentRow, width: number): string[] {
    const marker = statusMarker(agent.status, this.frame);
    const role = pad(truncate(agent.role, 20), 20);
    const status = pad(agent.status, 8);
    const milestone = pad(truncate(agent.milestone, 12), 12);
    const elapsed = pad(formatDuration(Date.now() - agent.startedAt), 7);
    const updated = timeOf(new Date(agent.updatedAt).toISOString());
    const prefix = ` ${role} ${marker} ${status} ${milestone} ${elapsed} ${updated} `;
    const detailWidth = Math.max(24, width - visibleLength(prefix) - 1);
    const detailLines = wrap(agent.detail, detailWidth, 3);

    return detailLines.map((line, index) => {
      if (index === 0) return `${prefix}${muted(line)}`;
      return `${" ".repeat(visibleLength(prefix))}${muted(line)}`;
    });
  }

  private renderTimeline(entry: TimelineEntry, width: number): string {
    const prefix = `  ${timeOf(entry.timestamp)} ${truncate(entry.role, 18)} ${entry.status}: `;
    return ` ${muted(truncate(prefix + entry.detail, width - 2))}`;
  }
}

function statusMarker(status: AgentStatus, frame: number): string {
  switch (status) {
    case "starting":
    case "working":
      return color(FRAMES[frame % FRAMES.length], "cyan");
    case "done":
      return color("✓", "green");
    case "waiting":
      return color("?", "yellow");
    case "stuck":
    case "dead":
      return color("!", "red");
  }
}

function timeOf(timestamp: string): string {
  return timestamp.slice(11, 19);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function terminalWidth(): number {
  return Math.max(80, Math.min(process.stderr.columns ?? 100, 160));
}

function visibleLength(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function wrap(text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }

    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === 0) lines.push("");
  if (words.join(" ").length > lines.join(" ").length) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1], Math.max(1, width - 1)) + "…";
  }
  return lines;
}

function truncate(text: string, width: number): string {
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function pad(text: string, width: number): string {
  return text.padEnd(width, " ");
}

function muted(text: string): string {
  return color(text, "gray");
}

function color(text: string, tone: "cyan" | "green" | "yellow" | "red" | "gray"): string {
  if (process.env.NO_COLOR) return text;
  const code = tone === "cyan" ? 36 : tone === "green" ? 32 : tone === "yellow" ? 33 : tone === "red" ? 31 : 90;
  return `\x1b[${code}m${text}\x1b[0m`;
}
