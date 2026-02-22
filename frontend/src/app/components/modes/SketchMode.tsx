import React, { useState, useCallback, useEffect } from "react";
import { X, Save, ZoomIn, ZoomOut } from "lucide-react";
import { Photo } from "../../types/site";
import {
  type SketchAnnotation,
  type SketchTool,
  type SketchStyle,
  type TelecomSticker,
  DEFAULT_STYLE,
  SKETCH_SHORTCUTS,
} from "../../types/sketch";
import { SketchCanvas } from "../sketch/SketchCanvas";
import { SketchToolbar } from "../sketch/SketchToolbar";
import { SketchStylePanel } from "../sketch/SketchStylePanel";
import { StickerBar } from "../sketch/StickerBar";

interface SketchModeProps {
  photo: Photo;
  onSave: (annotations: SketchAnnotation[]) => void;
  onClose: () => void;
}

const MAX_UNDO = 50;

export const SketchMode: React.FC<SketchModeProps> = ({
  photo,
  onSave,
  onClose,
}) => {
  const [annotations, setAnnotations] = useState<SketchAnnotation[]>([]);
  const [activeTool, setActiveTool] = useState<SketchTool>("arrow");
  const [activeStyle, setActiveStyle] = useState<SketchStyle>({
    ...DEFAULT_STYLE,
  });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<SketchAnnotation[][]>([]);
  const [redoStack, setRedoStack] = useState<SketchAnnotation[][]>([]);
  const [activeSticker, setActiveSticker] = useState<TelecomSticker | null>(
    null,
  );

  // Initialize from existing annotations (convert old format if needed)
  useEffect(() => {
    if (photo.annotations && photo.annotations.length > 0) {
      // Check if annotations are already in SketchAnnotation format
      const first = photo.annotations[0] as any;
      if (first.style && first.x1 !== undefined) {
        setAnnotations(photo.annotations as unknown as SketchAnnotation[]);
      }
      // Old Annotation format won't be loaded (incompatible raster-based format)
    }
    setUndoStack([[]]);
  }, [photo.annotations]);

  // Handle annotations change with undo tracking
  const handleAnnotationsChange = useCallback(
    (newAnnotations: SketchAnnotation[]) => {
      setAnnotations(newAnnotations);
      setUndoStack((prev) => {
        const next = [...prev, newAnnotations];
        return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
      });
      setRedoStack([]);
    },
    [],
  );

  const undo = useCallback(() => {
    if (undoStack.length <= 1) return;
    const prev = undoStack[undoStack.length - 2];
    setRedoStack((r) => [...r, annotations]);
    setAnnotations(prev);
    setUndoStack((s) => s.slice(0, -1));
  }, [undoStack, annotations]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, next]);
    setAnnotations(next);
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Tool shortcuts
      const tool = SKETCH_SHORTCUTS[e.key.toLowerCase()];
      if (tool) {
        setActiveTool(tool);
      }

      // Escape deselects
      if (e.key === "Escape") {
        setSelectedId(null);
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleSave = () => {
    onSave(annotations);
  };

  const handleStickerSelect = useCallback((sticker: TelecomSticker) => {
    setActiveSticker(sticker);
    setActiveTool("sticker");
  }, []);

  const handlePanChange = useCallback((x: number, y: number) => {
    setPanX(x);
    setPanY(y);
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Top bar */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-200 truncate max-w-64">
            {photo.autoFilename || photo.fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}
            className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">
            {zoomPercent}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
            className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Tool bar */}
        <SketchToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          canUndo={undoStack.length > 1}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
        />

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0">
          <SketchCanvas
            photoUrl={photo.fileUrl}
            annotations={annotations}
            activeTool={activeTool}
            activeStyle={activeStyle}
            zoom={zoom}
            panX={panX}
            panY={panY}
            selectedId={selectedId}
            onAnnotationsChange={handleAnnotationsChange}
            onSelectAnnotation={setSelectedId}
            onZoomChange={setZoom}
            onPanChange={handlePanChange}
          />
        </div>

        {/* Right: Style panel */}
        <SketchStylePanel
          style={activeStyle}
          activeTool={activeTool}
          onChange={setActiveStyle}
        />
      </div>

      {/* Bottom: Sticker bar (when sticker tool active) */}
      {activeTool === "sticker" && (
        <StickerBar onStickerSelect={handleStickerSelect} />
      )}
    </div>
  );
};
