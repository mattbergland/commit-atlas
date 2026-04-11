import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { PosterSize } from "@/types/github";

/** Poster dimensions in pixels at 300 DPI */
const POSTER_DIMENSIONS: Record<PosterSize, { width: number; height: number }> =
  {
    "18x24": { width: 5400, height: 7200 },
    "24x36": { width: 7200, height: 10800 },
  };

/** Poster dimensions in inches */
const POSTER_INCHES: Record<PosterSize, { width: number; height: number }> = {
  "18x24": { width: 18, height: 24 },
  "24x36": { width: 24, height: 36 },
};

/** Export SVG element as high-resolution PNG */
export async function exportToPng(
  svgElement: HTMLElement,
  size: PosterSize,
  filename: string
): Promise<void> {
  const dims = POSTER_DIMENSIONS[size];

  const dataUrl = await toPng(svgElement, {
    width: dims.width,
    height: dims.height,
    pixelRatio: 1,
    style: {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
    },
  });

  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

/** Export SVG element as PDF */
export async function exportToPdf(
  svgElement: HTMLElement,
  size: PosterSize,
  filename: string
): Promise<void> {
  const dims = POSTER_DIMENSIONS[size];
  const inches = POSTER_INCHES[size];

  const dataUrl = await toPng(svgElement, {
    width: dims.width,
    height: dims.height,
    pixelRatio: 1,
    style: {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [inches.width, inches.height],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, inches.width, inches.height);
  pdf.save(`${filename}.pdf`);
}
