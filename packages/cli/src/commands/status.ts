/**
 * `commit-atlas status` command
 * Shows activity summary and tracking configuration.
 */

import { writeFileSync } from "node:fs";
import chalk from "chalk";
import { readConfig, readEvents, clearEvents, getConfigDir } from "../lib/store.js";

interface StatusOptions {
  export?: boolean;
  clear?: boolean;
  json?: boolean;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const config = readConfig();
  const events = readEvents();

  if (options.clear) {
    clearEvents();
    console.log(chalk.green("\n  All events cleared.\n"));
    return;
  }

  if (options.export) {
    const exportData = JSON.stringify(events, null, 2);
    if (options.json) {
      console.log(exportData);
    } else {
      const exportPath = `commit-atlas-export-${Date.now()}.json`;
      writeFileSync(exportPath, exportData);
      console.log(chalk.green(`\n  Exported ${events.length} events to ${exportPath}\n`));
    }
    return;
  }

  console.log(chalk.bold("\n  Commit Atlas — Status\n"));

  // Configuration
  console.log(chalk.cyan("  Configuration:"));
  console.log(chalk.dim(`    Config dir:     ${getConfigDir()}`));
  console.log(
    chalk.dim(`    Tracking:       ${config.trackingEnabled ? chalk.green("enabled") : chalk.red("disabled")}`)
  );
  console.log(
    chalk.dim(`    Shell hooks:    ${config.shellHooksInstalled ? chalk.green("installed") : chalk.yellow("not installed")}`)
  );
  console.log(
    chalk.dim(`    Git hooks:      ${config.gitHooksInstalled ? chalk.green("installed") : chalk.yellow("not installed")}`)
  );
  console.log(
    chalk.dim(`    Mode:           ${config.localOnly ? "local only" : `syncing to ${config.serverUrl}`}`)
  );

  // Events summary
  console.log(chalk.cyan("\n  Activity Summary:"));
  console.log(chalk.dim(`    Total events:   ${events.length}`));

  if (events.length === 0) {
    console.log(chalk.dim("\n    No events recorded yet."));
    console.log(chalk.dim("    Run `commit-atlas init` to set up tracking.\n"));
    return;
  }

  // Count by source
  const bySrc = new Map<string, number>();
  for (const e of events) {
    bySrc.set(e.source, (bySrc.get(e.source) ?? 0) + 1);
  }
  console.log(chalk.dim("    By source:"));
  for (const [src, count] of bySrc.entries()) {
    console.log(chalk.dim(`      ${src}: ${count}`));
  }

  // Count by actor
  const byActor = new Map<string, number>();
  for (const e of events) {
    byActor.set(e.actor, (byActor.get(e.actor) ?? 0) + 1);
  }
  console.log(chalk.dim("    By actor:"));
  for (const [actor, count] of byActor.entries()) {
    console.log(chalk.dim(`      ${actor}: ${count}`));
  }

  // Count by event type
  const byType = new Map<string, number>();
  for (const e of events) {
    byType.set(e.eventType, (byType.get(e.eventType) ?? 0) + 1);
  }
  console.log(chalk.dim("    By type:"));
  for (const [type, count] of byType.entries()) {
    console.log(chalk.dim(`      ${type}: ${count}`));
  }

  // Date range
  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const earliest = new Date(timestamps.reduce((a, b) => Math.min(a, b)));
  const latest = new Date(timestamps.reduce((a, b) => Math.max(a, b)));
  console.log(
    chalk.dim(
      `    Date range:     ${earliest.toLocaleDateString()} – ${latest.toLocaleDateString()}`
    )
  );

  console.log(
    chalk.dim(
      "\n    Export events: commit-atlas status --export"
    )
  );
  console.log(
    chalk.dim("    Clear events:  commit-atlas status --clear\n")
  );
}
