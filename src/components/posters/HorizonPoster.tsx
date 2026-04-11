"use client";

import { GitHubData, PosterConfig } from "@/types/github";
import {
  POSTER_VIEWBOX,
  getMonthName,
  formatNumber,
  generateTerrainPoints,
  aggregateContributions,
  seededRandom,
  hashString,
} from "@/lib/poster-utils";

interface HorizonPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

export default function HorizonPoster({ data, config }: HorizonPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year} Contribution Landscape`);

  // Generate terrain data from contributions
  const bucketCount = 48;
  const normalized = aggregateContributions(data.contributions, bucketCount);
  const rand = seededRandom(hashString(data.username + data.year));

  // Create 5 terrain layers with decreasing amplitude
  const layers = palette.layers.slice(0, 6);
  const layerCount = Math.min(layers.length, 5);
  const terrainStartY = height * 0.42;
  const terrainEndY = height * 0.82;
  const layerSpacing = (terrainEndY - terrainStartY) / layerCount;

  // Sun position based on total contributions
  const sunX = width * 0.5 + (rand() - 0.5) * width * 0.3;
  const sunY = height * 0.22 + rand() * height * 0.08;
  const sunRadius = 40 + (data.totalContributions / 2000) * 20;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={palette.background} />

      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.layers[0]} stopOpacity={0.3} />
          <stop
            offset="100%"
            stopColor={palette.background}
            stopOpacity={0}
          />
        </linearGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor={palette.sun || palette.accent}
            stopOpacity={0.4}
          />
          <stop
            offset="100%"
            stopColor={palette.sun || palette.accent}
            stopOpacity={0}
          />
        </radialGradient>
      </defs>

      <rect
        width={width}
        height={terrainStartY}
        fill="url(#sky-gradient)"
      />

      {/* Sun / moon */}
      <circle
        cx={sunX}
        cy={sunY}
        r={sunRadius * 2.5}
        fill="url(#sun-glow)"
      />
      <circle
        cx={sunX}
        cy={sunY}
        r={sunRadius}
        fill={palette.sun || palette.accent}
        opacity={0.85}
      />

      {/* Terrain layers - each influenced by contribution data */}
      {Array.from({ length: layerCount }).map((_, i) => {
        const baseY = terrainStartY + i * layerSpacing;
        const amplitude = 60 + (layerCount - i) * 15;
        const layerData = normalized.map((v, j) => {
          // Each layer gets a shifted version of the data + some randomness
          const shift = (j + i * 7) % bucketCount;
          const base = normalized[shift] || 0;
          const noise = (rand() - 0.5) * 0.3;
          return Math.max(0, Math.min(1, base * (0.4 + i * 0.15) + v * 0.3 + noise));
        });

        const pathD = generateTerrainPoints(
          layerData,
          width,
          baseY + layerSpacing,
          amplitude,
          0.35
        );

        return (
          <path
            key={`terrain-${i}`}
            d={pathD}
            fill={layers[i] || palette.accent}
            opacity={0.85 + i * 0.03}
          />
        );
      })}

      {/* Final foreground layer */}
      <rect
        x={0}
        y={terrainEndY}
        width={width}
        height={height - terrainEndY}
        fill={layers[layers.length - 1] || palette.foreground}
      />

      {/* Title block */}
      <text
        x={width / 2}
        y={height * 0.065}
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
        y={height * 0.1}
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
        y1={height * 0.12}
        x2={width * 0.65}
        y2={height * 0.12}
        stroke={palette.metadata}
        strokeWidth={0.5}
        opacity={0.5}
      />

      {/* Bottom metadata */}
      {config.showStats && (
        <g>
          <text
            x={width * 0.08}
            y={height * 0.92}
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={11}
            fill={palette.background}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {formatNumber(data.totalContributions)} CONTRIBUTIONS
          </text>
          <text
            x={width * 0.08}
            y={height * 0.94}
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={11}
            fill={palette.background}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {data.activeDays} ACTIVE DAYS
          </text>
          <text
            x={width * 0.92}
            y={height * 0.92}
            textAnchor="end"
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={11}
            fill={palette.background}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {data.longestStreak} DAY STREAK
          </text>
          <text
            x={width * 0.92}
            y={height * 0.94}
            textAnchor="end"
            fontFamily="'Geist Mono', 'Courier New', monospace"
            fontSize={11}
            fill={palette.background}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {data.reposContributed} REPOS
          </text>
        </g>
      )}

      {/* Language bar */}
      {config.showLanguages && data.topLanguages.length > 0 && (
        <g>
          {(() => {
            const barY = height * 0.96;
            const barHeight = 3;
            const barStart = width * 0.08;
            const barWidth = width * 0.84;
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
                  rx={i === 0 ? 1.5 : 0}
                />
              );
            });
          })()}
        </g>
      )}

      {/* Commit Atlas watermark */}
      <text
        x={width / 2}
        y={height * 0.985}
        textAnchor="middle"
        fontFamily="'Geist Mono', 'Courier New', monospace"
        fontSize={8}
        fill={palette.background}
        opacity={0.4}
        letterSpacing="0.2em"
      >
        COMMIT ATLAS
      </text>
    </svg>
  );
}
