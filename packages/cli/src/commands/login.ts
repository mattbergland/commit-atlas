/**
 * `commit-atlas login` command
 * Placeholder for future authentication with Commit Atlas server.
 */

import chalk from "chalk";
import { readConfig, writeConfig } from "../lib/store.js";

interface LoginOptions {
  server?: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  console.log(chalk.bold("\n  Commit Atlas — Login\n"));

  const config = readConfig();

  if (options.server) {
    config.serverUrl = options.server;
    config.localOnly = false;
    writeConfig(config);
    console.log(chalk.green(`  Server URL set to: ${options.server}`));
    console.log(chalk.dim("  Events will be synced to this server.\n"));
  } else {
    console.log(chalk.cyan("  Currently running in local-only mode."));
    console.log(
      chalk.dim(
        "  All events are stored locally at ~/.commit-atlas/events.json"
      )
    );
    console.log(
      chalk.dim(
        "\n  To connect to a Commit Atlas server, run:"
      )
    );
    console.log(
      chalk.dim(
        "    commit-atlas login --server https://your-server.com\n"
      )
    );
    console.log(
      chalk.dim(
        "  To export events for use with the web app:"
      )
    );
    console.log(
      chalk.dim("    commit-atlas status --export\n")
    );
  }
}
