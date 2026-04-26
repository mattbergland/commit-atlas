/** Parse a GitHub username from various input formats */
export function parseUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Handle full GitHub URL: https://github.com/username or https://github.com/username/
  const urlMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})\/?$/
  );
  if (urlMatch) return urlMatch[1];

  // Handle @ prefix: @username
  if (trimmed.startsWith("@")) {
    const name = trimmed.slice(1);
    if (isValidUsername(name)) return name;
    return null;
  }

  // Handle plain username
  if (isValidUsername(trimmed)) return trimmed;

  return null;
}

/** Validate a GitHub username (1-39 chars, alphanumeric + hyphens, no leading/trailing hyphens) */
function isValidUsername(name: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(name);
}
