"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seededRandom, hashString } from "@/lib/poster-utils";

interface Petal {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
  opacity: number;
}

interface AccentDot {
  cx: number;
  cy: number;
  r: number;
  color: string;
}

/**
 * BloomReveal — Full-page interactive layer that reveals Bloom-style organic
 * petal art underneath as the user moves their cursor. Uses CSS mask-image
 * with a radial gradient for the flashlight reveal effect.
 *
 * Mouse tracking is done via a parent wrapper that captures events across
 * the entire section, while the art layer is pointer-events-none so it
 * doesn't block interactive elements (inputs, buttons, links).
 */
export default function BloomReveal() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number>(0);
  const targetPos = useRef<{ x: number; y: number } | null>(null);
  const currentPos = useRef<{ x: number; y: number } | null>(null);

  // Track container dimensions
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const updateDimensions = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Smooth animation loop for cursor following
  const animate = useCallback(() => {
    if (targetPos.current) {
      if (!currentPos.current) {
        currentPos.current = { ...targetPos.current };
      } else {
        const lerp = 0.15;
        currentPos.current.x += (targetPos.current.x - currentPos.current.x) * lerp;
        currentPos.current.y += (targetPos.current.y - currentPos.current.y) * lerp;
      }
      setMousePos({ ...currentPos.current });
    } else if (currentPos.current) {
      currentPos.current = null;
      setMousePos(null);
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // Track mouse via parent element — the wrapper's parentElement is the
  // <main> that contains both the reveal layer and the interactive content.
  // We listen on the parent so events captured by child buttons/inputs
  // still bubble up and give us coordinates.
  useEffect(() => {
    const parent = wrapperRef.current?.parentElement;
    if (!parent) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      targetPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const onLeave = () => {
      targetPos.current = null;
    };

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Memoize art generation so it doesn't re-run on every mouse move
  const { petals, dots } = useMemo(
    () => generateBloomArt(dimensions.width, dimensions.height),
    [dimensions.width, dimensions.height]
  );

  const bgColor = "#2C1810";
  const petalColor = "#F5E6D3";

  const revealRadius = 200;
  const maskStyle: React.CSSProperties = mousePos
    ? {
        maskImage: `radial-gradient(circle ${revealRadius}px at ${mousePos.x}px ${mousePos.y}px, black 0%, black 30%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(circle ${revealRadius}px at ${mousePos.x}px ${mousePos.y}px, black 0%, black 30%, transparent 100%)`,
      }
    : {
        maskImage: "radial-gradient(circle 0px at 0px 0px, black 0%, transparent 0%)",
        WebkitMaskImage: "radial-gradient(circle 0px at 0px 0px, black 0%, transparent 0%)",
      };

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* Art layer */}
      <div
        className="absolute inset-0"
        style={{
          ...maskStyle,
          opacity: mousePos ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {dimensions.width > 0 && dimensions.height > 0 && (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <rect width={dimensions.width} height={dimensions.height} fill={bgColor} />

            {petals.map((p, i) => (
              <ellipse
                key={`p-${i}`}
                cx={p.cx}
                cy={p.cy}
                rx={p.rx}
                ry={p.ry}
                transform={`rotate(${p.rotation} ${p.cx} ${p.cy})`}
                fill={petalColor}
                opacity={p.opacity}
              />
            ))}

            {dots.map((d, i) => (
              <circle
                key={`d-${i}`}
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                fill={d.color}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * Generate Bloom-style petal art that tiles across the given dimensions.
 * Uses the same golden-angle spiral logic as BloomPoster but adapted
 * for a full-page decorative background.
 */
function generateBloomArt(
  width: number,
  height: number
): { petals: Petal[]; dots: AccentDot[] } {
  if (width === 0 || height === 0) return { petals: [], dots: [] };

  const rand = seededRandom(hashString("commit-atlas-landing-bloom-2026"));
  const petals: Petal[] = [];
  const dots: AccentDot[] = [];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // Accent dot colors — warm earthy tones
  const dotColors = ["#C4593E", "#D4763A", "#5B7C4F", "#4A7C8F", "#E8A820"];

  // Generate several flower clusters spread across the full page
  const clusterCount = 16;
  for (let c = 0; c < clusterCount; c++) {
    const angle = c * goldenAngle + rand() * 0.5;
    const spiralRadius = Math.min(width, height) * 0.1 + (c / clusterCount) * Math.min(width, height) * 0.4;
    const cx = width / 2 + Math.cos(angle) * spiralRadius * (width / height);
    const cy = height / 2 + Math.sin(angle) * spiralRadius * 0.8;

    // Intensity varies per cluster
    const intensity = 0.4 + rand() * 0.6;
    const petalCount = Math.floor(3 + intensity * 5);
    const basePetalLength = 30 + intensity * 60;
    const basePetalWidth = basePetalLength * (0.25 + rand() * 0.15);

    for (let p = 0; p < petalCount; p++) {
      const petalAngle = (p / petalCount) * Math.PI * 2 + rand() * 0.5;
      const petalDist = basePetalLength * 0.3 + rand() * basePetalLength * 0.25;

      const px = cx + Math.cos(petalAngle) * petalDist;
      const py = cy + Math.sin(petalAngle) * petalDist;

      const rotation = (petalAngle * 180) / Math.PI + (rand() - 0.5) * 40;
      const sizeVar = 0.6 + rand() * 0.8;

      petals.push({
        cx: px,
        cy: py,
        rx: basePetalLength * sizeVar,
        ry: basePetalWidth * sizeVar,
        rotation,
        opacity: 0.7 + rand() * 0.3,
      });
    }

    // Accent dots for some clusters
    if (rand() < 0.5) {
      const dotAngle = rand() * Math.PI * 2;
      const dotDist = basePetalLength * 0.6 + rand() * 30;
      dots.push({
        cx: cx + Math.cos(dotAngle) * dotDist,
        cy: cy + Math.sin(dotAngle) * dotDist,
        r: 4 + rand() * 6,
        color: dotColors[Math.floor(rand() * dotColors.length)],
      });
    }
  }

  // Add scattered standalone petals for organic edge coverage
  const scatterCount = 8 + Math.floor(rand() * 6);
  for (let i = 0; i < scatterCount; i++) {
    const ex = rand() * width;
    const ey = rand() * height;
    const length = 30 + rand() * 50;

    petals.push({
      cx: ex,
      cy: ey,
      rx: length,
      ry: length * (0.2 + rand() * 0.15),
      rotation: rand() * 360,
      opacity: 0.5 + rand() * 0.3,
    });
  }

  // Sort by size for layering
  petals.sort((a, b) => b.rx * b.ry - a.rx * a.ry);

  return { petals, dots };
}
