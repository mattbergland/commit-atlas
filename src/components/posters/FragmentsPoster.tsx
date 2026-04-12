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

interface FragmentsPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

/**
 * Fragments — Bauhaus-inspired poster with rounded rectangle shapes
 * arranged in a grid. Contribution intensity determines which cells
 * are filled vs. empty, and the accent color highlights peak activity.
 * Inspired by Posterlad "Fragments" series.
 */
export default function FragmentsPoster({ data, config }: FragmentsPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year}`);

  const rand = seededRandom(hashString(data.username + data.year + "fragments"));

  // Aggregate contributions into a grid of values
  const gridCols = 4;
  const gridRows = 5;
  const cellCount = gridCols * gridRows;
  const buckets = aggregateContributions(data.contributions, cellCount);

  // Find the peak bucket for accent highlight
  let peakIdx = 0;
  let peakVal = 0;
  buckets.forEach((v, i) => {
    if (v > peakVal) {
      peakVal = v;
      peakIdx = i;
    }
  });

  // Grid layout
  const marginX = width * 0.1;
  const marginTop = height * 0.14;
  const gridAreaW = width - marginX * 2;
  const gridAreaH = height * 0.62;
  const gap = 8;

  const cellW = (gridAreaW - (gridCols - 1) * gap) / gridCols;
  const cellH = (gridAreaH - (gridRows - 1) * gap) / gridRows;

  // Shape types for each cell based on contribution data
  // 0 = rounded rect, 1 = circle, 2 = stadium (pill), 3 = half-round top, 4 = half-round bottom
  type ShapeType = 0 | 1 | 2 | 3 | 4;

  const shapes: { type: ShapeType; filled: boolean; isAccent: boolean; intensity: number }[] = [];
  for (let i = 0; i < cellCount; i++) {
    const intensity = buckets[i];
    const filled = intensity > 0.15 || rand() < 0.3;
    const isAccent = i === peakIdx || (intensity > 0.8 && rand() < 0.5);
    // Deterministic shape based on position + data
    const shapeRand = rand();
    let type: ShapeType;
    if (shapeRand < 0.35) type = 0; // rounded rect
    else if (shapeRand < 0.5) type = 1; // circle
    else if (shapeRand < 0.7) type = 2; // stadium/pill
    else if (shapeRand < 0.85) type = 3; // half-round top
    else type = 4; // half-round bottom
    shapes.push({ type, filled, isAccent, intensity });
  }

  // Ensure at least 2-3 accent shapes for visual interest
  let accentCount = shapes.filter(s => s.isAccent).length;
  if (accentCount < 2) {
    // Add accent to high-intensity cells
    const sorted = buckets.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    for (const item of sorted) {
      if (accentCount >= 2) break;
      if (!shapes[item.i].isAccent) {
        shapes[item.i].isAccent = true;
        shapes[item.i].filled = true;
        accentCount++;
      }
    }
  }

  const renderShape = (
    idx: number,
    x: number,
    y: number,
    w: number,
    h: number,
    shape: (typeof shapes)[0]
  ) => {
    if (!shape.filled) return null;

    const color = shape.isAccent ? palette.accent : palette.foreground;
    const r = Math.min(w, h) * 0.22; // corner radius

    switch (shape.type) {
      case 0: // Rounded rectangle
        return (
          <rect
            key={`shape-${idx}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={r}
            fill={color}
          />
        );
      case 1: // Circle (centered in cell)
        return (
          <circle
            key={`shape-${idx}`}
            cx={x + w / 2}
            cy={y + h / 2}
            r={Math.min(w, h) / 2}
            fill={color}
          />
        );
      case 2: // Stadium / pill shape (vertical)
        return (
          <rect
            key={`shape-${idx}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={w / 2}
            fill={color}
          />
        );
      case 3: // Half-round top (rounded top, flat bottom)
        return (
          <path
            key={`shape-${idx}`}
            d={`M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`}
            fill={color}
          />
        );
      case 4: // Half-round bottom (flat top, rounded bottom)
        return (
          <path
            key={`shape-${idx}`}
            d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} Z`}
            fill={color}
          />
        );
    }
  };

  // Sometimes merge adjacent cells into tall shapes (like reference image 1)
  // Build merged shape map
  const merged = new Set<number>();
  const mergedShapes: {
    idx: number;
    col: number;
    row: number;
    spanRows: number;
    isAccent: boolean;
  }[] = [];

  for (let col = 0; col < gridCols; col++) {
    for (let row = 0; row < gridRows - 1; row++) {
      const idx = row * gridCols + col;
      const nextIdx = (row + 1) * gridCols + col;
      if (
        !merged.has(idx) &&
        !merged.has(nextIdx) &&
        shapes[idx].filled &&
        shapes[nextIdx].filled &&
        !shapes[idx].isAccent &&
        !shapes[nextIdx].isAccent &&
        rand() < 0.35
      ) {
        merged.add(idx);
        merged.add(nextIdx);
        mergedShapes.push({
          idx,
          col,
          row,
          spanRows: 2,
          isAccent: false,
        });
      }
    }
  }

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

      {/* Shape grid */}
      <g>
        {/* Render merged tall shapes */}
        {mergedShapes.map((ms) => {
          const x = marginX + ms.col * (cellW + gap);
          const y = marginTop + ms.row * (cellH + gap);
          const h = cellH * ms.spanRows + gap * (ms.spanRows - 1);
          const r = cellW / 2;
          return (
            <rect
              key={`merged-${ms.idx}`}
              x={x}
              y={y}
              width={cellW}
              height={h}
              rx={r}
              fill={ms.isAccent ? palette.accent : palette.foreground}
            />
          );
        })}

        {/* Render individual shapes */}
        {shapes.map((shape, idx) => {
          if (merged.has(idx)) return null;
          const col = idx % gridCols;
          const row = Math.floor(idx / gridCols);
          const x = marginX + col * (cellW + gap);
          const y = marginTop + row * (cellH + gap);
          return renderShape(idx, x, y, cellW, cellH, shape);
        })}
      </g>

      {/* Stats section */}
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
            const x = marginX + colWidth * i + colWidth / 2;
            return (
              <g key={`stat-${i}`}>
                <text
                  x={x}
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
              const x = currentX;
              currentX += w;
              return (
                <rect
                  key={`lang-${i}`}
                  x={x}
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
