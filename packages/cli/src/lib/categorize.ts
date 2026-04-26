/**
 * Categorize CLI commands into meaningful activity types.
 */

type CommandCategory = "build" | "test" | "deploy" | "edit" | "git" | "other";

/** Command categorization rules */
const CATEGORY_RULES: { pattern: RegExp; category: CommandCategory }[] = [
  // Build commands
  { pattern: /^npm\s+(?:run\s+)?build/i, category: "build" },
  { pattern: /^yarn\s+(?:run\s+)?build/i, category: "build" },
  { pattern: /^pnpm\s+(?:run\s+)?build/i, category: "build" },
  { pattern: /^make\b/i, category: "build" },
  { pattern: /^cargo\s+build/i, category: "build" },
  { pattern: /^go\s+build/i, category: "build" },
  { pattern: /^tsc\b/i, category: "build" },
  { pattern: /^webpack\b/i, category: "build" },
  { pattern: /^vite\s+build/i, category: "build" },
  { pattern: /^next\s+build/i, category: "build" },
  { pattern: /^docker\s+build/i, category: "build" },
  { pattern: /^gradle\b/i, category: "build" },
  { pattern: /^mvn\b/i, category: "build" },
  { pattern: /^cmake\b/i, category: "build" },
  { pattern: /^npm\s+(?:ci|install)/i, category: "build" },
  { pattern: /^yarn\s+(?:install)?$/i, category: "build" },
  { pattern: /^pip\s+install/i, category: "build" },
  { pattern: /^poetry\s+install/i, category: "build" },
  { pattern: /^bundle\s+install/i, category: "build" },

  // Test commands
  { pattern: /^npm\s+(?:run\s+)?test/i, category: "test" },
  { pattern: /^yarn\s+(?:run\s+)?test/i, category: "test" },
  { pattern: /^pnpm\s+(?:run\s+)?test/i, category: "test" },
  { pattern: /^jest\b/i, category: "test" },
  { pattern: /^vitest\b/i, category: "test" },
  { pattern: /^pytest\b/i, category: "test" },
  { pattern: /^cargo\s+test/i, category: "test" },
  { pattern: /^go\s+test/i, category: "test" },
  { pattern: /^rspec\b/i, category: "test" },
  { pattern: /^mocha\b/i, category: "test" },
  { pattern: /^cypress\b/i, category: "test" },
  { pattern: /^playwright\b/i, category: "test" },
  { pattern: /^npm\s+(?:run\s+)?lint/i, category: "test" },
  { pattern: /^eslint\b/i, category: "test" },

  // Deploy commands
  { pattern: /^(?:npm|yarn|pnpm)\s+(?:run\s+)?deploy/i, category: "deploy" },
  { pattern: /^vercel\b/i, category: "deploy" },
  { pattern: /^netlify\b/i, category: "deploy" },
  { pattern: /^fly\s+deploy/i, category: "deploy" },
  { pattern: /^railway\b/i, category: "deploy" },
  { pattern: /^docker\s+push/i, category: "deploy" },
  { pattern: /^kubectl\s+apply/i, category: "deploy" },
  { pattern: /^terraform\s+apply/i, category: "deploy" },
  { pattern: /^aws\s+(?:s3|ecs|lambda)/i, category: "deploy" },
  { pattern: /^gcloud\s+(?:app|run)\s+deploy/i, category: "deploy" },
  { pattern: /^heroku\b/i, category: "deploy" },

  // Git commands
  { pattern: /^git\b/i, category: "git" },

  // Edit/dev server commands
  { pattern: /^(?:npm|yarn|pnpm)\s+(?:run\s+)?(?:dev|start|serve)/i, category: "edit" },
  { pattern: /^code\b/i, category: "edit" },
  { pattern: /^vim?\b/i, category: "edit" },
  { pattern: /^nvim\b/i, category: "edit" },
  { pattern: /^emacs\b/i, category: "edit" },
  { pattern: /^nano\b/i, category: "edit" },
  { pattern: /^next\s+dev/i, category: "edit" },
  { pattern: /^vite\s*$/i, category: "edit" },
];

/** Categorize a CLI command */
export function categorizeCommand(command: string): CommandCategory {
  const trimmed = command.trim();
  for (const { pattern, category } of CATEGORY_RULES) {
    if (pattern.test(trimmed)) return category;
  }
  return "other";
}

/** Check if a command is meaningful dev activity worth tracking */
export function isMeaningfulCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();

  // Skip trivial commands
  const trivial = [
    "ls", "ll", "la", "pwd", "cd", "clear", "cls", "echo",
    "cat", "head", "tail", "less", "more", "wc", "which",
    "whoami", "date", "cal", "history", "man", "help",
    "true", "false", "exit", "logout",
  ];

  const baseCmd = trimmed.split(/\s+/)[0];
  if (trivial.includes(baseCmd)) return false;

  // Skip very short commands (likely typos or aliases)
  if (trimmed.length < 2) return false;

  return true;
}
