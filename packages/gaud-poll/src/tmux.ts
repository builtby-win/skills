import { $ } from "bun";

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
export async function listPanes(): Promise<PaneInfo[]> {
  try {
    const sep = "%%SEP%%";
    const fmt = `#{pane_id}${sep}#{session_name}${sep}#{window_index}${sep}#{window_name}${sep}#{pane_current_command}${sep}#{pane_active}`;
    const result = await $`tmux list-panes -a -F ${fmt}`.text();
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
export async function capturePane(paneId: string): Promise<string> {
  try {
    return await $`tmux capture-pane -t ${paneId} -p -S -200`.text();
  } catch {
    return "";
  }
}

/**
 * Check if a pane still exists.
 */
export async function paneExists(paneId: string): Promise<boolean> {
  try {
    await $`tmux has-session -t ${paneId}`.quiet();
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
  message: string
): Promise<boolean> {
  try {
    await $`tmux-cli send ${message} --pane=${paneId}`.quiet();
    return true;
  } catch {
    return false;
  }
}
