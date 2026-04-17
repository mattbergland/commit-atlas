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

interface BreathePosterProps {
  data: GitHubData;
  config: PosterConfig;
}

/**
 * Breathe — Two vertical columns of stacked rounded shapes that grow
 * and shrink like breathing. One column expands top-to-bottom while
 * the other contracts, creating a visual rhythm mapped to contribution
 * intensity. Horizontal rule lines separate each row.
 *
 * Inspired by "Breathe in and out" poster series.
 */
export default function BreathePoster({ data, config }: BreathePosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year}`);

  const rand = seededRandom(hashString(data.username + data.year + "breathe"));

  // Aggregate contributions into rows
  const rowCount = 8;
  const buckets = aggregateContributions(data.contributions, rowCount);

  // Layout constants
  const marginX = width * 0.08;
  const marginTop = height * 0.06;
  const artAreaTop = marginTop + height * 0.02;
  const artAreaBottom = height * 0.82;
  const artAreaHeight = artAreaBottom - artAreaTop;
  const columnGap = width * 0.04;
  const columnWidth = (width - marginX * 2 - columnGap) / 2;

  // Each row gets equal vertical space
  const rowHeight = artAreaHeight / rowCount;
  const shapePadding = 4; // vertical padding between shape and rule lines

  // Color interpolation helper - lerp between two hex colors
  function lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Use palette layers for the two column color families
  // Left column: foreground shades (dark to light)
  // Right column: accent shades (saturated to lighter)
  const layers = palette.layers;
  const leftColorDark = layers[0] || palette.foreground;
  const leftColorLight = layers[Math.min(2, layers.length - 1)] || palette.foreground;
  const rightColorDark = palette.accent;
  const rightColorLight = layers[Math.min(layers.length - 1, 4)] || palette.accent;

  // Generate shape data for each row
  // Left column: shapes expand top-to-bottom (small pills at top, large circle at bottom)
  // Right column: shapes expand bottom-to-top (large circle at top, small pills at bottom)
  // Contribution intensity modulates the expansion
  const shapes = buckets.map((intensity, i) => {
    const t = i / (rowCount - 1); // 0 at top, 1 at bottom

    // Base expansion: left grows top-to-bottom, right grows bottom-to-top
    const leftBase = 0.15 + t * 0.85;
    const rightBase = 1.0 - t * 0.85;

    // Modulate with contribution data (intensity affects how much the shape expands)
    const dataInfluence = 0.3;
    const leftExpansion = Math.min(1, leftBase * (1 - dataInfluence) + leftBase * intensity * dataInfluence * 2);
    const rightExpansion = Math.min(1, rightBase * (1 - dataInfluence) + rightBase * intensity * dataInfluence * 2);

    // Shape height is proportional to expansion (min 15% of available space, max 95%)
    const availableHeight = rowHeight - shapePadding * 2;
    const leftShapeHeight = availableHeight * (0.15 + leftExpansion * 0.85);
    const rightShapeHeight = availableHeight * (0.15 + rightExpansion * 0.85);

    // Color gradient through the column
    const leftColor = lerpColor(leftColorDark, leftColorLight, t);
    const rightColor = lerpColor(rightColorDark, rightColorLight, t);

    // Corner radius: more expanded = more circular, compressed = more pill-like
    const leftRx = Math.min(columnWidth / 2, leftShapeHeight / 2);
    const rightRx = Math.min(columnWidth / 2, rightShapeHeight / 2);

    // Add slight random variation for organic feel
    const leftJitter = 1 + (rand() - 0.5) * 0.06;
    const rightJitter = 1 + (rand() - 0.5) * 0.06;

    return {
      leftShapeHeight: leftShapeHeight * leftJitter,
      rightShapeHeight: rightShapeHeight * rightJitter,
      leftColor,
      rightColor,
      leftRx,
      rightRx,
      intensity,
    };
  });

  // Column x positions
  const leftColX = marginX;
  const rightColX = marginX + columnWidth + columnGap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Horizontal rule lines and shapes */}
      {shapes.map((shape, i) => {
        const rowTop = artAreaTop + i * rowHeight;
        const rowCenter = rowTop + rowHeight / 2;

        // Center shapes vertically in their row
        const leftY = rowCenter - shape.leftShapeHeight / 2;
        const rightY = rowCenter - shape.rightShapeHeight / 2;

        return (
          <g key={`row-${i}`}>
            {/* Top rule line for this row */}
            <line
              x1={leftColX}
              y1={rowTop}
              x2={leftColX + columnWidth}
              y2={rowTop}
              stroke={palette.foreground}
              strokeWidth={1}
              opacity={0.7}
            />
            <line
              x1={rightColX}
              y1={rowTop}
              x2={rightColX + columnWidth}
              y2={rowTop}
              stroke={palette.foreground}
              strokeWidth={1}
              opacity={0.7}
            />

            {/* Left column shape */}
            <rect
              x={leftColX}
              y={leftY}
              width={columnWidth}
              height={shape.leftShapeHeight}
              rx={shape.leftRx}
              fill={shape.leftColor}
            />

            {/* Right column shape */}
            <rect
              x={rightColX}
              y={rightY}
              width={columnWidth}
              height={shape.rightShapeHeight}
              rx={shape.rightRx}
              fill={shape.rightColor}
            />
          </g>
        );
      })}

      {/* Bottom rule lines (close the last row) */}
      <line
        x1={leftColX}
        y1={artAreaBottom}
        x2={leftColX + columnWidth}
        y2={artAreaBottom}
        stroke={palette.foreground}
        strokeWidth={1}
        opacity={0.7}
      />
      <line
        x1={rightColX}
        y1={artAreaBottom}
        x2={rightColX + columnWidth}
        y2={artAreaBottom}
        stroke={palette.foreground}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Title — bottom left, bold */}
      <text
        x={marginX}
        y={height * 0.88}
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 48 : 42}
        fontWeight={800}
        fill={palette.foreground}
        dominantBaseline="hanging"
      >
        {title}
      </text>

      {/* Subtitle / metadata — bottom right */}
      <text
        x={width - marginX}
        y={height * 0.895}
        textAnchor="end"
        fontFamily="'Geist Mono', 'Courier New', monospace"
        fontSize={12}
        fill={palette.metadata}
        letterSpacing="0.1em"
        dominantBaseline="hanging"
      >
        {subtitle}
      </text>

      {/* Stats section */}
      {config.showStats && (
        <g>
          <line
            x1={marginX}
            y1={height * 0.93}
            x2={width - marginX}
            y2={height * 0.93}
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
            const x = marginX + colWidth * i + colWidth / 2;
            return (
              <g key={`stat-${i}`}>
                <text
                  x={x}
                  y={height * 0.955}
                  textAnchor="middle"
                  fontFamily="'Geist Mono', 'Courier New', monospace"
                  fontSize={12}
                  fontWeight={600}
                  fill={palette.foreground}
                >
                  {stat.value}
                </text>
                <text
                  x={x}
                  y={height * 0.975}
                  textAnchor="middle"
                  fontFamily="'Geist Mono', 'Courier New', monospace"
                  fontSize={7}
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

      {/* Language legend */}
      {config.showLanguages && data.topLanguages.length > 0 && (
        <g>
          {data.topLanguages.map((lang, i) => {
            const totalLangs = data.topLanguages.length;
            const spacing = 100;
            const startX = width / 2 - ((totalLangs - 1) * spacing) / 2;
            const x = startX + i * spacing;
            const y = height * 0.955;

            return (
              <g key={`lang-${i}`}>
                <circle cx={x - 14} cy={y - 3} r={4} fill={lang.color} />
                <text
                  x={x - 6}
                  y={y}
                  fontFamily="'Geist Mono', 'Courier New', monospace"
                  fontSize={9}
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
        y={height * 0.99}
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
