/**
 * Shell hook generation for bash and zsh.
 * Installs PROMPT_COMMAND (bash) or precmd (zsh) hooks to track CLI activity.
 */

import { homedir } from "node:os";
import { join } from "node:path";

/** Generate the bash hook script content */
export function generateBashHook(): string {
  return `
# Commit Atlas CLI tracking hook for bash
# Added by: commit-atlas init
# Remove this block to disable CLI tracking

__commit_atlas_last_cmd=""
__commit_atlas_start_time=""

__commit_atlas_preexec() {
  # Guard: skip internal function calls triggered by PROMPT_COMMAND
  case "$1" in __commit_atlas_*) return ;; esac
  __commit_atlas_start_time=$SECONDS
  __commit_atlas_last_cmd="$1"
}

__commit_atlas_precmd() {
  local exit_code=$?
  local duration=0

  if [ -n "$__commit_atlas_start_time" ]; then
    duration=$(( SECONDS - __commit_atlas_start_time ))
  fi

  if [ -n "$__commit_atlas_last_cmd" ]; then
    # Skip if commit-atlas is not installed or tracking is disabled
    if command -v commit-atlas >/dev/null 2>&1; then
      commit-atlas log --source cli \\
        --command "$__commit_atlas_last_cmd" \\
        --duration "$duration" \\
        --cwd "$(pwd)" \\
        --exit-code "$exit_code" \\
        --quiet 2>/dev/null || true
    fi
  fi

  __commit_atlas_last_cmd=""
  __commit_atlas_start_time=""
}

# Install the hook via trap DEBUG + PROMPT_COMMAND
trap '__commit_atlas_preexec "$BASH_COMMAND"' DEBUG
PROMPT_COMMAND="__commit_atlas_precmd;\${PROMPT_COMMAND}"
# End Commit Atlas CLI tracking hook
`.trim();
}

/** Generate the zsh hook script content */
export function generateZshHook(): string {
  return `
# Commit Atlas CLI tracking hook for zsh
# Added by: commit-atlas init
# Remove this block to disable CLI tracking

__commit_atlas_last_cmd=""
__commit_atlas_start_time=""

__commit_atlas_preexec() {
  __commit_atlas_start_time=$SECONDS
  __commit_atlas_last_cmd="$1"
}

__commit_atlas_precmd() {
  local exit_code=$?
  local duration=0

  if [ -n "$__commit_atlas_start_time" ]; then
    duration=$(( SECONDS - __commit_atlas_start_time ))
  fi

  if [ -n "$__commit_atlas_last_cmd" ]; then
    if command -v commit-atlas &>/dev/null; then
      commit-atlas log --source cli \\
        --command "$__commit_atlas_last_cmd" \\
        --duration "$duration" \\
        --cwd "$(pwd)" \\
        --exit-code "$exit_code" \\
        --quiet 2>/dev/null || true
    fi
  fi

  __commit_atlas_last_cmd=""
  __commit_atlas_start_time=""
}

# Register hooks
autoload -Uz add-zsh-hook
add-zsh-hook preexec __commit_atlas_preexec
add-zsh-hook precmd __commit_atlas_precmd
# End Commit Atlas CLI tracking hook
`.trim();
}

/** Get the path to the shell config file */
export function getShellConfigPath(shell: "bash" | "zsh"): string {
  const home = homedir();
  if (shell === "bash") {
    return join(home, ".bashrc");
  }
  return join(home, ".zshrc");
}

/** Marker for finding/removing hook blocks */
export const HOOK_START_MARKER = "# Commit Atlas CLI tracking hook";
export const HOOK_END_MARKER = "# End Commit Atlas CLI tracking hook";
