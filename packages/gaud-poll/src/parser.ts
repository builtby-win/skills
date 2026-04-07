export type CallbackType = "done" | "waiting-user" | "waiting-permission";

export interface GaudCallback {
  type: CallbackType;
  role: string;
  milestone: string;
  workstream: string;
  summary: string;
  raw: string;
}

const CALLBACK_TYPES: CallbackType[] = [
  "done",
  "waiting-user",
  "waiting-permission",
];

/**
 * Parse GAUDMODE (or legacy GODMODE) callback lines from pane output.
 *
 * Format:
 *   GAUDMODE done role=Implementer milestone=M1 workstream=backend summary=finished task
 *   GAUDMODE waiting-user role=UX/UI milestone=M1 workstream=ui summary=need color choice
 */
export function parseCallbacks(output: string): GaudCallback[] {
  const callbacks: GaudCallback[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    const normalized = stripDecorativePrefix(trimmed);

    // Skip instruction/template lines that show the callback format but aren't actual callbacks
    // e.g. lines containing "role=ASSIGNED_ROLE" or "role=..." or "CONDUCTOR_PANE_ID"
    if (/role=(?:ASSIGNED_ROLE|\.{3})|CONDUCTOR_PANE_ID/i.test(normalized)) continue;

    const match = normalized.match(
      /^(?:GAUDMODE|GODMODE)\s+(done|waiting-user|waiting-permission)\s+(.*)$/i
    );
    if (!match) continue;

    const type = match[1].toLowerCase() as CallbackType;
    if (!CALLBACK_TYPES.includes(type)) continue;

    const rest = match[2];
    const role = extractField(rest, "role") ?? "unknown";
    const milestone = extractField(rest, "milestone") ?? "unknown";
    const workstream = extractField(rest, "workstream") ?? "unknown";
    const summary = extractField(rest, "summary") ?? rest;

    callbacks.push({ type, role, milestone, workstream, summary, raw: trimmed });
  }

  return callbacks;
}

function stripDecorativePrefix(line: string): string {
  return line.replace(/^[\s│┃┆╎╏║▏▕▎▍▌▋▊▉▐•∙·⏺]+/u, "");
}

function extractField(text: string, field: string): string | null {
  // Match field=value or field=[value with spaces]
  // Bracketed form: field=[...] — take everything inside brackets
  const bracketPattern = new RegExp(
    `${field}=\\[([^\\]]*)\\]`
  );
  const bracketMatch = text.match(bracketPattern);
  if (bracketMatch) return bracketMatch[1].trim();

  // Unbracketed form: field=value — runs until the next known field= or end of string
  const pattern = new RegExp(
    `${field}=((?:[^\\s].*?)?)(?=\\s+(?:role|milestone|workstream|summary)=|$)`
  );
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

export interface StuckIndicator {
  type: "idle" | "error" | "shell-dropped" | "exited";
  detail: string;
}

/**
 * Detect if a pane looks stuck or dead based on its captured output.
 */
export function detectStuck(
  output: string,
  expectedCommand: string
): StuckIndicator | null {
  const lines = output.trim().split("\n");
  const lastLines = lines.slice(-10).join("\n");

  // Shell-drop detection is handled by the poller via process command check,
  // not from output parsing. Skip it here.

  // Look for common error patterns in the last few lines
  const errorPatterns = [
    /error:/i,
    /fatal:/i,
    /panic:/i,
    /unhandled.*exception/i,
    /SIGTERM/,
    /SIGKILL/,
    /killed/i,
    /quota.*exceeded/i,
    /rate.*limit/i,
    /auth.*fail/i,
    /token.*expired/i,
  ];

  for (const pattern of errorPatterns) {
    const match = lastLines.match(pattern);
    if (match) {
      return { type: "error", detail: `Error detected: ${match[0]}` };
    }
  }

  return null;
}
