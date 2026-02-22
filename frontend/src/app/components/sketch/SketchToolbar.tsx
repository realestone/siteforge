import React from "react";
import {
  MousePointer2,
  MoveRight,
  Minus,
  Square,
  Circle,
  Type,
  Ruler,
  Pencil,
  BoxSelect,
  Sticker,
  Undo,
  Redo,
} from "lucide-react";
import type { SketchTool } from "../../types/sketch";

interface SketchToolbarProps {
  activeTool: SketchTool;
  onToolChange: (tool: SketchTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const TOOLS: { id: SketchTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: "select", icon: <MousePointer2 className="h-5 w-5" />, label: "Select", shortcut: "V" },
  { id: "arrow", icon: <MoveRight className="h-5 w-5" />, label: "Arrow", shortcut: "A" },
  { id: "line", icon: <Minus className="h-5 w-5" />, label: "Line", shortcut: "L" },
  { id: "rect", icon: <Square className="h-5 w-5" />, label: "Rectangle", shortcut: "R" },
  { id: "circle", icon: <Circle className="h-5 w-5" />, label: "Circle", shortcut: "C" },
  { id: "text", icon: <Type className="h-5 w-5" />, label: "Text", shortcut: "T" },
  { id: "dimension", icon: <Ruler className="h-5 w-5" />, label: "Dimension", shortcut: "D" },
  { id: "freehand", icon: <Pencil className="h-5 w-5" />, label: "Freehand", shortcut: "F" },
  { id: "zone", icon: <BoxSelect className="h-5 w-5" />, label: "Zone", shortcut: "Z" },
  { id: "sticker", icon: <Sticker className="h-5 w-5" />, label: "Sticker", shortcut: "S" },
];

export const SketchToolbar: React.FC<SketchToolbarProps> = ({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-1">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => onToolChange(t.id)}
          title={`${t.label} (${t.shortcut})`}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            activeTool === t.id
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-8 h-px bg-gray-700 my-2" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Undo className="h-5 w-5" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Redo className="h-5 w-5" />
      </button>
    </div>
  );
};
