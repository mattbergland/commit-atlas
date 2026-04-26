import { ContributionDay, PosterSize } from "@/types/github";

/** SVG viewBox dimensions for each poster size (3:4 and 2:3 ratios) */
export const POSTER_VIEWBOX: Record<
  PosterSize,
  { width: number; height: number }
> = {
  "18x24": { width: 900, height: 1200 },
  "24x36": { width: 800, height: 1200 },
};

/** Get month name from number (1-12) */
export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

/** Format a number with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Generate smooth terrain points using contribution data */
export function generateTerrainPoints(
  data: number[],
  width: number,
  baseY: number,
  amplitude: number,
  smoothing: number = 0.3
): string {
  if (data.length === 0) return "";

  const points: { x: number; y: number }[] = [];
  const step = width / (data.length - 1 || 1);

  for (let i = 0; i < data.length; i++) {
    points.push({
      x: i * step,
      y: baseY - data[i] * amplitude,
    });
  }

  // Generate smooth bezier curve through points
  let path = `M 0 ${baseY} L ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const prev = i > 0 ? points[i - 1] : current;
    const afterNext = i < points.length - 2 ? points[i + 2] : next;

    const cp1x = current.x + (next.x - prev.x) * smoothing;
    const cp1y = current.y + (next.y - prev.y) * smoothing;
    const cp2x = next.x - (afterNext.x - current.x) * smoothing;
    const cp2y = next.y - (afterNext.y - current.y) * smoothing;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  path += ` L ${width} ${baseY} Z`;
  return path;
}

/** Aggregate contributions into buckets for visualization */
export function aggregateContributions(
  days: ContributionDay[],
  bucketCount: number
): number[] {
  if (days.length === 0) return new Array(bucketCount).fill(0);

  const sorted = [...days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const bucketSize = Math.max(1, Math.ceil(sorted.length / bucketCount));
  const buckets: number[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, sorted.length);
    const slice = sorted.slice(start, end);
    const total = slice.reduce((s, d) => s + d.count, 0);
    buckets.push(total);
  }

  // Normalize to 0-1
  const max = Math.max(1, ...buckets);
  return buckets.map((b) => b / max);
}

/** Generate a seeded pseudo-random number for deterministic visuals */
export function seededRandom(seed: number): () => number {
  // Park-Miller LCG requires seed in [1, 2147483646]
  let s = ((seed % 2147483646) + 2147483646) % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Create a hash from a string for seeding random */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
