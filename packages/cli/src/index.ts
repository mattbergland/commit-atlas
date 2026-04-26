#!/usr/bin/env node

/**
 * Commit Atlas CLI — Track coding activity, agent sessions, and CLI workflows.
 *
 * Commands:
 *   init    Set up shell hooks, git hooks, and configuration
 *   login   Connect to a Commit Atlas server
 *   log     Manually log an activity event
 *   status  Show activity summary and configuration
 */

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { loginCommand } from "./commands/login.js";
import { logCommand } from "./commands/log.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("commit-atlas")
  .description(
    "Track coding activity, agent sessions, and CLI workflows for Commit Atlas posters"
  )
  .version("0.1.0");

// init command
program
  .command("init")
  .description("Set up shell hooks, git hooks, and configuration")
  .option("--skip-shell", "Skip shell hook installation")
  .option("--skip-git", "Skip git hook installation")
  .action(async (options) => {
    await initCommand(options);
  });

// login command
program
  .command("login")
  .description("Connect to a Commit Atlas server")
  .option("--server <url>", "Server URL to connect to")
  .action(async (options) => {
    await loginCommand(options);
  });

// log command
program
  .command("log")
  .description("Log an activity event")
  .option("--source <source>", "Event source (github, cli, cursor, windsurf, devin, claude_code)", "cli")
  .option("--event-type <type>", "Event type (commit, pr, command, workflow)")
  .option("--command <cmd>", "Command that was executed")
  .option("--agent <agent>", "Agent name (claude_code, devin, cursor, windsurf)")
  .option("--repo <repo>", "Repository name")
  .option("--branch <branch>", "Branch name")
  .option("--files-changed <n>", "Number of files changed")
  .option("--additions <n>", "Lines added")
  .option("--deletions <n>", "Lines deleted")
  .option("--duration <seconds>", "Duration in seconds")
  .option("--cwd <path>", "Working directory")
  .option("--exit-code <code>", "Command exit code")
  .option("--message <msg>", "Commit message (for agent detection)")
  .option("--message-file <path>", "Read commit message from file (for agent detection)")
  .option("--quiet", "Suppress output")
  .action(async (options) => {
    await logCommand(options);
  });

// status command
program
  .command("status")
  .description("Show activity summary and configuration")
  .option("--export", "Export events to a JSON file")
  .option("--clear", "Clear all stored events")
  .option("--json", "Output as raw JSON (with --export)")
  .action(async (options) => {
    await statusCommand(options);
  });

program.parse();
