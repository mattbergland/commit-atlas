/**
 * Git hook generation for tracking commit activity.
 * Installs a post-commit hook that captures commit metadata and detects agents.
 */

/** Generate the post-commit hook script content */
export function generatePostCommitHook(): string {
  return `#!/bin/sh
# Commit Atlas post-commit hook
# Captures commit metadata and infers agent usage
# Added by: commit-atlas init

# Skip if commit-atlas CLI is not installed
if ! command -v commit-atlas >/dev/null 2>&1; then
  exit 0
fi

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
AUTHOR=$(git log -1 --pretty="%an <%ae>")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REPO=$(basename "$(git rev-parse --show-toplevel)")

# Get diff stats
STATS=$(git diff --stat HEAD~1 HEAD 2>/dev/null || echo "0 files changed")
FILES_CHANGED=$(echo "$STATS" | tail -1 | grep -oE '[0-9]+ file' | grep -oE '[0-9]+' || echo "0")
ADDITIONS=$(echo "$STATS" | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(echo "$STATS" | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

# Log the commit event
commit-atlas log \\
  --source github \\
  --event-type commit \\
  --repo "$REPO" \\
  --branch "$BRANCH" \\
  --files-changed "$FILES_CHANGED" \\
  --additions "$ADDITIONS" \\
  --deletions "$DELETIONS" \\
  --message "$COMMIT_MSG" \\
  --quiet 2>/dev/null || true

# End Commit Atlas post-commit hook
`;
}

/** Get the git hooks directory path for a repo, respecting core.hooksPath */
export function getGitHooksDir(repoPath: string): string {
  try {
    const { execSync } = require("node:child_process");
    const hooksPath = execSync("git rev-parse --git-path hooks", {
      cwd: repoPath,
      encoding: "utf-8",
    }).trim();
    if (hooksPath) {
      // git rev-parse --git-path returns a path relative to the repo root
      // if core.hooksPath is not absolute
      const { resolve } = require("node:path");
      return resolve(repoPath, hooksPath);
    }
  } catch {
    // Fall back to default if git command fails
  }
  return `${repoPath}/.git/hooks`;
}
