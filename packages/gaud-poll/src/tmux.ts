import { $ } from "bun";

export interface TmuxOptions {
  /** Optional tmux socket name for gaud-managed private tmux servers. */
  socketName?: string | null;
}

export interface PaneInfo {
  id: string;
  sessionName: string;
  windowIndex: string;
  windowName: string;
  command: string;
  active: boolean;
}

/**
 * List all tmux panes across all sessions.
 */
export async function listPanes(options: TmuxOptions = {}): Promise<PaneInfo[]> {
  try {
    const sep = "%%SEP%%";
    const fmt = `#{pane_id}${sep}#{session_name}${sep}#{window_index}${sep}#{window_name}${sep}#{pane_current_command}${sep}#{pane_active}`;
    const result = options.socketName
      ? await $`tmux -L ${options.socketName} list-panes -a -F ${fmt}`.text()
      : await $`tmux list-panes -a -F ${fmt}`.text();
    return result
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [id, sessionName, windowIndex, windowName, command, active] =
          line.split(sep);
        return {
          id,
          sessionName,
          windowIndex,
          windowName,
          command,
          active: active === "1",
        };
      });
  } catch {
    return [];
  }
}

/**
 * Capture the visible content of a tmux pane.
 */
export async function capturePane(
  paneId: string,
  options: TmuxOptions = {}
): Promise<string> {
  try {
    return options.socketName
      ? await $`tmux -L ${options.socketName} capture-pane -t ${paneId} -p -J -S -200`.text()
      : await $`tmux capture-pane -t ${paneId} -p -J -S -200`.text();
  } catch {
    return "";
  }
}

/**
 * Check if a pane still exists.
 */
export async function paneExists(
  paneId: string,
  options: TmuxOptions = {}
): Promise<boolean> {
  try {
    const target = options.socketName
      ? await $`tmux -L ${options.socketName} display-message -p -t ${paneId} '#{pane_id}'`.text()
      : await $`tmux display-message -p -t ${paneId} '#{pane_id}'`.text();
    if (!target.trim()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a message to a tmux pane and press Enter afterwards.
 *
 * Both socket and non-socket paths use explicit `tmux send-keys` for the
 * text AND a separate `tmux send-keys Enter` — no dependency on external
 * tools like `tmux-cli` or its delayed-enter mechanism.
 */
export async function sendToPane(
  paneId: string,
  message: string,
  options: TmuxOptions = {}
): Promise<boolean> {
  try {
    const prefix = options.socketName
      ? ["-L", options.socketName!]
      : [];

    await $`tmux ${prefix} send-keys -t ${paneId} -l -- ${message}`.quiet();
    await $`tmux ${prefix} send-keys -t ${paneId} Enter`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a message to a pane, then verify the pane content changed (i.e. Enter was
 * processed). If the content hasn't changed after a short wait, resend Enter up
 * to `maxRetries` times.
 *
 * This detects the common stuck-input case: text was typed into the orchestrator
 * pane but Enter was swallowed or the pane was not in an accepting state.
 *
 * @returns true if the message was sent and the pane content changed within retries
 */
export async function sendToPaneWithVerify(
  paneId: string,
  message: string,
  options: TmuxOptions & { maxRetries?: number; retryDelayMs?: number } = {}
): Promise<boolean> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 500;

  // Capture pane content before we send anything
  const before = await capturePane(paneId, options);
  if (before === "") return false; // pane is dead

  // Send the message
  const sent = await sendToPane(paneId, message, options);
  if (!sent) return false;

  // Small delay to let the pane process the Enter
  await new Promise((r) => setTimeout(r, 300));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const after = await capturePane(paneId, options);
    if (after !== before) return true; // content changed → Enter was processed

    // Content unchanged — resend Enter
    try {
      const tmuxPrefix = options.socketName
        ? `tmux -L ${options.socketName}`
        : "tmux";
      await $`${tmuxPrefix} send-keys -t ${paneId} Enter`.quiet();
    } catch {
      // ignore send errors on retry
    }

    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
    }
  }

  // Last capture to confirm
  const final = await capturePane(paneId, options);
  return final !== before;
}
