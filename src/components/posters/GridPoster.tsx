"use client";

import { GitHubData, PosterConfig } from "@/types/github";
import {
  POSTER_VIEWBOX,
  getMonthName,
  formatNumber,
} from "@/lib/poster-utils";

interface GridPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

export default function GridPoster({ data, config }: GridPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year}`);

  // Build grid from contribution data
  const sorted = [...data.contributions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Grid layout
  const gridMarginX = width * 0.1;
  const gridMarginTop = height * 0.18;
  const gridHeight = height * 0.58;
  const gridWidth = width - gridMarginX * 2;

  // Calculate grid dimensions: 53 weeks x 7 days for a year
  const weeksInData = Math.ceil(sorted.length / 7);
  const cols = Math.min(weeksInData, 53);
  const rows = 7;

  const cellGap = 2;
  const cellSize = Math.min(
    (gridWidth - (cols - 1) * cellGap) / cols,
    (gridHeight - (rows - 1) * cellGap) / rows
  );

  // Center the grid
  const actualGridWidth = cols * cellSize + (cols - 1) * cellGap;
  const actualGridHeight = rows * cellSize + (rows - 1) * cellGap;
  const offsetX = (width - actualGridWidth) / 2;
  const offsetY = gridMarginTop + (gridHeight - actualGridHeight) / 2;

  // Map contribution levels to colors
  const levelColors = [
    palette.background,
    palette.layers[1] || palette.layers[0],
    palette.layers[2] || palette.accent,
    palette.layers[3] || palette.accent,
    palette.accent,
  ];

  // Add subtle border color
  const borderColor = palette.metadata;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Outer border */}
      <rect
        x={width * 0.04}
        y={height * 0.025}
        width={width * 0.92}
        height={height * 0.95}
        fill="none"
        stroke={borderColor}
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Title */}
      <text
        x={width / 2}
        y={height * 0.07}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 48 : 42}
        fontWeight={700}
        letterSpacing="0.06em"
        fill={palette.foreground}
        style={{ textTransform: "uppercase" }}
      >
        {title}
      </text>

      {/* Subtitle */}
      <text
        x={width / 2}
        y={height * 0.105}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 20 : 18}
        fontWeight={300}
        letterSpacing="0.2em"
        fill={palette.metadata}
        style={{ textTransform: "uppercase" }}
      >
        {subtitle}
      </text>

      {/* Decorative lines */}
      <line
        x1={width * 0.2}
        y1={height * 0.13}
        x2={width * 0.8}
        y2={height * 0.13}
        stroke={borderColor}
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Contribution grid */}
      <g>
        {sorted.map((day, idx) => {
          const col = Math.floor(idx / 7);
          const row = idx % 7;
          if (col >= cols) return null;

          const x = offsetX + col * (cellSize + cellGap);
          const y = offsetY + row * (cellSize + cellGap);
          const color = levelColors[day.level];
          const radius = cellSize * 0.1;

          return (
            <rect
              key={day.date}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={radius}
              fill={color}
              stroke={day.level === 0 ? borderColor : "none"}
              strokeWidth={day.level === 0 ? 0.3 : 0}
              strokeOpacity={0.2}
            />
          );
        })}
      </g>

      {/* Month labels */}
      <g>
        {(() => {
          const labels: { month: string; x: number }[] = [];
          let lastMonth = -1;

          sorted.forEach((day, idx) => {
            const col = Math.floor(idx / 7);
            const date = new Date(day.date);
            const month = date.getMonth();
            if (month !== lastMonth && col < cols) {
              lastMonth = month;
              const x = offsetX + col * (cellSize + cellGap);
              labels.push({
                month: date.toLocaleString("default", { month: "short" }),
                x,
              });
            }
          });

          return labels.map((label, i) => (
            <text
              key={`month-${i}`}
              x={label.x}
              y={offsetY - 8}
              fontFamily="'Geist Mono', 'Courier New', monospace"
              fontSize={9}
              fill={palette.metadata}
              opacity={0.7}
              letterSpacing="0.05em"
            >
              {label.month.toUpperCase()}
            </text>
          ));
        })()}
      </g>

      {/* Day of week labels */}
      <g>
        {["M", "", "W", "", "F", "", ""].map((label, i) => (
          <text
            key={`dow-${i}`}
            x={offsetX - 12}
            y={offsetY + i * (cellSize + cellGap) + cellSize * 0.75}
            textAnchor="end"
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={8}
            fill={palette.metadata}
            opacity={0.5}
          >
            {label}
          </text>
        ))}
      </g>

      {/* Stats section */}
      {config.showStats && (
        <g>
          {/* Stats divider */}
          <line
            x1={width * 0.1}
            y1={height * 0.82}
            x2={width * 0.9}
            y2={height * 0.82}
            stroke={borderColor}
            strokeWidth={0.5}
            opacity={0.3}
          />

          {/* Stats row */}
          {[
            {
              label: "CONTRIBUTIONS",
              value: formatNumber(data.totalContributions),
            },
            { label: "ACTIVE DAYS", value: String(data.activeDays) },
            { label: "LONGEST STREAK", value: `${data.longestStreak}d` },
            { label: "REPOSITORIES", value: String(data.reposContributed) },
          ].map((stat, i) => {
            const colWidth = (width * 0.8) / 4;
            const x = width * 0.1 + colWidth * i + colWidth / 2;

            return (
              <g key={`stat-${i}`}>
                <text
                  x={x}
                  y={height * 0.865}
                  textAnchor="middle"
                  fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
                  fontSize={24}
                  fontWeight={600}
                  fill={palette.foreground}
                >
                  {stat.value}
                </text>
                <text
                  x={x}
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

      {/* Language dots */}
      {config.showLanguages && data.topLanguages.length > 0 && (
        <g>
          {data.topLanguages.map((lang, i) => {
            const totalLangs = data.topLanguages.length;
            const spacing = 100;
            const startX = width / 2 - ((totalLangs - 1) * spacing) / 2;
            const x = startX + i * spacing;
            const y = height * 0.93;

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
