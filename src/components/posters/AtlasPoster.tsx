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

interface AtlasPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

export default function AtlasPoster({ data, config }: AtlasPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year} Topography`);

  const rand = seededRandom(hashString(data.username + data.year + "atlas"));
  const bucketCount = 64;
  const normalized = aggregateContributions(data.contributions, bucketCount);

  // Map region
  const mapLeft = width * 0.1;
  const mapTop = height * 0.14;
  const mapRight = width * 0.9;
  const mapBottom = height * 0.82;
  const mapW = mapRight - mapLeft;
  const mapH = mapBottom - mapTop;

  // Generate contour lines from contribution data
  // We create concentric-ish closed curves centered around high-activity zones
  const gridCols = 8;
  const gridRows = 8;
  const cellW = mapW / gridCols;
  const cellH = mapH / gridRows;

  // Build a height map from contributions
  const heightMap: number[][] = [];
  for (let r = 0; r < gridRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < gridCols; c++) {
      const idx = (r * gridCols + c) % bucketCount;
      const base = normalized[idx];
      const noise = rand() * 0.2;
      row.push(Math.min(1, base + noise));
    }
    heightMap.push(row);
  }

  // Interpolate height at any point
  function getHeight(px: number, py: number): number {
    const col = ((px - mapLeft) / mapW) * (gridCols - 1);
    const row = ((py - mapTop) / mapH) * (gridRows - 1);
    const c0 = Math.max(0, Math.min(gridCols - 2, Math.floor(col)));
    const r0 = Math.max(0, Math.min(gridRows - 2, Math.floor(row)));
    const fc = col - c0;
    const fr = row - r0;
    const v00 = heightMap[r0][c0];
    const v10 = heightMap[r0][c0 + 1];
    const v01 = heightMap[r0 + 1]?.[c0] ?? v00;
    const v11 = heightMap[r0 + 1]?.[c0 + 1] ?? v10;
    return v00 * (1 - fc) * (1 - fr) + v10 * fc * (1 - fr) + v01 * (1 - fc) * fr + v11 * fc * fr;
  }

  // Generate contour paths at different elevation thresholds
  const contourLevels = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  const contourPaths: { d: string; level: number }[] = [];

  // March through cells to find contour crossings (simplified marching squares)
  const resolution = 40;
  const stepX = mapW / resolution;
  const stepY = mapH / resolution;

  for (const threshold of contourLevels) {
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (let gy = 0; gy < resolution; gy++) {
      for (let gx = 0; gx < resolution; gx++) {
        const x = mapLeft + gx * stepX;
        const y = mapTop + gy * stepY;

        const tl = getHeight(x, y);
        const tr = getHeight(x + stepX, y);
        const bl = getHeight(x, y + stepY);
        const br = getHeight(x + stepX, y + stepY);

        const tlAbove = tl >= threshold;
        const trAbove = tr >= threshold;
        const blAbove = bl >= threshold;
        const brAbove = br >= threshold;

        const config_val = (tlAbove ? 8 : 0) | (trAbove ? 4 : 0) | (brAbove ? 2 : 0) | (blAbove ? 1 : 0);

        if (config_val === 0 || config_val === 15) continue;

        // Interpolate edge crossings
        const lerp = (a: number, b: number) => {
          if (Math.abs(b - a) < 0.001) return 0.5;
          return (threshold - a) / (b - a);
        };

        const top = { x: x + lerp(tl, tr) * stepX, y };
        const right = { x: x + stepX, y: y + lerp(tr, br) * stepY };
        const bottom = { x: x + lerp(bl, br) * stepX, y: y + stepY };
        const left = { x, y: y + lerp(tl, bl) * stepY };

        const addSeg = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        };

        // Standard marching squares cases
        switch (config_val) {
          case 1: case 14: addSeg(left, bottom); break;
          case 2: case 13: addSeg(bottom, right); break;
          case 3: case 12: addSeg(left, right); break;
          case 4: case 11: addSeg(top, right); break;
          case 5: addSeg(left, top); addSeg(bottom, right); break;
          case 6: case 9: addSeg(top, bottom); break;
          case 7: case 8: addSeg(left, top); break;
          case 10: addSeg(top, right); addSeg(left, bottom); break;
        }
      }
    }

    // Convert segments to SVG path
    if (segments.length > 0) {
      const d = segments
        .map((s) => `M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} L ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`)
        .join(" ");
      contourPaths.push({ d, level: threshold });
    }
  }

  // Coordinate grid lines
  const gridLineCount = 6;

  // Peak markers — find local maxima
  const peaks: { x: number; y: number; h: number }[] = [];
  for (let r = 1; r < gridRows - 1; r++) {
    for (let c = 1; c < gridCols - 1; c++) {
      const h = heightMap[r][c];
      if (
        h > 0.5 &&
        h >= heightMap[r - 1][c] &&
        h >= heightMap[r + 1][c] &&
        h >= heightMap[r][c - 1] &&
        h >= heightMap[r][c + 1]
      ) {
        peaks.push({
          x: mapLeft + (c + 0.5) * cellW,
          y: mapTop + (r + 0.5) * cellH,
          h,
        });
      }
    }
  }

  // Compass rose position
  const compassX = mapRight - 45;
  const compassY = mapTop + 45;
  const compassR = 22;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Title block */}
      <text
        x={width / 2}
        y={height * 0.055}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 42 : 38}
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
        fontSize={size === "18x24" ? 18 : 16}
        fontWeight={400}
        letterSpacing="0.15em"
        fill={palette.metadata}
        style={{ textTransform: "uppercase" }}
      >
        {subtitle}
      </text>

      {/* Decorative line under title */}
      <line
        x1={width * 0.35}
        y1={height * 0.108}
        x2={width * 0.65}
        y2={height * 0.108}
        stroke={palette.metadata}
        strokeWidth={0.5}
        opacity={0.5}
      />

      {/* Map border */}
      <rect
        x={mapLeft}
        y={mapTop}
        width={mapW}
        height={mapH}
        fill="none"
        stroke={palette.foreground}
        strokeWidth={1.5}
        opacity={0.6}
      />

      {/* Inner border */}
      <rect
        x={mapLeft + 4}
        y={mapTop + 4}
        width={mapW - 8}
        height={mapH - 8}
        fill="none"
        stroke={palette.foreground}
        strokeWidth={0.5}
        opacity={0.25}
      />

      {/* Coordinate grid */}
      {Array.from({ length: gridLineCount + 1 }).map((_, i) => {
        const x = mapLeft + (i / gridLineCount) * mapW;
        return (
          <g key={`vgrid-${i}`}>
            <line
              x1={x}
              y1={mapTop}
              x2={x}
              y2={mapBottom}
              stroke={palette.metadata}
              strokeWidth={0.3}
              opacity={0.2}
            />
            {/* Tick labels */}
            <text
              x={x}
              y={mapBottom + 12}
              textAnchor="middle"
              fontFamily="'Geist Mono', 'Courier New', monospace"
              fontSize={7}
              fill={palette.metadata}
              opacity={0.4}
            >
              {(i * 60).toString().padStart(3, "0")}°
            </text>
          </g>
        );
      })}
      {Array.from({ length: gridLineCount + 1 }).map((_, i) => {
        const y = mapTop + (i / gridLineCount) * mapH;
        return (
          <g key={`hgrid-${i}`}>
            <line
              x1={mapLeft}
              y1={y}
              x2={mapRight}
              y2={y}
              stroke={palette.metadata}
              strokeWidth={0.3}
              opacity={0.2}
            />
            {/* Tick labels */}
            <text
              x={mapLeft - 6}
              y={y + 3}
              textAnchor="end"
              fontFamily="'Geist Mono', 'Courier New', monospace"
              fontSize={7}
              fill={palette.metadata}
              opacity={0.4}
            >
              {(90 - i * 30).toString()}°
            </text>
          </g>
        );
      })}

      {/* Contour lines */}
      {contourPaths.map((contour, i) => {
        const layerIdx = Math.min(
          palette.layers.length - 1,
          Math.floor((contour.level / 1) * palette.layers.length)
        );
        return (
          <path
            key={`contour-${i}`}
            d={contour.d}
            fill="none"
            stroke={palette.layers[layerIdx]}
            strokeWidth={contour.level > 0.6 ? 1.5 : 1}
            opacity={0.5 + contour.level * 0.3}
            strokeLinecap="round"
          />
        );
      })}

      {/* Filled regions for higher elevations */}
      {peaks.map((peak, i) => {
        const radius = 15 + peak.h * 25;
        const colorIdx = Math.min(palette.layers.length - 1, Math.floor(peak.h * palette.layers.length));
        return (
          <g key={`peak-${i}`}>
            {/* Concentric elevation rings */}
            {[0.8, 0.5, 0.3].map((scale, j) => (
              <ellipse
                key={`ring-${i}-${j}`}
                cx={peak.x}
                cy={peak.y}
                rx={radius * scale + rand() * 5}
                ry={radius * scale * 0.85 + rand() * 5}
                fill={palette.layers[Math.min(palette.layers.length - 1, colorIdx + j)]}
                opacity={0.12 + j * 0.05}
              />
            ))}
            {/* Peak cross marker */}
            <line
              x1={peak.x - 5}
              y1={peak.y}
              x2={peak.x + 5}
              y2={peak.y}
              stroke={palette.accent}
              strokeWidth={1}
              opacity={0.7}
            />
            <line
              x1={peak.x}
              y1={peak.y - 5}
              x2={peak.x}
              y2={peak.y + 5}
              stroke={palette.accent}
              strokeWidth={1}
              opacity={0.7}
            />
            {/* Elevation label */}
            <text
              x={peak.x + 8}
              y={peak.y - 8}
              fontFamily="'Geist Mono', 'Courier New', monospace"
              fontSize={7}
              fill={palette.accent}
              opacity={0.7}
            >
              {Math.round(peak.h * data.totalContributions * 0.1)}
            </text>
          </g>
        );
      })}

      {/* Scatter dots for low-activity areas */}
      {normalized.map((val, i) => {
        if (val < 0.05) return null;
        const dotCount = Math.floor(val * 5);
        return Array.from({ length: dotCount }).map((_, j) => {
          const x = mapLeft + rand() * mapW;
          const y = mapTop + rand() * mapH;
          return (
            <circle
              key={`dot-${i}-${j}`}
              cx={x}
              cy={y}
              r={0.8 + val * 1.5}
              fill={palette.layers[Math.floor(rand() * palette.layers.length)]}
              opacity={0.2 + val * 0.2}
            />
          );
        });
      })}

      {/* Compass rose */}
      <g opacity={0.5}>
        {/* Outer circle */}
        <circle
          cx={compassX}
          cy={compassY}
          r={compassR}
          fill="none"
          stroke={palette.foreground}
          strokeWidth={0.8}
        />
        <circle
          cx={compassX}
          cy={compassY}
          r={compassR * 0.7}
          fill="none"
          stroke={palette.foreground}
          strokeWidth={0.4}
        />
        {/* Cardinal points */}
        <polygon
          points={`${compassX},${compassY - compassR + 3} ${compassX - 4},${compassY} ${compassX},${compassY - 6}`}
          fill={palette.accent}
          opacity={0.8}
        />
        <polygon
          points={`${compassX},${compassY - compassR + 3} ${compassX + 4},${compassY} ${compassX},${compassY - 6}`}
          fill={palette.foreground}
          opacity={0.4}
        />
        <polygon
          points={`${compassX},${compassY + compassR - 3} ${compassX - 4},${compassY} ${compassX},${compassY + 6}`}
          fill={palette.foreground}
          opacity={0.3}
        />
        <polygon
          points={`${compassX},${compassY + compassR - 3} ${compassX + 4},${compassY} ${compassX},${compassY + 6}`}
          fill={palette.foreground}
          opacity={0.2}
        />
        {/* E/W points */}
        <line x1={compassX - compassR + 5} y1={compassY} x2={compassX - 6} y2={compassY} stroke={palette.foreground} strokeWidth={0.8} opacity={0.4} />
        <line x1={compassX + 6} y1={compassY} x2={compassX + compassR - 5} y2={compassY} stroke={palette.foreground} strokeWidth={0.8} opacity={0.4} />
        {/* N label */}
        <text
          x={compassX}
          y={compassY - compassR - 4}
          textAnchor="middle"
          fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
          fontSize={8}
          fontWeight={600}
          fill={palette.foreground}
          opacity={0.6}
        >
          N
        </text>
      </g>

      {/* Scale bar */}
      <g opacity={0.5}>
        <line
          x1={mapLeft + 15}
          y1={mapBottom - 20}
          x2={mapLeft + 85}
          y2={mapBottom - 20}
          stroke={palette.foreground}
          strokeWidth={1}
        />
        <line x1={mapLeft + 15} y1={mapBottom - 24} x2={mapLeft + 15} y2={mapBottom - 16} stroke={palette.foreground} strokeWidth={0.8} />
        <line x1={mapLeft + 85} y1={mapBottom - 24} x2={mapLeft + 85} y2={mapBottom - 16} stroke={palette.foreground} strokeWidth={0.8} />
        <line x1={mapLeft + 50} y1={mapBottom - 22} x2={mapLeft + 50} y2={mapBottom - 18} stroke={palette.foreground} strokeWidth={0.5} />
        <text
          x={mapLeft + 50}
          y={mapBottom - 27}
          textAnchor="middle"
          fontFamily="'Geist Mono', 'Courier New', monospace"
          fontSize={6}
          fill={palette.metadata}
        >
          {data.totalContributions > 500 ? "50 km" : "25 km"}
        </text>
      </g>

      {/* Bottom metadata */}
      {config.showStats && (
        <g>
          <line
            x1={width * 0.1}
            y1={height * 0.86}
            x2={width * 0.9}
            y2={height * 0.86}
            stroke={palette.metadata}
            strokeWidth={0.5}
            opacity={0.3}
          />
          <text
            x={width * 0.1}
            y={height * 0.89}
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={10}
            fill={palette.metadata}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {formatNumber(data.totalContributions)} CONTRIBUTIONS
          </text>
          <text
            x={width * 0.1}
            y={height * 0.91}
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={10}
            fill={palette.metadata}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {data.activeDays} ACTIVE DAYS
          </text>
          <text
            x={width * 0.9}
            y={height * 0.89}
            textAnchor="end"
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={10}
            fill={palette.metadata}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {data.longestStreak}d LONGEST STREAK
          </text>
          <text
            x={width * 0.9}
            y={height * 0.91}
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
            const y = height * 0.945;

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
        y={height * 0.985}
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
