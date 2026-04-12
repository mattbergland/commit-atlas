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

interface RhythmPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

/**
 * Rhythm — Bauhaus-inspired poster with solid circles placed on a
 * structural grid of vertical and horizontal lines. Contribution
 * intensity determines circle size and placement density. The interplay
 * of circles and lines creates a musical, rhythmic composition.
 * Inspired by Jakub Miernowski's geometric circle-and-line prints.
 */
export default function RhythmPoster({ data, config }: RhythmPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year}`);

  const rand = seededRandom(hashString(data.username + data.year + "rhythm"));

  // Grid configuration — circles arranged on line intersections
  const gridCols = 7; // like days of week
  const gridRows = 5;
  const cellCount = gridCols * gridRows;
  const buckets = aggregateContributions(data.contributions, cellCount);

  // Layout area for the composition
  const marginX = width * 0.12;
  const marginTop = height * 0.18;
  const gridAreaW = width - marginX * 2;
  const gridAreaH = height * 0.55;

  const cellW = gridAreaW / gridCols;
  const cellH = gridAreaH / gridRows;
  const maxRadius = Math.min(cellW, cellH) * 0.38;

  // Vertical line positions — some lines are thick bundles, some are single
  // Lines are placed at column boundaries and some mid-points
  const verticalLines: { x: number; thickness: number; bundleCount: number }[] = [];
  for (let col = 0; col <= gridCols; col++) {
    const x = marginX + col * cellW;
    const nearContribution = col < gridCols ? buckets[col] : buckets[col - 1];
    // Higher contribution = more line bundle density
    if (nearContribution > 0.5 || rand() < 0.4) {
      const bundleCount = nearContribution > 0.7 ? Math.floor(3 + rand() * 4) : Math.floor(1 + rand() * 3);
      verticalLines.push({ x, thickness: 0.8, bundleCount });
    } else if (rand() < 0.6) {
      verticalLines.push({ x, thickness: 0.5, bundleCount: 1 });
    }
  }

  // Horizontal lines at row boundaries
  const horizontalLines: { y: number; startX: number; endX: number }[] = [];
  for (let row = 0; row <= gridRows; row++) {
    const y = marginTop + row * cellH;
    // Vary the horizontal line extents based on data
    const rowBuckets = buckets.slice(row * gridCols, (row + 1) * gridCols);
    const rowMax = rowBuckets.length > 0
      ? rowBuckets.reduce((a, b) => Math.max(a, b), 0)
      : 0;
    if (rowMax > 0.2 || rand() < 0.5) {
      const startX = marginX + rand() * cellW * 0.5;
      const endX = marginX + gridAreaW - rand() * cellW * 0.5;
      horizontalLines.push({ y, startX, endX });
    }
  }

  // Determine which circles to show and their sizes
  const circles: {
    cx: number;
    cy: number;
    r: number;
    isAccent: boolean;
  }[] = [];

  // Find peak indices for accent
  const ranked = buckets.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const accentSet = new Set(ranked.slice(0, 3).map((item) => item.i));

  for (let i = 0; i < cellCount; i++) {
    const intensity = buckets[i];
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const cx = marginX + col * cellW + cellW / 2;
    const cy = marginTop + row * cellH + cellH / 2;

    // Show circle if intensity is above threshold
    if (intensity > 0.15 || rand() < 0.15) {
      // Size varies with intensity
      const sizeScale = 0.4 + intensity * 0.6;
      const r = maxRadius * sizeScale;
      circles.push({
        cx,
        cy,
        r: Math.max(r, maxRadius * 0.3),
        isAccent: accentSet.has(i),
      });
    }
  }

  // Line bundle spacing
  const bundleSpacing = 3;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Title — top left, bold, large */}
      <text
        x={marginX}
        y={height * 0.06}
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 52 : 46}
        fontWeight={900}
        fill={palette.foreground}
        letterSpacing="-0.02em"
      >
        {title.toUpperCase()}
      </text>

      {/* Subtitle */}
      <text
        x={marginX}
        y={height * 0.09}
        fontFamily="'Geist Mono', 'Courier New', monospace"
        fontSize={12}
        fill={palette.metadata}
        letterSpacing="0.05em"
      >
        {subtitle.toUpperCase()}
      </text>

      {/* Vertical line bundles */}
      <g>
        {verticalLines.map((line, i) => {
          const totalWidth = (line.bundleCount - 1) * bundleSpacing;
          const startX = line.x - totalWidth / 2;
          // Lines extend from top of grid area to bottom with some variation
          const y1 = marginTop - height * 0.03;
          const y2 = marginTop + gridAreaH + height * 0.03;

          return Array.from({ length: line.bundleCount }).map((_, j) => (
            <line
              key={`vline-${i}-${j}`}
              x1={startX + j * bundleSpacing}
              y1={y1}
              x2={startX + j * bundleSpacing}
              y2={y2}
              stroke={palette.foreground}
              strokeWidth={line.thickness}
              opacity={0.7}
            />
          ));
        })}
      </g>

      {/* Horizontal lines */}
      <g>
        {horizontalLines.map((line, i) => (
          <line
            key={`hline-${i}`}
            x1={line.startX}
            y1={line.y}
            x2={line.endX}
            y2={line.y}
            stroke={palette.foreground}
            strokeWidth={0.8}
            opacity={0.6}
          />
        ))}
      </g>

      {/* Circles — solid, overlapping the lines */}
      <g>
        {circles.map((circle, i) => (
          <circle
            key={`circle-${i}`}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill={circle.isAccent ? palette.accent : palette.foreground}
          />
        ))}
      </g>

      {/* Stats */}
      {config.showStats && (
        <g>
          <line
            x1={marginX}
            y1={height * 0.82}
            x2={width - marginX}
            y2={height * 0.82}
            stroke={palette.metadata}
            strokeWidth={0.5}
            opacity={0.3}
          />
          {[
            { label: "CONTRIBUTIONS", value: formatNumber(data.totalContributions) },
            { label: "ACTIVE DAYS", value: String(data.activeDays) },
            { label: "STREAK", value: `${data.longestStreak}d` },
            { label: "REPOS", value: String(data.reposContributed) },
          ].map((stat, i) => {
            const colWidth = (width - marginX * 2) / 4;
            const sx = marginX + colWidth * i + colWidth / 2;
            return (
              <g key={`stat-${i}`}>
                <text
                  x={sx}
                  y={height * 0.865}
                  textAnchor="middle"
                  fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
                  fontSize={22}
                  fontWeight={700}
                  fill={palette.foreground}
                >
                  {stat.value}
                </text>
                <text
                  x={sx}
                  y={height * 0.89}
                  textAnchor="middle"
                  fontFamily="'Geist Mono', 'Courier New', monospace"
                  fontSize={8}
                  fill={palette.metadata}
                  letterSpacing="0.1em"
                >
                  {stat.label}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Language bar */}
      {config.showLanguages && data.topLanguages.length > 0 && (
        <g>
          {(() => {
            const barY = height * 0.92;
            const barHeight = 4;
            const barStart = marginX;
            const barWidth = width - marginX * 2;
            let currentX = barStart;
            return data.topLanguages.map((lang, i) => {
              const w = (lang.percentage / 100) * barWidth;
              const lx = currentX;
              currentX += w;
              return (
                <rect
                  key={`lang-${i}`}
                  x={lx}
                  y={barY}
                  width={w}
                  height={barHeight}
                  fill={lang.color}
                  opacity={0.8}
                  rx={i === 0 ? 2 : 0}
                />
              );
            });
          })()}
        </g>
      )}

      {/* Watermark */}
      <text
        x={width / 2}
        y={height * 0.97}
        textAnchor="middle"
        fontFamily="'Geist Mono', 'Courier New', monospace"
        fontSize={8}
        fill={palette.metadata}
        opacity={0.4}
        letterSpacing="0.2em"
      >
        COMMIT ATLAS
      </text>
    </svg>
  );
}
