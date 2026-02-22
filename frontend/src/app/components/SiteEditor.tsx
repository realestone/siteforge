import React, { useState, useRef, useCallback, useEffect } from "react";
import { TopBar } from "./TopBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { PanelRight, X } from "lucide-react";

const MIN_BOQ_WIDTH = 320;
const MAX_BOQ_RATIO = 0.75; // max 75% of viewport
const DEFAULT_BOQ_RATIO = 0.3; // default 30%

// Main SiteForge editor with workflow and comments support
export const SiteEditor: React.FC = () => {
  const [boqOpen, setBoqOpen] = useState(false);
  const [boqWidth, setBoqWidth] = useState<number | null>(null); // null = use default ratio
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute actual width: stored px value or default ratio
  const getEffectiveWidth = useCallback(() => {
    if (boqWidth !== null) return boqWidth;
    const vw = window.innerWidth;
    return Math.max(MIN_BOQ_WIDTH, vw * DEFAULT_BOQ_RATIO);
  }, [boqWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const newWidth = vw - e.clientX;
      const clamped = Math.max(
        MIN_BOQ_WIDTH,
        Math.min(newWidth, vw * MAX_BOQ_RATIO),
      );
      setBoqWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <TopBar />

      <div ref={containerRef} className="flex-1 flex relative overflow-hidden">
        {/* Left panel — takes remaining space */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <LeftPanel />
        </div>

        {/* BOQ toggle tab — visible when panel is closed */}
        {!boqOpen && (
          <button
            onClick={() => setBoqOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-white border border-r-0 border-gray-300 rounded-l-lg px-2 py-3 shadow-sm hover:bg-gray-50 transition-colors"
            title="Open BOQ Live View"
          >
            <PanelRight className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-600 [writing-mode:vertical-lr] rotate-180">
              BOQ
            </span>
          </button>
        )}

        {/* BOQ right panel — resizable */}
        {boqOpen && (
          <div
            className="relative flex-shrink-0 border-l border-gray-200 overflow-hidden"
            style={{ width: getEffectiveWidth() }}
          >
            {/* Drag handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute left-0 top-0 bottom-0 w-1 z-20 cursor-col-resize transition-colors ${
                isDragging ? "bg-teal-500" : "hover:bg-teal-400"
              }`}
            />

            <div className="h-full relative">
              {/* Close button */}
              <button
                onClick={() => setBoqOpen(false)}
                className="absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-100 transition-colors"
                title="Close BOQ Live View"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
              <RightPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
