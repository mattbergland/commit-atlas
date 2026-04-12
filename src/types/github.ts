/** A single day's contribution data */
export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // GitHub intensity levels
}

/** A week of contribution data */
export interface ContributionWeek {
  days: ContributionDay[];
}

/** Aggregated GitHub profile data for poster generation */
export interface GitHubData {
  username: string;
  displayName: string;
  avatarUrl: string;
  contributions: ContributionDay[];
  totalContributions: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  reposContributed: number;
  topLanguages: { name: string; percentage: number; color: string }[];
  year: number;
  month?: number; // 1-12, undefined for full year
}

/** Poster style variant */
export type PosterVariant = "horizon" | "grid" | "path" | "atlas" | "fragments" | "concerto" | "rhythm";

/** Poster size options */
export type PosterSize = "18x24" | "24x36";

/** Color palette definition */
export interface ColorPalette {
  id: string;
  name: string;
  background: string;
  foreground: string;
  accent: string;
  layers: string[]; // 4-6 graduated colors for visual elements
  sun?: string;
  metadata: string; // color for small text
}

/** Full poster configuration */
export interface PosterConfig {
  variant: PosterVariant;
  palette: ColorPalette;
  size: PosterSize;
  title: string;
  subtitle: string;
  showStats: boolean;
  showLanguages: boolean;
  showAgentMetadata: boolean;
  sourceFilter: import("./activity").ActivitySource | "all";
  includeAgentActivity: boolean;
  includeCliActivity: boolean;
}

/** API response from /api/github */
export interface GitHubApiResponse {
  success: boolean;
  data?: GitHubData;
  error?: string;
  isDemo?: boolean;
}
