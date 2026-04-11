/**
 * Privacy filtering for CLI command tracking.
 * Masks tokens, secrets, environment variables, and sensitive arguments.
 */

/** Patterns that indicate a command contains sensitive data */
const SENSITIVE_PATTERNS = [
  // Environment variable assignments with sensitive values
  /(?:export\s+)?(?:[\w]+(?:TOKEN|SECRET|KEY|PASSWORD|PASS|PWD|CREDENTIAL|AUTH|API_KEY|ACCESS_KEY|PRIVATE_KEY))\s*=/i,
  // Common secret-passing patterns
  /--(?:token|password|secret|key|auth|credential|api-key|access-key)\s+\S+/i,
  // curl/wget with auth headers
  /-H\s+["']?Authorization:\s+(?:Bearer|Basic|Token)\s+\S+/i,
  // SSH key operations
  /ssh-(?:keygen|add|copy-id)/,
  // GPG operations
  /gpg\s+--(?:import|export|sign)/,
  // Docker login
  /docker\s+login/,
  // AWS credentials
  /aws\s+(?:configure|sts)/,
  // Base64-encoded strings (likely secrets) — require trailing = padding to avoid matching file paths
  /(?:^|[\s='"])(?:[A-Za-z0-9+/]{40,}={1,2})(?:[\s'")]|$)/,
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

/** Mask sensitive values in a command string */
export function maskSensitiveContent(command: string): string {
  let masked = command;

  // Mask environment variable values (KEY=value → KEY=***)
  masked = masked.replace(
    /((?:[\w]+(?:TOKEN|SECRET|KEY|PASSWORD|PASS|PWD|CREDENTIAL|AUTH|API_KEY|ACCESS_KEY|PRIVATE_KEY))\s*=\s*)(\S+)/gi,
    "$1***"
  );

  // Mask --token, --password, etc. flag values
  masked = masked.replace(
    /(--(?:token|password|secret|key|auth|credential|api-key|access-key|private-key)\s+)\S+/gi,
    "$1***"
  );

  // Mask Authorization headers
  masked = masked.replace(
    /(Authorization:\s+(?:Bearer|Basic|Token)\s+)\S+/gi,
    "$1***"
  );

  // Mask inline URLs with credentials
  masked = masked.replace(
    /(https?:\/\/)([^:]+):([^@]+)@/gi,
    "$1$2:***@"
  );

  return masked;
}

/** Check if a command contains sensitive content that should be filtered */
export function isSensitiveCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();

  // Check blocked commands
  for (const blocked of BLOCKED_COMMANDS) {
    if (trimmed === blocked || trimmed.startsWith(blocked + " ")) return true;
  }

  // Check sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(command)) return true;
  }

  return false;
}

/** Sanitize a command for safe storage */
export function sanitizeCommand(command: string): string | null {
  const trimmed = command.trim();

  // Skip empty commands
  if (!trimmed) return null;

  // Skip commands that are entirely blocked
  if (isSensitiveCommand(trimmed)) return null;

  // Mask any remaining sensitive content
  return maskSensitiveContent(trimmed);
}

/** Filter environment variables from metadata */
export function filterEnvVars(
  env: Record<string, string>
): Record<string, string> {
  const sensitiveKeys = [
    "TOKEN",
    "SECRET",
    "KEY",
    "PASSWORD",
    "PASS",
    "PWD",
    "CREDENTIAL",
    "AUTH",
    "API_KEY",
    "ACCESS_KEY",
    "PRIVATE_KEY",
    "GITHUB_TOKEN",
    "NPM_TOKEN",
    "AWS_SECRET",
  ];

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    const upperKey = key.toUpperCase();
    const isSensitive = sensitiveKeys.some(
      (s) => upperKey.includes(s)
    );
    filtered[key] = isSensitive ? "***" : value;
  }
  return filtered;
}
