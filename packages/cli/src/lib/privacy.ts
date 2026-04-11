/**
 * Privacy filtering for the CLI tool.
 * Prevents logging of sensitive commands, tokens, and secrets.
 */

/** Patterns that indicate a command contains sensitive data */
const SENSITIVE_PATTERNS = [
  /(?:export\s+)?(?:[\w]+(?:TOKEN|SECRET|KEY|PASSWORD|PASS|PWD|CREDENTIAL|AUTH|API_KEY|ACCESS_KEY|PRIVATE_KEY))\s*=/i,
  /--(?:token|password|secret|key|auth|credential|api-key|access-key)\s+\S+/i,
  /-H\s+["']?Authorization:\s+(?:Bearer|Basic|Token)\s+\S+/i,
  /ssh-(?:keygen|add|copy-id)/,
  /gpg\s+--(?:import|export|sign)/,
  /docker\s+login/,
  /aws\s+(?:configure|sts)/,
];

/** Commands that should never be logged */
const BLOCKED_COMMANDS = [
  "passwd",
  "su",
  "sudo -s",
  "mysql -p",
  "psql -w",
  "vault",
  "1password",
  "op",
  "keychain",
];

/** Check if a command should be filtered out entirely */
export function shouldFilterCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();

  for (const blocked of BLOCKED_COMMANDS) {
    if (trimmed === blocked || trimmed.startsWith(blocked + " ")) return true;
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(command)) return true;
  }

  return false;
}

/** Mask sensitive content in a command */
export function maskCommand(command: string): string {
  let masked = command;

  // Mask env var values
  masked = masked.replace(
    /((?:[\w]+(?:TOKEN|SECRET|KEY|PASSWORD|PASS|PWD|CREDENTIAL|AUTH|API_KEY|ACCESS_KEY|PRIVATE_KEY))\s*=\s*)(\S+)/gi,
    "$1***"
  );

  // Mask flag values
  masked = masked.replace(
    /(--(?:token|password|secret|key|auth|credential|api-key|access-key|private-key)\s+)\S+/gi,
    "$1***"
  );

  // Mask auth headers
  masked = masked.replace(
    /(Authorization:\s+(?:Bearer|Basic|Token)\s+)\S+/gi,
    "$1***"
  );

  return masked;
}

/** Sanitize a command for safe storage, returns null if should be filtered */
export function sanitizeCommand(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;
  if (shouldFilterCommand(trimmed)) return null;
  return maskCommand(trimmed);
}
