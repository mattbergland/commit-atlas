"use client";

import { forwardRef } from "react";
import { GitHubData, PosterConfig } from "@/types/github";
import HorizonPoster from "./HorizonPoster";
import GridPoster from "./GridPoster";
import PathPoster from "./PathPoster";

interface PosterRendererProps {
  data: GitHubData;
  config: PosterConfig;
}

const PosterRenderer = forwardRef<HTMLDivElement, PosterRendererProps>(
  function PosterRenderer({ data, config }, ref) {
    const variant = config.variant;

    return (
      <div
        ref={ref}
        className="poster-render-target"
        style={{
          aspectRatio: config.size === "18x24" ? "3/4" : "2/3",
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        {variant === "horizon" && <HorizonPoster data={data} config={config} />}
        {variant === "grid" && <GridPoster data={data} config={config} />}
        {variant === "path" && <PathPoster data={data} config={config} />}
      </div>
    );
  }
);

export default PosterRenderer;
