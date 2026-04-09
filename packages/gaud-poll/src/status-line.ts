/**
 * StatusLine — single-line live pulse for gaud-poll's watch mode.
 *
 * - TTY-only: auto-disables when stderr is not a terminal, so JSONL output
 *   stays clean in redirected or piped runs.
 * - Animates a braille spinner plus a phase-aware message:
 *     idle:    "⠋ next poll in 27s · watching 2 panes"
 *     polling: "⠙ polling… (0.4s) · 2 panes"
 * - log(msg) clears the status line, writes the message, and re-renders so
 *   event output never gets stomped by the spinner or vice versa.
 *
 * Design notes:
 * - Renders on its own 100ms interval, independent of the poll interval.
 * - Hides the cursor while active and restores it on stop().
 * - Never writes anything to stdout (reserved for JSONL event output).
 */

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 100;
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\r\x1b[K";

type Phase =
  | { kind: "none" }
  | { kind: "idle"; nextPollAt: number; watching: number }
  | { kind: "polling"; startedAt: number; watching: number };

export class StatusLine {
  private frame = 0;
  private phase: Phase = { kind: "none" };
  private timer: ReturnType<typeof setInterval> | null = null;
  private rendered = false;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = Boolean(process.stderr.isTTY);
  }

  /** Begin rendering. No-op if stderr is not a TTY or already started. */
  start(): void {
    if (!this.enabled || this.timer) return;
    process.stderr.write(HIDE_CURSOR);
    this.timer = setInterval(() => this.render(), FRAME_INTERVAL_MS);
  }

  /** Stop rendering, clear the line, and restore the cursor. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.enabled) {
      this.clear();
      process.stderr.write(SHOW_CURSOR);
    }
    this.phase = { kind: "none" };
  }

  /** Switch to idle phase counting down to the next poll. */
  setIdle(nextPollAt: number, watching: number): void {
    this.phase = { kind: "idle", nextPollAt, watching };
    this.render();
  }

  /** Switch to polling phase (in-flight capture/parse). */
  setPolling(watching: number): void {
    this.phase = { kind: "polling", startedAt: Date.now(), watching };
    this.render();
  }

  /**
   * Clear the status line, write a message on its own line, then re-render.
   * Falls back to plain stderr when the status line is disabled.
   */
  log(message: string): void {
    if (!this.enabled) {
      process.stderr.write(message + "\n");
      return;
    }
    this.clear();
    process.stderr.write(message + "\n");
    this.render();
  }

  private clear(): void {
    if (this.rendered) {
      process.stderr.write(CLEAR_LINE);
      this.rendered = false;
    }
  }

  private render(): void {
    if (!this.enabled || this.phase.kind === "none") return;

    const spin = FRAMES[this.frame % FRAMES.length];
    this.frame = (this.frame + 1) % FRAMES.length;

    let line: string;
    if (this.phase.kind === "idle") {
      const remainingMs = Math.max(0, this.phase.nextPollAt - Date.now());
      const remainingS = Math.ceil(remainingMs / 1000);
      const paneLabel = pluralize(this.phase.watching, "pane");
      line = `${spin} next poll in ${remainingS}s · watching ${paneLabel}`;
    } else {
      const elapsed = ((Date.now() - this.phase.startedAt) / 1000).toFixed(1);
      const paneLabel = pluralize(this.phase.watching, "pane");
      line = `${spin} polling… (${elapsed}s) · ${paneLabel}`;
    }

    process.stderr.write(CLEAR_LINE + line);
    this.rendered = true;
  }
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
