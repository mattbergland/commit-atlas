import { ColorPalette } from "@/types/github";

/** Curated color palettes inspired by mid-century modern poster art */
export const PALETTES: ColorPalette[] = [
  {
    id: "desert-dusk",
    name: "Desert Dusk",
    background: "#F5E6D3",
    foreground: "#2C1810",
    accent: "#C4593E",
    layers: ["#E8C4A0", "#D4956B", "#C4593E", "#8B3A2A", "#5C2018", "#2C1810"],
    sun: "#F2C94C",
    metadata: "#8B7355",
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    background: "#E8EDF2",
    foreground: "#1A2332",
    accent: "#4A7C8F",
    layers: ["#C5D5E0", "#8FB0C4", "#4A7C8F", "#2D5F73", "#1A4052", "#1A2332"],
    sun: "#E6C27A",
    metadata: "#6B7B8D",
  },
  {
    id: "forest-morning",
    name: "Forest Morning",
    background: "#F0EDE5",
    foreground: "#1C2B1A",
    accent: "#5B7C4F",
    layers: ["#D4CEAA", "#A8B88C", "#5B7C4F", "#3D5C34", "#2A4023", "#1C2B1A"],
    sun: "#F0C75E",
    metadata: "#6B7355",
  },
  {
    id: "clay-earth",
    name: "Clay Earth",
    background: "#F2E8DC",
    foreground: "#2D1F14",
    accent: "#B85C38",
    layers: ["#E0C8A8", "#CC9B6D", "#B85C38", "#8C3F24", "#5E2A18", "#2D1F14"],
    sun: "#E8B84D",
    metadata: "#8B6F50",
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    background: "#1A1E2E",
    foreground: "#E8E0D4",
    accent: "#6B8EAE",
    layers: ["#4A5C78", "#3A4D6B", "#6B8EAE", "#8FAFC8", "#B0C8D8", "#D4DDE8"],
    sun: "#F2D06B",
    metadata: "#7A8494",
  },
  {
    id: "autumn-harvest",
    name: "Autumn Harvest",
    background: "#FAF0E4",
    foreground: "#2E1B0E",
    accent: "#D4763A",
    layers: ["#F0D4A8", "#E8B878", "#D4763A", "#B85428", "#7A3618", "#2E1B0E"],
    sun: "#F5D654",
    metadata: "#9B7850",
  },
  {
    id: "coastal-mist",
    name: "Coastal Mist",
    background: "#F0F2F0",
    foreground: "#1E2A28",
    accent: "#5E8B80",
    layers: ["#C8D8D0", "#98B8AC", "#5E8B80", "#3E6B60", "#2A4E45", "#1E2A28"],
    sun: "#E8C87A",
    metadata: "#6E8078",
  },
  {
    id: "volcanic-night",
    name: "Volcanic Night",
    background: "#1C1418",
    foreground: "#F0E4D8",
    accent: "#C85A3A",
    layers: ["#4A2830", "#6B3038", "#C85A3A", "#E87850", "#F0A070", "#F0D4B8"],
    sun: "#F0C040",
    metadata: "#8A7068",
  },
];

export function getPaletteById(id: string): ColorPalette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
