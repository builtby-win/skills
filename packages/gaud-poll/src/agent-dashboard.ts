import type { PollEvent, WatchedPane } from "./poller";

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

export interface AgentDashboardOptions {
  title?: string;
  tmuxSocketName?: string | null;
}

export class AgentDashboard {
  private readonly enabled: boolean;
  private readonly title: string;
  private readonly tmuxSocketName: string | null;
  private readonly agents = new Map<string, AgentRow>();
  private frame = 0;
  private phase: Phase = "idle";
  private nextPollAt = 0;
  private pollStartedAt = 0;
  private startedAt = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private renderedLines = 0;
  private lastEvent = "waiting for first poll";

  constructor(panes: WatchedPane[], options: AgentDashboardOptions = {}) {
    this.enabled = Boolean(process.stderr.isTTY);
    this.title = options.title ?? "gaud";
    this.tmuxSocketName = options.tmuxSocketName ?? null;

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
  }

  start(): void {
    if (!this.enabled || this.timer) return;
    process.stderr.write(HIDE_CURSOR);
    this.timer = setInterval(() => this.render(), FRAME_INTERVAL_MS);
    this.render();
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
  }

  setPolling(): void {
    this.phase = "polling";
    this.pollStartedAt = Date.now();

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
          break;
        }
        case "stuck":
          agent.status = "stuck";
          agent.detail = `${event.event.indicator.type}: ${event.event.indicator.detail}`;
          this.lastEvent = `${timeOf(event.timestamp)} ${agent.role} → stuck: ${event.event.indicator.type}`;
          break;
        case "pane-dead":
          agent.status = "dead";
          agent.detail = "pane no longer exists";
          this.lastEvent = `${timeOf(event.timestamp)} ${agent.role} → dead`;
          break;
      }
    }

    this.render();
  }

  log(message: string): void {
    this.lastEvent = message;
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
    const header = ` GAUD — ${this.title} ${muted(`uptime ${formatDuration(Date.now() - this.startedAt)}`)}`;
    const source = this.tmuxSocketName ? `private tmux: ${this.tmuxSocketName}` : "current tmux";
    const phase = this.phase === "polling"
      ? `polling ${formatDuration(Date.now() - this.pollStartedAt)}`
      : `next poll ${formatDuration(Math.max(0, this.nextPollAt - Date.now()))}`;

    const rows = [...this.agents.values()]
      .sort((a, b) => a.role.localeCompare(b.role) || a.paneId.localeCompare(b.paneId))
      .map((agent) => this.renderAgent(agent));

    return [
      header,
      ` ${muted(source)} ${muted("·")} ${muted(phase)}`,
      ` ${muted("─".repeat(72))}`,
      ...rows,
      ` ${muted("─".repeat(72))}`,
      ` ${muted("last event:")} ${truncate(this.lastEvent, 58)}`,
    ];
  }

  private renderAgent(agent: AgentRow): string {
    const marker = statusMarker(agent.status, this.frame);
    const role = pad(truncate(agent.role, 16), 16);
    const status = pad(agent.status, 8);
    const milestone = pad(truncate(agent.milestone, 10), 10);
    const elapsed = pad(formatDuration(Date.now() - agent.startedAt), 6);
    const detail = truncate(agent.detail, 28);

    return ` ${role} ${marker} ${status} ${milestone} ${elapsed} ${muted(detail)}`;
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
