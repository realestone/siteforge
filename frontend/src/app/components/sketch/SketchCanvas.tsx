import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  type SketchAnnotation,
  type SketchTool,
  type SketchStyle,
  TELECOM_STICKERS,
} from "../../types/sketch";

interface SketchCanvasProps {
  photoUrl: string;
  annotations: SketchAnnotation[];
  activeTool: SketchTool;
  activeStyle: SketchStyle;
  zoom: number;
  panX: number;
  panY: number;
  selectedId: string | null;
  onAnnotationsChange: (annotations: SketchAnnotation[]) => void;
  onSelectAnnotation: (id: string | null) => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (x: number, y: number) => void;
}

// Generate unique ID for annotations
function uid(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const SketchCanvas: React.FC<SketchCanvasProps> = ({
  photoUrl,
  annotations,
  activeTool,
  activeStyle,
  zoom,
  panX,
  panY,
  selectedId,
  onAnnotationsChange,
  onSelectAnnotation,
  onZoomChange,
  onPanChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  });
  const textInputRef = useRef<HTMLInputElement>(null);

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = photoUrl;
  }, [photoUrl]);

  // Convert screen coords to image coords
  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const x = (clientX - rect.left - panX) / zoom;
      const y = (clientY - rect.top - panY) / zoom;
      return { x, y };
    },
    [zoom, panX, panY],
  );

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(5, Math.max(0.1, zoom * delta));
      onZoomChange(newZoom);
    },
    [zoom, onZoomChange],
  );

  // Mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Space+click or middle button = pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, px: panX, py: panY });
        return;
      }

      if (e.button !== 0) return;
      const pos = toImageCoords(e.clientX, e.clientY);

      if (activeTool === "select") {
        // Check if clicking on an annotation
        const clicked = findAnnotationAt(annotations, pos.x, pos.y);
        onSelectAnnotation(clicked?.id || null);
        return;
      }

      if (activeTool === "text" || activeTool === "dimension") {
        if (!drawing) {
          setDrawStart(pos);
          setDrawing(true);
          if (activeTool === "text") {
            setTextInput({ x: e.clientX, y: e.clientY, visible: true });
            setTimeout(() => textInputRef.current?.focus(), 50);
            setDrawing(false);
          }
        }
        return;
      }

      if (activeTool === "sticker") {
        // Place sticker at click position
        const newAnn: SketchAnnotation = {
          id: uid(),
          type: "sticker",
          x1: pos.x,
          y1: pos.y,
          stickerId: "sector-a",
          text: "Sector A",
          style: { ...activeStyle },
        };
        onAnnotationsChange([...annotations, newAnn]);
        onSelectAnnotation(newAnn.id);
        return;
      }

      setDrawStart(pos);
      setDrawCurrent(pos);
      setDrawing(true);
      if (activeTool === "freehand") {
        setFreehandPoints([pos]);
      }
    },
    [activeTool, activeStyle, annotations, drawing, panX, panY, toImageCoords, onAnnotationsChange, onSelectAnnotation],
  );

  // Mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStart) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        onPanChange(panStart.px + dx, panStart.py + dy);
        return;
      }

      if (!drawing || !drawStart) return;
      const pos = toImageCoords(e.clientX, e.clientY);
      setDrawCurrent(pos);

      if (activeTool === "freehand") {
        setFreehandPoints((prev) => [...prev, pos]);
      }
    },
    [drawing, drawStart, isPanning, panStart, activeTool, toImageCoords, onPanChange],
  );

  // Mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (!drawing || !drawStart || !drawCurrent) {
      setDrawing(false);
      return;
    }

    const newAnn: SketchAnnotation = {
      id: uid(),
      type: activeTool,
      x1: drawStart.x,
      y1: drawStart.y,
      x2: drawCurrent.x,
      y2: drawCurrent.y,
      style: { ...activeStyle },
    };

    if (activeTool === "freehand") {
      newAnn.points = [...freehandPoints];
      setFreehandPoints([]);
    }

    if (activeTool === "dimension") {
      const dx = drawCurrent.x - drawStart.x;
      const dy = drawCurrent.y - drawStart.y;
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
      newAnn.text = `${dist}px`;
    }

    // Only create if there's actual movement (not just a click)
    const dx = Math.abs((drawCurrent?.x || 0) - drawStart.x);
    const dy = Math.abs((drawCurrent?.y || 0) - drawStart.y);
    if (dx > 3 || dy > 3 || activeTool === "freehand") {
      onAnnotationsChange([...annotations, newAnn]);
    }

    setDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [drawing, drawStart, drawCurrent, activeTool, activeStyle, annotations, freehandPoints, isPanning, onAnnotationsChange]);

  // Text input submit
  const handleTextSubmit = useCallback(
    (text: string) => {
      if (!drawStart || !text.trim()) {
        setTextInput((prev) => ({ ...prev, visible: false }));
        return;
      }
      const newAnn: SketchAnnotation = {
        id: uid(),
        type: "text",
        x1: drawStart.x,
        y1: drawStart.y,
        text: text.trim(),
        style: { ...activeStyle },
      };
      onAnnotationsChange([...annotations, newAnn]);
      setTextInput((prev) => ({ ...prev, visible: false }));
      setDrawStart(null);
    },
    [drawStart, activeStyle, annotations, onAnnotationsChange],
  );

  // Delete selected annotation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !textInput.visible) {
        onAnnotationsChange(annotations.filter((a) => a.id !== selectedId));
        onSelectAnnotation(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, annotations, textInput.visible, onAnnotationsChange, onSelectAnnotation]);

  // Cursor style
  const cursor = isPanning
    ? "grabbing"
    : activeTool === "select"
      ? "default"
      : "crosshair";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-900"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor }}
    >
      {/* Transformed layer: photo + SVG */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: imgSize.w,
          height: imgSize.h,
          position: "absolute",
        }}
      >
        {/* Photo */}
        <img
          src={photoUrl}
          alt="Photo"
          className="block select-none pointer-events-none"
          style={{ width: imgSize.w, height: imgSize.h }}
          draggable={false}
        />

        {/* SVG annotation overlay */}
        <svg
          className="absolute inset-0"
          width={imgSize.w}
          height={imgSize.h}
          style={{ pointerEvents: "none" }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>

          {/* Committed annotations */}
          {annotations.map((ann) => (
            <AnnotationShape
              key={ann.id}
              annotation={ann}
              isSelected={ann.id === selectedId}
            />
          ))}

          {/* Live preview while drawing */}
          {drawing && drawStart && drawCurrent && activeTool !== "text" && (
            <LivePreview
              tool={activeTool}
              start={drawStart}
              current={drawCurrent}
              style={activeStyle}
              freehandPoints={freehandPoints}
            />
          )}
        </svg>
      </div>

      {/* Floating text input */}
      {textInput.visible && (
        <input
          ref={textInputRef}
          type="text"
          className="fixed z-50 px-2 py-1 text-sm border border-blue-500 rounded shadow-lg outline-none bg-white"
          style={{ left: textInput.x, top: textInput.y }}
          placeholder="Type text..."
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTextSubmit(e.currentTarget.value);
            if (e.key === "Escape") setTextInput((prev) => ({ ...prev, visible: false }));
          }}
          onBlur={(e) => handleTextSubmit(e.currentTarget.value)}
        />
      )}
    </div>
  );
};

