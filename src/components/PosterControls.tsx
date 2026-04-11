"use client";

import { PosterConfig, PosterVariant, PosterSize } from "@/types/github";
import { PALETTES } from "@/lib/palettes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Layers, Grid3X3, Route, Map } from "lucide-react";

interface PosterControlsProps {
  config: PosterConfig;
  onChange: (config: PosterConfig) => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onSaveConfig: () => void;
  isExporting: boolean;
}

const VARIANT_OPTIONS: { value: PosterVariant; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "horizon", label: "Horizon", icon: <Layers className="w-4 h-4" />, desc: "Layered landscape" },
  { value: "grid", label: "Grid Modern", icon: <Grid3X3 className="w-4 h-4" />, desc: "Geometric blocks" },
  { value: "path", label: "Path", icon: <Route className="w-4 h-4" />, desc: "Journey line" },
  { value: "atlas", label: "Atlas", icon: <Map className="w-4 h-4" />, desc: "Topographic map" },
];

const SIZE_OPTIONS: { value: PosterSize; label: string }[] = [
  { value: "18x24", label: "18 × 24 in" },
  { value: "24x36", label: "24 × 36 in" },
];

export default function PosterControls({
  config,
  onChange,
  onExportPng,
  onExportPdf,
  onSaveConfig,
  isExporting,
}: PosterControlsProps) {
  const update = (partial: Partial<PosterConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="space-y-6">
      {/* Style Variant */}
      <div className="space-y-3">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Style
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {VARIANT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ variant: opt.value })}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all cursor-pointer ${
                config.variant === opt.value
                  ? "border-foreground bg-foreground/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {opt.icon}
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Color Palette */}
      <div className="space-y-3">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Palette
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {PALETTES.map((pal) => (
            <button
              key={pal.id}
              onClick={() => update({ palette: pal })}
              className={`group relative rounded-lg border p-1.5 transition-all cursor-pointer ${
                config.palette.id === pal.id
                  ? "border-foreground ring-1 ring-foreground/20"
                  : "border-border hover:border-foreground/30"
              }`}
              title={pal.name}
            >
              <div className="flex h-6 rounded overflow-hidden">
                <div
                  className="flex-1"
                  style={{ backgroundColor: pal.background }}
                />
                {pal.layers.slice(0, 3).map((color, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <div
                  className="flex-1"
                  style={{ backgroundColor: pal.accent }}
                />
              </div>
              <p className="text-[9px] text-center mt-1 text-muted-foreground truncate">
                {pal.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Title & Subtitle */}
      <div className="space-y-3">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Text
        </Label>
        <div className="space-y-2">
          <Input
            placeholder="Title (default: display name)"
            value={config.title}
            onChange={(e) => update({ title: e.target.value })}
            className="text-sm"
          />
          <Input
            placeholder="Subtitle (default: year)"
            value={config.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Poster Size */}
      <div className="space-y-3">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Size
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ size: opt.value })}
              className={`rounded-lg border px-3 py-2 text-sm transition-all cursor-pointer ${
                config.size === opt.value
                  ? "border-foreground bg-foreground/5 text-foreground font-medium"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-3">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Display
        </Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Show stats</span>
            <Switch
              checked={config.showStats}
              onCheckedChange={(checked) => update({ showStats: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Show languages
            </span>
            <Switch
              checked={config.showLanguages}
              onCheckedChange={(checked) => update({ showLanguages: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Export */}
      <div className="space-y-3">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Export
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportPng}
            disabled={isExporting}
            className="rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? "Exporting…" : "PNG"}
          </button>
          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className="rounded-lg border border-foreground text-foreground px-4 py-2.5 text-sm font-medium transition-all hover:bg-foreground/5 disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? "Exporting…" : "PDF"}
          </button>
        </div>
        <button
          onClick={onSaveConfig}
          className="w-full rounded-lg border border-border text-muted-foreground px-4 py-2 text-xs transition-all hover:border-foreground/30 cursor-pointer"
        >
          Save config as JSON
        </button>
      </div>
    </div>
  );
}
