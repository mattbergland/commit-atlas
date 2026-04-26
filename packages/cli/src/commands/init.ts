/**
 * `commit-atlas init` command
 * Sets up shell hooks, git hooks, and initial configuration.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import {
  ensureConfigDir,
  readConfig,
  writeConfig,
  getConfigDir,
} from "../lib/store.js";
import {
  generateBashHook,
  generateZshHook,
  getShellConfigPath,
  HOOK_START_MARKER,
} from "../lib/shell-hooks.js";
import { generatePostCommitHook, getGitHooksDir } from "../lib/git-hooks.js";

interface InitOptions {
  shell?: boolean;
  git?: boolean;
  skipShell?: boolean;
  skipGit?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold("\n  Commit Atlas — Setup\n"));

  ensureConfigDir();
  const config = readConfig();

  console.log(
    chalk.dim(`  Config directory: ${getConfigDir()}\n`)
  );

  // Install shell hooks (unless skipped)
  if (!options.skipShell) {
    await installShellHooks(config);
  }

  // Install git hooks (unless skipped)
  if (!options.skipGit) {
    await installGitHooks(config);
  }

  writeConfig(config);

  console.log(chalk.green("\n  Setup complete!\n"));
  console.log(chalk.dim("  Run `commit-atlas status` to check your setup."));
  console.log(
    chalk.dim("  Run `commit-atlas log --help` to see tracking options.\n")
  );
}

async function installShellHooks(
  config: ReturnType<typeof readConfig>
): Promise<void> {
  console.log(chalk.cyan("  Shell hooks:"));

  // Detect shell
  const shell = process.env.SHELL ?? "";
  const isZsh = shell.includes("zsh");
  const isBash = shell.includes("bash");

  if (!isZsh && !isBash) {
    console.log(
      chalk.yellow("    Unsupported shell. Only bash and zsh are supported.")
    );
    return;
  }

  const shellType = isZsh ? "zsh" : "bash";
  const hookContent = isZsh ? generateZshHook() : generateBashHook();
  const configPath = getShellConfigPath(shellType);

  // Check if already installed
  if (existsSync(configPath)) {
    const existing = readFileSync(configPath, "utf-8");
    if (existing.includes(HOOK_START_MARKER)) {
      console.log(chalk.dim(`    Already installed in ${configPath}`));
      config.shellHooksInstalled = true;
      return;
    }
  }

  // Append hook to shell config
  const separator = "\n\n";
  const content = existsSync(configPath)
    ? readFileSync(configPath, "utf-8")
    : "";
  writeFileSync(configPath, content + separator + hookContent + "\n");

  config.shellHooksInstalled = true;
  console.log(chalk.green(`    Installed in ${configPath}`));
  console.log(
    chalk.dim(`    Restart your shell or run: source ${configPath}`)
  );
}

async function installGitHooks(
  config: ReturnType<typeof readConfig>
): Promise<void> {
  console.log(chalk.cyan("  Git hooks:"));

  // Find git root
  const cwd = process.cwd();
  const gitDir = join(cwd, ".git");

  if (!existsSync(gitDir)) {
    console.log(
      chalk.yellow("    Not a git repository. Skipping git hooks.")
    );
    return;
  }

  const hooksDir = getGitHooksDir(cwd);
  const postCommitPath = join(hooksDir, "post-commit");

  // Check if already installed
  if (existsSync(postCommitPath)) {
    const existing = readFileSync(postCommitPath, "utf-8");
    if (existing.includes("Commit Atlas")) {
      console.log(chalk.dim("    post-commit hook already installed"));
      config.gitHooksInstalled = true;
      return;
    }
  }

  // Append to existing hook or create new one
  const hookContent = generatePostCommitHook();
  if (existsSync(postCommitPath)) {
    const existing = readFileSync(postCommitPath, "utf-8");
    console.log(
      chalk.yellow("    Existing post-commit hook found — appending Commit Atlas hook")
    );
    writeFileSync(postCommitPath, existing + "\n\n" + hookContent);
  } else {
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(postCommitPath, hookContent);
  }
  chmodSync(postCommitPath, "755");

  config.gitHooksInstalled = true;
  console.log(chalk.green("    post-commit hook installed"));
}