// --- Annotation rendering ---

const AnnotationShape: React.FC<{
  annotation: SketchAnnotation;
  isSelected: boolean;
}> = ({ annotation: ann, isSelected }) => {
  const { style } = ann;
  const commonProps = {
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    fill: style.fillColor === "transparent" ? "none" : style.fillColor,
    opacity: style.opacity,
  };

  const selectionStroke = isSelected ? (
    <rect
      x={(ann.x1 < (ann.x2 ?? ann.x1) ? ann.x1 : (ann.x2 ?? ann.x1)) - 4}
      y={(ann.y1 < (ann.y2 ?? ann.y1) ? ann.y1 : (ann.y2 ?? ann.y1)) - 4}
      width={Math.abs((ann.x2 ?? ann.x1) - ann.x1) + 8}
      height={Math.abs((ann.y2 ?? ann.y1) - ann.y1) + 8}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={2 / 1}
      strokeDasharray="6 3"
      rx={3}
    />
  ) : null;

  switch (ann.type) {
    case "arrow":
      return (
        <g>
          {selectionStroke}
          <line
            x1={ann.x1} y1={ann.y1}
            x2={ann.x2} y2={ann.y2}
            {...commonProps}
            markerEnd="url(#arrowhead)"
            style={{ color: style.strokeColor }}
          />
        </g>
      );

    case "line":
      return (
        <g>
          {selectionStroke}
          <line
            x1={ann.x1} y1={ann.y1}
            x2={ann.x2} y2={ann.y2}
            {...commonProps}
          />
        </g>
      );

    case "rect":
      return (
        <g>
          {selectionStroke}
          <rect
            x={Math.min(ann.x1, ann.x2 ?? ann.x1)}
            y={Math.min(ann.y1, ann.y2 ?? ann.y1)}
            width={Math.abs((ann.x2 ?? ann.x1) - ann.x1)}
            height={Math.abs((ann.y2 ?? ann.y1) - ann.y1)}
            {...commonProps}
          />
        </g>
      );

    case "circle": {
      const cx = (ann.x1 + (ann.x2 ?? ann.x1)) / 2;
      const cy = (ann.y1 + (ann.y2 ?? ann.y1)) / 2;
      const rx = Math.abs((ann.x2 ?? ann.x1) - ann.x1) / 2;
      const ry = Math.abs((ann.y2 ?? ann.y1) - ann.y1) / 2;
      return (
        <g>
          {selectionStroke}
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...commonProps} />
        </g>
      );
    }

    case "text":
      return (
        <g>
          <text
            x={ann.x1}
            y={ann.y1}
            fill={style.strokeColor}
            fontSize={style.fontSize}
            fontFamily="sans-serif"
            fontWeight="bold"
            opacity={style.opacity}
            style={isSelected ? { textDecoration: "underline" } : undefined}
          >
            {ann.text}
          </text>
        </g>
      );

    case "dimension": {
      const dx = (ann.x2 ?? ann.x1) - ann.x1;
      const dy = (ann.y2 ?? ann.y1) - ann.y1;
      const mx = (ann.x1 + (ann.x2 ?? ann.x1)) / 2;
      const my = (ann.y1 + (ann.y2 ?? ann.y1)) / 2;
      const angle = Math.atan2(dy, dx);
      const capLen = 8;
      const perpX = -Math.sin(angle) * capLen;
      const perpY = Math.cos(angle) * capLen;
      return (
        <g>
          {selectionStroke}
          <line x1={ann.x1} y1={ann.y1} x2={ann.x2} y2={ann.y2} {...commonProps} />
          {/* End caps */}
          <line x1={ann.x1 + perpX} y1={ann.y1 + perpY} x2={ann.x1 - perpX} y2={ann.y1 - perpY} {...commonProps} />
          <line x1={(ann.x2 ?? 0) + perpX} y1={(ann.y2 ?? 0) + perpY} x2={(ann.x2 ?? 0) - perpX} y2={(ann.y2 ?? 0) - perpY} {...commonProps} />
          {/* Label */}
          <rect x={mx - 30} y={my - 12} width={60} height={20} fill="white" opacity={0.85} rx={3} />
          <text x={mx} y={my + 4} fill={style.strokeColor} fontSize={12} fontFamily="sans-serif" textAnchor="middle">
            {ann.text}
          </text>
        </g>
      );
    }

    case "freehand":
      if (!ann.points || ann.points.length < 2) return null;
      const d = ann.points.reduce(
        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
        "",
      );
      return (
        <g>
          <path d={d} {...commonProps} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );

    case "zone":
      return (
        <g>
          {selectionStroke}
          <rect
            x={Math.min(ann.x1, ann.x2 ?? ann.x1)}
            y={Math.min(ann.y1, ann.y2 ?? ann.y1)}
            width={Math.abs((ann.x2 ?? ann.x1) - ann.x1)}
            height={Math.abs((ann.y2 ?? ann.y1) - ann.y1)}
            fill={style.fillColor === "transparent" ? style.strokeColor : style.fillColor}
            fillOpacity={0.2}
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            strokeDasharray="8 4"
            opacity={style.opacity}
          />
          {ann.text && (
            <text
              x={Math.min(ann.x1, ann.x2 ?? ann.x1) + 6}
              y={Math.min(ann.y1, ann.y2 ?? ann.y1) + 18}
              fill={style.strokeColor}
              fontSize={14}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {ann.text}
            </text>
          )}
        </g>
      );

    case "sticker": {
      const sticker = TELECOM_STICKERS.find((s) => s.id === ann.stickerId);
      const label = sticker?.label || ann.text || "?";
      const color = sticker?.color || style.strokeColor;
      return (
        <g>
          <rect
            x={ann.x1 - 4}
            y={ann.y1 - 16}
            width={label.length * 9 + 12}
            height={24}
            fill={color}
            rx={4}
            opacity={0.9}
          />
          <text
            x={ann.x1 + 2}
            y={ann.y1 + 2}
            fill="white"
            fontSize={13}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {label}
          </text>
          {isSelected && (
            <rect
              x={ann.x1 - 6}
              y={ann.y1 - 18}
              width={label.length * 9 + 16}
              height={28}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6 3"
              rx={6}
            />
          )}
        </g>
      );
    }

    default:
      return null;
  }
};

