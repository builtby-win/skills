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
 * Send a message to a tmux pane via tmux-cli send (includes Enter keystroke).
 */
export async function sendToPane(
  paneId: string,
  message: string,
  options: TmuxOptions = {}
): Promise<boolean> {
  try {
    if (options.socketName) {
      await $`tmux -L ${options.socketName} send-keys -t ${paneId} -l -- ${message}`.quiet();
      await $`tmux -L ${options.socketName} send-keys -t ${paneId} Enter`.quiet();
    } else {
      await $`tmux-cli send ${message} --pane=${paneId}`.quiet();
    }
    return true;
  } catch {
    return false;
  }
}
