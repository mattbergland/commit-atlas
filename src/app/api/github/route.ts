import { NextRequest, NextResponse } from "next/server";
import { ContributionDay, GitHubApiResponse, GitHubData } from "@/types/github";
import {
  calculateLongestStreak,
  calculateCurrentStreak,
  countActiveDays,
} from "@/lib/streaks";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_REST = "https://api.github.com";

/** Fetch contribution data via GitHub GraphQL API */
async function fetchContributions(
  username: string,
  year: number,
  token?: string
): Promise<{
  contributions: ContributionDay[];
  totalContributions: number;
} | null> {
  if (!token) return null;

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { username, from, to },
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const calendar =
      json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) return null;

    const levelMap: Record<string, 0 | 1 | 2 | 3 | 4> = {
      NONE: 0,
      FIRST_QUARTILE: 1,
      SECOND_QUARTILE: 2,
      THIRD_QUARTILE: 3,
      FOURTH_QUARTILE: 4,
    };

    const contributions: ContributionDay[] = calendar.weeks.flatMap(
      (week: {
        contributionDays: {
          date: string;
          contributionCount: number;
          contributionLevel: string;
        }[];
      }) =>
        week.contributionDays.map(
          (day: {
            date: string;
            contributionCount: number;
            contributionLevel: string;
          }) => ({
            date: day.date,
            count: day.contributionCount,
            level: levelMap[day.contributionLevel] ?? 0,
          })
        )
    );

    return {
      contributions,
      totalContributions: calendar.totalContributions,
    };
  } catch {
    return null;
  }
}

/** Fetch user profile via REST API (works without auth) */
async function fetchUserProfile(
  username: string,
  token?: string
): Promise<{
  displayName: string;
  avatarUrl: string;
  publicRepos: number;
} | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) headers.Authorization = `bearer ${token}`;

    const res = await fetch(`${GITHUB_REST}/users/${username}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      displayName: data.name || username,
      avatarUrl: data.avatar_url,
      publicRepos: data.public_repos,
    };
  } catch {
    return null;
  }
}

/** Fetch top languages from user repos */
async function fetchTopLanguages(
  username: string,
  token?: string
): Promise<{ name: string; percentage: number; color: string }[]> {
  const defaultColors: Record<string, string> = {
    TypeScript: "#3178C6",
    JavaScript: "#F1E05A",
    Python: "#3572A5",
    Rust: "#DEA584",
    Go: "#00ADD8",
    Java: "#B07219",
    "C++": "#F34B7D",
    C: "#555555",
    Ruby: "#701516",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    PHP: "#4F5D95",
    CSS: "#563D7C",
    HTML: "#E34C26",
    Shell: "#89E051",
    Dart: "#00B4AB",
    Scala: "#C22D40",
  };

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) headers.Authorization = `bearer ${token}`;

    const res = await fetch(
      `${GITHUB_REST}/users/${username}/repos?per_page=100&sort=updated`,
      { headers }
    );
    if (!res.ok) return [];
    const repos = await res.json();

    const langCounts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    }

    if (Object.keys(langCounts).length === 0) return [];

    const top5 = Object.entries(langCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const top5Total = top5.reduce((s, [, c]) => s + c, 0);
    return top5.map(([name, count]) => ({
      name,
      percentage: Math.round((count / top5Total) * 100),
      color: defaultColors[name] || "#888888",
    }));
  } catch {
    return [];
  }
}

/** Scrape contribution data from the public profile page as a fallback */
async function scrapeContributions(
  username: string,
  year: number
): Promise<{
  contributions: ContributionDay[];
  totalContributions: number;
} | null> {
  try {
    const url = `https://github.com/users/${username}/contributions?from=${year}-01-01&to=${year}-12-31`;
    const res = await fetch(url, {
      headers: { Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const contributions: ContributionDay[] = [];
    // Parse the contribution table cells
    const cellRegex =
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"[^>]*>([^<]*)<\/td>/g;
    let match;
    while ((match = cellRegex.exec(html)) !== null) {
      const date = match[1];
      const level = parseInt(match[2]) as 0 | 1 | 2 | 3 | 4;
      // Estimate count from level
      const countEstimate = [0, 2, 5, 8, 14][level];
      contributions.push({ date, count: countEstimate, level });
    }

    // Also try the tooltip-based format
    if (contributions.length === 0) {
      const altRegex =
        /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"/g;
      while ((match = altRegex.exec(html)) !== null) {
        const date = match[1];
        const level = parseInt(match[2]) as 0 | 1 | 2 | 3 | 4;
        const countEstimate = [0, 2, 5, 8, 14][level];
        contributions.push({ date, count: countEstimate, level });
      }
    }

    if (contributions.length === 0) return null;

    const totalContributions = contributions.reduce((s, d) => s + d.count, 0);
    return { contributions, totalContributions };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  if (!username) {
    return NextResponse.json<GitHubApiResponse>({
      success: false,
      error: "Username is required",
    });
  }

  // Validate username format to prevent path traversal
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
    return NextResponse.json<GitHubApiResponse>({
      success: false,
      error: "Invalid GitHub username format",
    });
  }

  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
  const month = monthParam ? parseInt(monthParam) : undefined;
  const token = process.env.GITHUB_TOKEN;

  // Fetch user profile (works without token)
  const profile = await fetchUserProfile(username, token);
  if (!profile) {
    return NextResponse.json<GitHubApiResponse>({
      success: false,
      error: `Could not find GitHub user "${username}". Please check the username and try again.`,
    });
  }

  // Try to fetch contribution data
  let contribData = await fetchContributions(username, year, token);

  // Fallback: scrape public contribution page
  if (!contribData) {
    contribData = await scrapeContributions(username, year);
  }

  if (!contribData || contribData.contributions.length === 0) {
    return NextResponse.json<GitHubApiResponse>({
      success: false,
      error:
        "Could not fetch contribution data. This may require a GitHub token. Try demo mode instead.",
    });
  }

  // Fetch top languages
  const topLanguages = await fetchTopLanguages(username, token);

  const data: GitHubData = {
    username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    contributions: contribData.contributions,
    totalContributions: contribData.totalContributions,
    activeDays: countActiveDays(contribData.contributions),
    longestStreak: calculateLongestStreak(contribData.contributions),
    currentStreak: calculateCurrentStreak(contribData.contributions),
    reposContributed: profile.publicRepos,
    topLanguages,
    year,
    month,
  };

  return NextResponse.json<GitHubApiResponse>({
    success: true,
    data,
  });
}
