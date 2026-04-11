"use client";

import { GitHubData, PosterConfig } from "@/types/github";
import {
  POSTER_VIEWBOX,
  getMonthName,
  formatNumber,
  aggregateContributions,
  seededRandom,
  hashString,
} from "@/lib/poster-utils";

interface PathPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

export default function PathPoster({ data, config }: PathPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `A Year of Code · ${data.year}`);

  const rand = seededRandom(hashString(data.username + data.year));
  const normalized = aggregateContributions(data.contributions, 36);

  // Generate path (river/route) through the poster
  const pathMarginX = width * 0.15;
  const pathStartY = height * 0.15;
  const pathEndY = height * 0.82;
  const pathHeight = pathEndY - pathStartY;

  // Create meandering path points based on contribution data
  const pathPoints: { x: number; y: number; intensity: number }[] = [];
  const segmentCount = normalized.length;

  let currentX = width * 0.5;
  for (let i = 0; i < segmentCount; i++) {
    const t = i / (segmentCount - 1);
    const y = pathStartY + t * pathHeight;

    // Path meanders based on contribution intensity
    const drift = (normalized[i] - 0.5) * width * 0.25;
    const noise = (rand() - 0.5) * width * 0.08;
    currentX = Math.max(
      pathMarginX,
      Math.min(width - pathMarginX, currentX + drift * 0.3 + noise)
    );

    pathPoints.push({ x: currentX, y, intensity: normalized[i] });
  }

  // Generate smooth SVG path
  function pointsToPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const prev = i > 0 ? points[i - 1] : curr;
      const afterNext = i < points.length - 2 ? points[i + 2] : next;

      const smooth = 0.3;
      const cp1x = curr.x + (next.x - prev.x) * smooth;
      const cp1y = curr.y + (next.y - prev.y) * smooth;
      const cp2x = next.x - (afterNext.x - curr.x) * smooth;
      const cp2y = next.y - (afterNext.y - curr.y) * smooth;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  }

  const mainPath = pointsToPath(pathPoints);

  // Create terrain elements on either side of the path
  const terrainElements: {
    x: number;
    y: number;
    size: number;
    color: string;
    type: "circle" | "rect" | "diamond";
  }[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const point = pathPoints[i];
    const count = Math.floor(point.intensity * 4) + 1;

    for (let j = 0; j < count; j++) {
      const side = rand() > 0.5 ? 1 : -1;
      const dist = 40 + rand() * 80;
      const x = point.x + side * dist;
      const y = point.y + (rand() - 0.5) * 20;

      if (x < width * 0.05 || x > width * 0.95) continue;

      const elSize = 4 + rand() * 12 * point.intensity;
      const colorIdx = Math.floor(rand() * palette.layers.length);
      const types: ("circle" | "rect" | "diamond")[] = [
        "circle",
        "rect",
        "diamond",
      ];
      const type = types[Math.floor(rand() * 3)];

      terrainElements.push({
        x,
        y,
        size: elSize,
        color: palette.layers[colorIdx],
        type,
      });
    }
  }

  // Streak markers along the path
  const streakLength = data.longestStreak;
  const streakRatio = Math.min(1, streakLength / 365);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Subtle grid lines */}
      <defs>
        <pattern
          id="subtle-grid"
          width={40}
          height={40}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={20} cy={20} r={0.5} fill={palette.metadata} opacity={0.15} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#subtle-grid)" />

      {/* Terrain elements */}
      {terrainElements.map((el, i) => {
        if (el.type === "circle") {
          return (
            <circle
              key={`terrain-${i}`}
              cx={el.x}
              cy={el.y}
              r={el.size / 2}
              fill={el.color}
              opacity={0.5}
            />
          );
        }
        if (el.type === "rect") {
          return (
            <rect
              key={`terrain-${i}`}
              x={el.x - el.size / 2}
              y={el.y - el.size / 2}
              width={el.size}
              height={el.size}
              fill={el.color}
              opacity={0.4}
              rx={1}
            />
          );
        }
        // diamond
        return (
          <polygon
            key={`terrain-${i}`}
            points={`${el.x},${el.y - el.size / 2} ${el.x + el.size / 2},${el.y} ${el.x},${el.y + el.size / 2} ${el.x - el.size / 2},${el.y}`}
            fill={el.color}
            opacity={0.45}
          />
        );
      })}

      {/* Main path (river/route) */}
      <path
        d={mainPath}
        fill="none"
        stroke={palette.accent}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      <path
        d={mainPath}
        fill="none"
        stroke={palette.accent}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Intensity dots along the path */}
      {pathPoints.map((point, i) => {
        if (point.intensity < 0.1) return null;
        return (
          <circle
            key={`dot-${i}`}
            cx={point.x}
            cy={point.y}
            r={2 + point.intensity * 4}
            fill={palette.accent}
            opacity={0.6 + point.intensity * 0.3}
          />
        );
      })}

      {/* Streak indicator arc */}
      {streakRatio > 0 && (
        <g>
          <text
            x={width * 0.92}
            y={pathStartY + pathHeight * (1 - streakRatio) - 12}
            textAnchor="end"
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={8}
            fill={palette.metadata}
            opacity={0.6}
            letterSpacing="0.05em"
          >
            {streakLength}d STREAK
          </text>
          <line
            x1={width * 0.92}
            y1={pathStartY + pathHeight * (1 - streakRatio)}
            x2={width * 0.92}
            y2={pathEndY}
            stroke={palette.accent}
            strokeWidth={1.5}
            opacity={0.3}
            strokeDasharray="4 4"
          />
        </g>
      )}

      {/* Title */}
      <text
        x={width / 2}
        y={height * 0.055}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 40 : 36}
        fontWeight={700}
        letterSpacing="0.08em"
        fill={palette.foreground}
        style={{ textTransform: "uppercase" }}
      >
        {title}
      </text>

      <text
        x={width / 2}
        y={height * 0.09}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 16 : 14}
        fontWeight={300}
        letterSpacing="0.18em"
        fill={palette.metadata}
      >
        {subtitle}
      </text>

      {/* Bottom metadata */}
      {config.showStats && (
        <g>
          <line
            x1={width * 0.08}
            y1={height * 0.87}
            x2={width * 0.92}
            y2={height * 0.87}
            stroke={palette.metadata}
            strokeWidth={0.5}
            opacity={0.3}
          />
          <text
            x={width * 0.08}
            y={height * 0.905}
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={10}
            fill={palette.metadata}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {formatNumber(data.totalContributions)} CONTRIBUTIONS · {data.activeDays} ACTIVE DAYS
          </text>
          <text
            x={width * 0.92}
            y={height * 0.905}
            textAnchor="end"
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={10}
            fill={palette.metadata}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {data.reposContributed} REPOS
          </text>
        </g>
      )}

      {/* Language indicators */}
      {config.showLanguages && data.topLanguages.length > 0 && (
        <g>
          {data.topLanguages.map((lang, i) => {
            const totalLangs = data.topLanguages.length;
            const spacing = 90;
            const startX = width / 2 - ((totalLangs - 1) * spacing) / 2;
            const x = startX + i * spacing;
            const y = height * 0.94;

            return (
              <g key={`lang-${i}`}>
                <circle cx={x - 12} cy={y - 3} r={3.5} fill={lang.color} />
                <text
                  x={x - 5}
                  y={y}
                  fontFamily="'Geist Mono', 'Courier New', monospace"
                  fontSize={8}
                  fill={palette.metadata}
                  letterSpacing="0.03em"
                >
                  {lang.name}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Watermark */}
      <text
        x={width / 2}
        y={height * 0.98}
        textAnchor="middle"
        fontFamily="'Geist Mono', 'Courier New', monospace"
        fontSize={8}
        fill={palette.metadata}
        opacity={0.35}
        letterSpacing="0.2em"
      >
        COMMIT ATLAS
      </text>
    </svg>
  );
}
