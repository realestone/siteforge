import React from "react";
import type { SketchStyle, SketchTool } from "../../types/sketch";

interface SketchStylePanelProps {
  style: SketchStyle;
  activeTool: SketchTool;
  onChange: (style: SketchStyle) => void;
}

const COLOR_SWATCHES = [
  "#FF0000",
  "#0066FF",
  "#00AA00",
  "#FFCC00",
  "#FFFFFF",
  "#000000",
  "#FF6600",
  "#9900CC",
];

export const SketchStylePanel: React.FC<SketchStylePanelProps> = ({
  style,
  activeTool,
  onChange,
}) => {
  const showFill = activeTool === "rect" || activeTool === "circle" || activeTool === "zone";
  const showFontSize = activeTool === "text" || activeTool === "dimension";
  const showOpacity = activeTool === "zone";

  return (
    <div className="w-48 bg-gray-800 border-l border-gray-700 p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Stroke Color */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
          Color
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ ...style, strokeColor: c })}
              className={`w-9 h-9 rounded-lg border-2 transition-colors ${
                style.strokeColor === c
                  ? "border-blue-500 scale-110"
                  : "border-gray-600 hover:border-gray-400"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-gray-500">Custom:</span>
          <input
            type="color"
            value={style.strokeColor}
            onChange={(e) => onChange({ ...style, strokeColor: e.target.value })}
            className="h-7 w-7 rounded border border-gray-600 cursor-pointer bg-transparent"
          />
        </div>
      </div>

      {/* Fill Color */}
      {showFill && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Fill
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange({ ...style, fillColor: "transparent" })}
              className={`h-8 px-3 text-xs rounded border transition-colors ${
                style.fillColor === "transparent"
                  ? "border-blue-500 text-blue-400 bg-blue-900/30"
                  : "border-gray-600 text-gray-400 hover:border-gray-400"
              }`}
            >
              None
            </button>
            <input
              type="color"
              value={style.fillColor === "transparent" ? "#000000" : style.fillColor}
              onChange={(e) => onChange({ ...style, fillColor: e.target.value })}
              className="h-7 w-7 rounded border border-gray-600 cursor-pointer bg-transparent"
            />
          </div>
        </div>
      )}

      {/* Stroke Width */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
          Stroke: {style.strokeWidth}px
        </label>
        <input
          type="range"
          min={1}
          max={15}
          value={style.strokeWidth}
          onChange={(e) => onChange({ ...style, strokeWidth: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Font Size */}
      {showFontSize && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Font: {style.fontSize}px
          </label>
          <input
            type="range"
            min={12}
            max={48}
            value={style.fontSize}
            onChange={(e) => onChange({ ...style, fontSize: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
      )}

      {/* Opacity */}
      {showOpacity && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Opacity: {Math.round(style.opacity * 100)}%
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(style.opacity * 100)}
            onChange={(e) => onChange({ ...style, opacity: Number(e.target.value) / 100 })}
            className="w-full accent-blue-500"
          />
        </div>
      )}
    </div>
  );
};
