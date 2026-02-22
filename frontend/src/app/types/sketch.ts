export type SketchTool =
  | "select"
  | "arrow"
  | "line"
  | "rect"
  | "circle"
  | "text"
  | "dimension"
  | "freehand"
  | "zone"
  | "sticker";

export interface SketchStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  opacity: number;
}

export interface SketchAnnotation {
  id: string;
  type: SketchTool;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  points?: { x: number; y: number }[];
  text?: string;
  stickerId?: string;
  style: SketchStyle;
  rotation?: number;
  locked?: boolean;
}

export const DEFAULT_STYLE: SketchStyle = {
  strokeColor: "#FF0000",
  fillColor: "transparent",
  strokeWidth: 3,
  fontSize: 16,
  opacity: 1,
};

export interface TelecomSticker {
  id: string;
  label: string;
  category: "sector" | "equipment" | "safety";
  color: string;
  icon: string;
}

export const TELECOM_STICKERS: TelecomSticker[] = [
  { id: "sector-a", label: "Sector A", category: "sector", color: "#FF0000", icon: "\u2B06" },
  { id: "sector-b", label: "Sector B", category: "sector", color: "#0066FF", icon: "\u2B06" },
  { id: "sector-c", label: "Sector C", category: "sector", color: "#00AA00", icon: "\u2B06" },
  { id: "cabinet", label: "Cabinet", category: "equipment", color: "#333333", icon: "\uD83D\uDCE6" },
  { id: "acdb", label: "ACDB", category: "equipment", color: "#FF6600", icon: "\u26A1" },
  { id: "crane", label: "Crane", category: "safety", color: "#FF0000", icon: "\uD83C\uDFD7" },
  { id: "gps", label: "GPS", category: "equipment", color: "#9900CC", icon: "\uD83D\uDCE1" },
  { id: "rrh", label: "RRH", category: "equipment", color: "#666666", icon: "\u25A2" },
  { id: "aqqy", label: "AQQY", category: "equipment", color: "#0099CC", icon: "\u25A3" },
  { id: "gnd", label: "GND", category: "safety", color: "#006600", icon: "\u23DA" },
];

export const SKETCH_SHORTCUTS: Record<string, SketchTool> = {
  v: "select",
  a: "arrow",
  l: "line",
  r: "rect",
  c: "circle",
  t: "text",
  d: "dimension",
  f: "freehand",
  z: "zone",
  s: "sticker",
};
