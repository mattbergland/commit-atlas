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

interface ConcertoPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

/**
 * Concerto — Bauhaus-inspired poster with interlocking curved shapes,
 * quarter-circle arcs, and fine concentric line details.
 * Contribution data drives which quadrants are filled vs. negative space,
 * and accent circles highlight peak activity periods.
 * Inspired by Posterlad "Concerto" series.
 */
export default function ConcertoPoster({ data, config }: ConcertoPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year}`);

  const rand = seededRandom(hashString(data.username + data.year + "concerto"));

  // Grid of 3x4 cells — each cell has a quadrant-based curved shape
  const cols = 3;
  const rows = 4;
  const cellCount = cols * rows;
  const buckets = aggregateContributions(data.contributions, cellCount);

  // Layout
  const marginX = width * 0.1;
  const marginTop = height * 0.14;
  const gridAreaW = width - marginX * 2;
  const gridAreaH = height * 0.62;
  const gap = 6;

  const cellW = (gridAreaW - (cols - 1) * gap) / cols;
  const cellH = (gridAreaH - (rows - 1) * gap) / rows;

  // Find top intensities for accent placement
  const intensityRanked = buckets
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v);
  const accentIndices = new Set(intensityRanked.slice(0, 3).map((item) => item.i));

  // Shape types for each cell quadrant
  // 0=quarter-circle TL, 1=quarter-circle TR, 2=quarter-circle BL, 3=quarter-circle BR,
  // 4=full circle, 5=half-circle top, 6=half-circle bottom, 7=half-circle left, 8=half-circle right
  type CurveType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  const cellShapes: { curve: CurveType; filled: boolean; hasArcLines: boolean }[] = [];
  for (let i = 0; i < cellCount; i++) {
    const intensity = buckets[i];
    const filled = intensity > 0.1 || rand() < 0.25;
    const hasArcLines = rand() < 0.3 && filled;
    const curveRand = rand();
    let curve: CurveType;
    if (curveRand < 0.12) curve = 0;
    else if (curveRand < 0.24) curve = 1;
    else if (curveRand < 0.36) curve = 2;
    else if (curveRand < 0.48) curve = 3;
    else if (curveRand < 0.58) curve = 4;
    else if (curveRand < 0.68) curve = 5;
    else if (curveRand < 0.78) curve = 6;
    else if (curveRand < 0.88) curve = 7;
    else curve = 8;
    cellShapes.push({ curve, filled, hasArcLines });
  }

  const renderCurvedShape = (
    idx: number,
    x: number,
    y: number,
    w: number,
    h: number,
    shape: (typeof cellShapes)[0]
  ) => {
    if (!shape.filled) return null;

    const isAccent = accentIndices.has(idx);
    const color = isAccent ? palette.accent : palette.foreground;
    const r = Math.min(w, h);

    const elements: React.ReactNode[] = [];

    switch (shape.curve) {
      case 0: // Quarter circle top-left
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Q ${x} ${y + h} ${x} ${y} Z`}
            fill={color}
          />
        );
        break;
      case 1: // Quarter circle top-right
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Q ${x + w} ${y} ${x} ${y + h} Z`}
            fill={color}
          />
        );
        break;
      case 2: // Quarter circle bottom-left
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y} Q ${x} ${y + h} ${x + w} ${y + h} L ${x + w} ${y} Z`}
            fill={color}
          />
        );
        break;
      case 3: // Quarter circle bottom-right
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y} L ${x + w} ${y} Q ${x + w} ${y + h} ${x} ${y + h} Z`}
            fill={color}
          />
        );
        break;
      case 4: // Full circle
        elements.push(
          <circle
            key={`curve-${idx}`}
            cx={x + w / 2}
            cy={y + h / 2}
            r={r / 2}
            fill={color}
          />
        );
        break;
      case 5: // Half circle top
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y + h / 2} A ${w / 2} ${h / 2} 0 0 1 ${x + w} ${y + h / 2} L ${x + w} ${y + h} L ${x} ${y + h} Z`}
            fill={color}
          />
        );
        break;
      case 6: // Half circle bottom
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h / 2} A ${w / 2} ${h / 2} 0 0 1 ${x} ${y + h / 2} Z`}
            fill={color}
          />
        );
        break;
      case 7: // Half circle left
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x + w / 2} ${y} A ${w / 2} ${h / 2} 0 0 0 ${x + w / 2} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y} Z`}
            fill={color}
          />
        );
        break;
      case 8: // Half circle right
        elements.push(
          <path
            key={`curve-${idx}`}
            d={`M ${x} ${y} L ${x + w / 2} ${y} A ${w / 2} ${h / 2} 0 0 1 ${x + w / 2} ${y + h} L ${x} ${y + h} Z`}
            fill={color}
          />
        );
        break;
    }

    // Add concentric arc lines detail (like reference image 3)
    if (shape.hasArcLines && !isAccent) {
      const lineCount = 4;
      const lineColor = palette.background;
      for (let li = 1; li <= lineCount; li++) {
        const arcR = (r / 2) * (li / (lineCount + 1));
        let cx: number, cy: number;
        // Position arc lines based on curve type
        if (shape.curve <= 3) {
          // Quarter circles — arc from corner
          cx = shape.curve === 0 || shape.curve === 2 ? x : x + w;
          cy = shape.curve === 0 || shape.curve === 1 ? y : y + h;
        } else {
          cx = x + w / 2;
          cy = y + h / 2;
        }
        elements.push(
          <circle
            key={`arc-${idx}-${li}`}
            cx={cx}
            cy={cy}
            r={arcR}
            fill="none"
            stroke={lineColor}
            strokeWidth={0.8}
            opacity={0.5}
          />
        );
      }
    }

    return <g key={`cell-${idx}`}>{elements}</g>;
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Title */}
      <text
        x={width / 2}
        y={height * 0.055}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 48 : 42}
        fontWeight={800}
        letterSpacing="0.06em"
        fill={palette.foreground}
        style={{ textTransform: "uppercase" }}
      >
        {title}
      </text>

      {/* Subtitle */}
      <text
        x={width / 2}
        y={height * 0.09}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 18 : 16}
        fontWeight={300}
        letterSpacing="0.2em"
        fill={palette.metadata}
        style={{ textTransform: "uppercase" }}
      >
        {subtitle}
      </text>

      {/* Curved shape grid */}
      <g>
        {cellShapes.map((shape, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = marginX + col * (cellW + gap);
          const y = marginTop + row * (cellH + gap);
          return renderCurvedShape(idx, x, y, cellW, cellH, shape);
        })}
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