// Live preview while drawing
const LivePreview: React.FC<{
  tool: SketchTool;
  start: { x: number; y: number };
  current: { x: number; y: number };
  style: SketchStyle;
  freehandPoints: { x: number; y: number }[];
}> = ({ tool, start, current, style, freehandPoints }) => {
  const commonProps = {
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    fill: "none",
    opacity: 0.6,
    strokeDasharray: "6 3",
  };

  switch (tool) {
    case "arrow":
      return (
        <line x1={start.x} y1={start.y} x2={current.x} y2={current.y}
          {...commonProps} markerEnd="url(#arrowhead)" style={{ color: style.strokeColor }}
        />
      );
    case "line":
    case "dimension":
      return <line x1={start.x} y1={start.y} x2={current.x} y2={current.y} {...commonProps} />;
    case "rect":
    case "zone":
      return (
        <rect
          x={Math.min(start.x, current.x)} y={Math.min(start.y, current.y)}
          width={Math.abs(current.x - start.x)} height={Math.abs(current.y - start.y)}
          {...commonProps}
        />
      );
    case "circle":
      return (
        <ellipse
          cx={(start.x + current.x) / 2} cy={(start.y + current.y) / 2}
          rx={Math.abs(current.x - start.x) / 2} ry={Math.abs(current.y - start.y) / 2}
          {...commonProps}
        />
      );
    case "freehand":
      if (freehandPoints.length < 2) return null;
      const d = freehandPoints.reduce(
        (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
        "",
      );
      return <path d={d} {...commonProps} strokeLinecap="round" />;
    default:
      return null;
  }
};

// Hit-test: find annotation at position
function findAnnotationAt(
  annotations: SketchAnnotation[],
  x: number,
  y: number,
): SketchAnnotation | null {
  // Check in reverse order (top-most first)
  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i];
    const margin = 10;

    switch (ann.type) {
      case "text":
      case "sticker": {
        const textW = (ann.text?.length || 5) * 10;
        if (x >= ann.x1 - margin && x <= ann.x1 + textW + margin &&
            y >= ann.y1 - 20 && y <= ann.y1 + margin) {
          return ann;
        }
        break;
      }
      case "rect":
      case "zone": {
        const minX = Math.min(ann.x1, ann.x2 ?? ann.x1);
        const maxX = Math.max(ann.x1, ann.x2 ?? ann.x1);
        const minY = Math.min(ann.y1, ann.y2 ?? ann.y1);
        const maxY = Math.max(ann.y1, ann.y2 ?? ann.y1);
        if (x >= minX - margin && x <= maxX + margin && y >= minY - margin && y <= maxY + margin) {
          return ann;
        }
        break;
      }
      case "circle": {
        const cx = (ann.x1 + (ann.x2 ?? ann.x1)) / 2;
        const cy = (ann.y1 + (ann.y2 ?? ann.y1)) / 2;
        const rx = Math.abs((ann.x2 ?? ann.x1) - ann.x1) / 2 + margin;
        const ry = Math.abs((ann.y2 ?? ann.y1) - ann.y1) / 2 + margin;
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) return ann;
        break;
      }
      default: {
        // Line-based: check distance to line segment
        const x2 = ann.x2 ?? ann.x1;
        const y2 = ann.y2 ?? ann.y1;
        const dist = pointToSegmentDist(x, y, ann.x1, ann.y1, x2, y2);
        if (dist < margin + ann.style.strokeWidth) return ann;
      }
    }
  }
  return null;
}

function pointToSegmentDist(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
