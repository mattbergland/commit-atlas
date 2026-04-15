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

interface BloomPosterProps {
  data: GitHubData;
  config: PosterConfig;
}

/**
 * Bloom — Mid-century organic poster with overlapping elliptical leaf/petal
 * shapes and small colored accent dots. Contribution intensity determines
 * petal size and rotation. Clusters of petals form flower-like compositions.
 * Inspired by mid-century botanical illustration and Scandinavian design.
 */
export default function BloomPoster({ data, config }: BloomPosterProps) {
  const { palette, size } = config;
  const vb = POSTER_VIEWBOX[size];
  const { width, height } = vb;

  const title = config.title || data.displayName || data.username;
  const subtitle =
    config.subtitle ||
    (data.month
      ? `${getMonthName(data.month)} ${data.year}`
      : `${data.year}`);

  const rand = seededRandom(hashString(data.username + data.year + "bloom"));

  // Aggregate contributions into 12 buckets (months or periods)
  const bucketCount = 12;
  const buckets = aggregateContributions(data.contributions, bucketCount);

  // Art area
  const marginX = width * 0.08;
  const marginTop = height * 0.12;
  const artAreaW = width - marginX * 2;
  const artAreaH = height * 0.62;
  const centerX = width / 2;
  const centerY = marginTop + artAreaH / 2;

  // Generate flower clusters — each bucket creates a cluster of petals
  interface Petal {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rotation: number;
    isAccent: boolean;
  }

  interface AccentDot {
    cx: number;
    cy: number;
    r: number;
    color: string;
  }

  const petals: Petal[] = [];
  const accentDots: AccentDot[] = [];

  // Find peak buckets for accent coloring
  const ranked = buckets.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const accentIndices = new Set(ranked.slice(0, 3).map((item) => item.i));

  // Place flower clusters in an organic arrangement
  // Use golden angle spiral for natural-feeling placement
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

  for (let i = 0; i < bucketCount; i++) {
    const intensity = buckets[i];
    if (intensity < 0.05) continue;

    // Position using golden angle spiral with some randomness
    const angle = i * goldenAngle + rand() * 0.3;
    const radius = artAreaW * 0.15 + (i / bucketCount) * artAreaW * 0.25 + rand() * artAreaW * 0.05;
    const clusterCx = centerX + Math.cos(angle) * radius * 0.8;
    const clusterCy = centerY + Math.sin(angle) * radius * 0.6;

    // Number of petals per cluster based on intensity
    const petalCount = Math.floor(2 + intensity * 4);
    const isAccentCluster = accentIndices.has(i);

    // Base petal size scales with intensity
    const basePetalLength = 40 + intensity * 80;
    const basePetalWidth = basePetalLength * (0.28 + rand() * 0.12);

    for (let p = 0; p < petalCount; p++) {
      // Distribute petals around the cluster center like a flower
      const petalAngle = (p / petalCount) * Math.PI * 2 + rand() * 0.4;
      const petalDist = basePetalLength * 0.3 + rand() * basePetalLength * 0.2;

      const px = clusterCx + Math.cos(petalAngle) * petalDist;
      const py = clusterCy + Math.sin(petalAngle) * petalDist;

      // Rotation follows the angle from center, creating a radial pattern
      const rotation = (petalAngle * 180) / Math.PI + (rand() - 0.5) * 30;

      // Size variation
      const sizeVar = 0.7 + rand() * 0.6;
      const rx = basePetalLength * sizeVar;
      const ry = basePetalWidth * sizeVar;

      petals.push({
        cx: px,
        cy: py,
        rx,
        ry,
        rotation,
        isAccent: false, // petals use foreground color like the reference
      });
    }

    // Add a small accent dot near each cluster (like the reference image)
    if (isAccentCluster || rand() < 0.3) {
      const dotAngle = rand() * Math.PI * 2;
      const dotDist = basePetalLength * 0.8 + rand() * 30;
      const dotColors = palette.layers.length > 0
        ? palette.layers
        : [palette.accent];
      accentDots.push({
        cx: clusterCx + Math.cos(dotAngle) * dotDist,
        cy: clusterCy + Math.sin(dotAngle) * dotDist,
        r: 8 + rand() * 8,
        color: dotColors[Math.floor(rand() * dotColors.length)],
      });
    }
  }

  // Add a few extra standalone petals for organic feel (like the reference)
  const extraPetals = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < extraPetals; i++) {
    const ex = marginX + rand() * artAreaW;
    const ey = marginTop + rand() * artAreaH;
    const rotation = rand() * 360;
    const length = 50 + rand() * 70;

    petals.push({
      cx: ex,
      cy: ey,
      rx: length,
      ry: length * (0.25 + rand() * 0.15),
      rotation,
      isAccent: false,
    });
  }

  // Sort petals by size (larger first) for a nice layering effect
  petals.sort((a, b) => b.rx * b.ry - a.rx * a.ry);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background — dark like the reference image */}
      <rect width={width} height={height} fill={palette.foreground} />

      {/* Title — light text on dark background */}
      <text
        x={width / 2}
        y={height * 0.055}
        textAnchor="middle"
        fontFamily="'Geist', 'Helvetica Neue', Arial, sans-serif"
        fontSize={size === "18x24" ? 48 : 42}
        fontWeight={800}
        letterSpacing="0.06em"
        fill={palette.background}
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
        fill={palette.background}
        opacity={0.6}
        style={{ textTransform: "uppercase" }}
      >
        {subtitle}
      </text>

      {/* Petal shapes — cream/light colored on dark background */}
      <g>
        {petals.map((petal, i) => (
          <ellipse
            key={`petal-${i}`}
            cx={petal.cx}
            cy={petal.cy}
            rx={petal.rx}
            ry={petal.ry}
            transform={`rotate(${petal.rotation} ${petal.cx} ${petal.cy})`}
            fill={petal.isAccent ? palette.accent : palette.background}
          />
        ))}
      </g>

      {/* Accent dots — small colored circles scattered in negative space */}
      <g>
        {accentDots.map((dot, i) => (
          <circle
            key={`dot-${i}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={dot.color}
          />
        ))}
      </g>

      {/* Stats section — light text on dark background */}
      {config.showStats && (
        <g>
          <line
            x1={marginX}
            y1={height * 0.82}
            x2={width - marginX}
            y2={height * 0.82}
            stroke={palette.background}
            strokeWidth={0.5}
            opacity={0.2}
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
                  fill={palette.background}
                >
                  {stat.value}
                </text>
                <text
                  x={x}
                  y={height * 0.89}
                  textAnchor="middle"
                  fontFamily="'Geist Mono', 'Courier New', monospace"
                  fontSize={8}
                  fill={palette.background}
                  opacity={0.5}
                  letterSpacing="0.1em"
                >
                  {stat.label}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Language legend — dots with labels */}
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
                  fill={palette.background}
                  opacity={0.6}
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
        fill={palette.background}
        opacity={0.3}
        letterSpacing="0.2em"
      >
        COMMIT ATLAS
      </text>
    </svg>
  );
}
