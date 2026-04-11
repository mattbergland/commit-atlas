import { ContributionDay } from "@/types/github";

/** Calculate the longest streak of consecutive contribution days */
export function calculateLongestStreak(days: ContributionDay[]): number {
  if (days.length === 0) return 0;

  const sorted = [...days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let longest = 0;
  let current = 0;

  for (const day of sorted) {
    if (day.count > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

/** Calculate the current streak (counting back from the most recent day) */
export function calculateCurrentStreak(days: ContributionDay[]): number {
  if (days.length === 0) return 0;

  const sorted = [...days].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Allow the most recent day to have 0 contributions (today might not be over)
  let streak = 0;
  const startIdx = sorted[0].count === 0 ? 1 : 0;

  for (let i = startIdx; i < sorted.length; i++) {
    if (sorted[i].count > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/** Count the number of days with at least one contribution */
export function countActiveDays(days: ContributionDay[]): number {
  return days.filter((d) => d.count > 0).length;
}

/** Filter contributions to a specific month */
export function filterByMonth(
  days: ContributionDay[],
  year: number,
  month: number
): ContributionDay[] {
  return days.filter((d) => {
    const date = new Date(d.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
}

/** Filter contributions to a specific year */
export function filterByYear(
  days: ContributionDay[],
  year: number
): ContributionDay[] {
  return days.filter((d) => {
    const date = new Date(d.date);
    return date.getFullYear() === year;
  });
}

/** Get the maximum contribution count in a set of days */
export function getMaxContributions(days: ContributionDay[]): number {
  return Math.max(0, ...days.map((d) => d.count));
}

/** Normalize contribution counts to 0-1 range */
export function normalizeContributions(days: ContributionDay[]): number[] {
  const max = getMaxContributions(days);
  if (max === 0) return days.map(() => 0);
  return days.map((d) => d.count / max);
}

/** Get weekly aggregated contribution counts (for poster generation) */
export function getWeeklyTotals(days: ContributionDay[]): number[] {
  const sorted = [...days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const weeks: number[] = [];
  for (let i = 0; i < sorted.length; i += 7) {
    const week = sorted.slice(i, i + 7);
    weeks.push(week.reduce((sum, d) => sum + d.count, 0));
  }

  return weeks;
}
