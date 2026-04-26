import { ContributionDay, GitHubData } from "@/types/github";

/** Generate realistic mock contribution data for demo mode */
function generateMockContributions(year: number): ContributionDay[] {
  const days: ContributionDay[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  // Create a natural-looking pattern with weekly cycles and seasonal variation
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const weekOfYear = Math.floor(
      (current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Base activity: higher on weekdays
    let baseActivity = dayOfWeek >= 1 && dayOfWeek <= 5 ? 0.6 : 0.25;

    // Seasonal wave: more active in spring and fall
    const monthFactor =
      Math.sin(((current.getMonth() - 2) / 12) * Math.PI * 2) * 0.3 + 0.5;
    baseActivity *= monthFactor;

    // Add some "project burst" periods
    const burstWeeks = [4, 5, 6, 14, 15, 22, 23, 24, 35, 36, 37, 45, 46];
    if (burstWeeks.includes(weekOfYear)) {
      baseActivity *= 1.8;
    }

    // Random variation
    const rand = Math.random();
    const probability = Math.min(1, baseActivity);
    const isActive = rand < probability;

    let count = 0;
    if (isActive) {
      // Generate realistic commit counts
      const intensity = Math.random();
      if (intensity < 0.4) count = Math.floor(Math.random() * 3) + 1;
      else if (intensity < 0.7) count = Math.floor(Math.random() * 5) + 3;
      else if (intensity < 0.9) count = Math.floor(Math.random() * 8) + 5;
      else count = Math.floor(Math.random() * 15) + 8;
    }

    const level = (
      count === 0 ? 0 : count <= 3 ? 1 : count <= 6 ? 2 : count <= 10 ? 3 : 4
    ) as 0 | 1 | 2 | 3 | 4;

    days.push({
      date: current.toISOString().split("T")[0],
      count,
      level,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

/** Generate complete mock GitHub data for demo mode */
export function generateMockData(
  username: string = "octocat",
  year: number = new Date().getFullYear()
): GitHubData {
  const contributions = generateMockContributions(year);
  const activeDays = contributions.filter((d) => d.count > 0).length;
  const totalContributions = contributions.reduce((s, d) => s + d.count, 0);

  // Calculate longest streak
  let longest = 0;
  let current = 0;
  for (const day of contributions) {
    if (day.count > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return {
    username,
    displayName: username === "octocat" ? "The Octocat" : username,
    avatarUrl: `https://github.com/${username}.png`,
    contributions,
    totalContributions,
    activeDays,
    longestStreak: longest,
    currentStreak: Math.min(current, 14),
    reposContributed: Math.floor(Math.random() * 20) + 5,
    topLanguages: [
      { name: "TypeScript", percentage: 38, color: "#3178C6" },
      { name: "Python", percentage: 24, color: "#3572A5" },
      { name: "Rust", percentage: 16, color: "#DEA584" },
      { name: "Go", percentage: 12, color: "#00ADD8" },
      { name: "CSS", percentage: 10, color: "#563D7C" },
    ],
    year,
    agentStats: {
      totalAnalyzed: 87,
      humanCommits: 64,
      agentCommits: 23,
      agentBreakdown: [
        { agent: "claude_code", label: "Claude Code", count: 14 },
        { agent: "devin", label: "Devin", count: 6 },
        { agent: "cursor", label: "Cursor", count: 3 },
      ],
      detectedPatterns: [
        "feat: add auth flow [claude]",
        "Co-authored-by: Devin AI <devin@cognition.dev>",
      ],
    },
  };
}
