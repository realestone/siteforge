import React, { useRef, useState, useCallback, useEffect } from "react";
import { useSiteContext } from "../../context/SiteContext";
import { Photo } from "../../types/site";
import {
  Upload,
  Camera,
  Grid3x3,
  List,
  Search,
  ZoomIn,
  Edit2,
  Trash2,
  Tag,
  Clock,
  MapPin,
  X,
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  Eraser,
  Undo,
  Redo,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// --- Types ---

type PhotoCategory =
  | "all"
  | "site-access"
  | "equipment-room"
  | "antenna-mast"
  | "power-system"
  | "cable-routing"
  | "safety-equipment"
  | "general-site"
  | "other";

type ViewMode = "grid" | "list";
type AnnotationTool = "pen" | "rectangle" | "circle" | "arrow" | "text" | "eraser";

const ALL_CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: "all", label: "All Photos" },
  { id: "site-access", label: "Site Access" },
  { id: "equipment-room", label: "Equipment Room" },
  { id: "antenna-mast", label: "Antenna/Mast" },
  { id: "power-system", label: "Power System" },
  { id: "cable-routing", label: "Cable Routing" },
  { id: "safety-equipment", label: "Safety Equipment" },
  { id: "general-site", label: "General Site" },
  { id: "other", label: "Other" },
];

// Map internal photo sections to our categories
function photoCategoryFromPhoto(photo: Photo): PhotoCategory {
  const map: Record<string, PhotoCategory> = {
    "site-overview": "site-access",
    "equipment-room": "equipment-room",
    "antenna-direction": "antenna-mast",
    "power-meter": "power-system",
    "cable-route": "cable-routing",
    "grounding": "safety-equipment",
    "crane-area": "other",
    "roof-mounting": "other",
    unsorted: "general-site",
    other: "other",
  };
  return map[photo.section || "unsorted"] || "general-site";
}

// --- Component ---

export const PhotosMode: React.FC = () => {
  const { photos, addPhotos, deletePhoto } = useSiteContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState<PhotoCategory>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [annotatingPhoto, setAnnotatingPhoto] = useState<Photo | null>(null);

  // Filtered photos
  const filteredPhotos = photos.filter((p) => {
    const matchesCategory =
      activeCategory === "all" || photoCategoryFromPhoto(p) === activeCategory;
    const matchesSearch =
      !searchQuery ||
      (p.caption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      photoCategoryFromPhoto(p).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Category counts
  const getCategoryCount = (cat: PhotoCategory) => {
    if (cat === "all") return photos.length;
    return photos.filter((p) => photoCategoryFromPhoto(p) === cat).length;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type === "image/heic",
      );
      if (fileArray.length > 0) {
        addPhotos(fileArray);
        toast.success(`${fileArray.length} photo(s) uploaded`);
      }
    }
  };

  const handleDelete = (photoId: string) => {
    deletePhoto(photoId);
    toast.success("Photo deleted");
  };

  return (
    <div className="flex h-full bg-white">
      {/* SECTION 1: LEFT SIDEBAR */}
      <div className="w-72 h-full bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto flex-shrink-0">
        {/* Categories Filter */}
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-1">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                activeCategory === cat.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-xs font-medium">{getCategoryCount(cat.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.heic"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            {/* View mode toggle */}
            <div className="inline-flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`h-9 w-9 flex items-center justify-center transition-colors ${
                  viewMode === "grid" ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                }`}
              >
                <Grid3x3 className="h-4 w-4 text-gray-700" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`h-9 w-9 flex items-center justify-center border-l border-gray-300 transition-colors ${
                  viewMode === "list" ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                }`}
              >
                <List className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-70 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Photo Display Area */}
        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
          {filteredPhotos.length === 0 ? (
            /* Empty state */
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-900">No photos yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Upload photos to document the site
                </p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid view */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-video rounded-lg border border-gray-200 bg-white overflow-hidden"
                >
                  <img
                    src={photo.fileUrl}
                    alt={photo.caption || photo.fileName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        onClick={() => setViewerPhoto(photo)}
                        className="inline-flex items-center gap-1 h-7 px-3 py-1.5 text-xs text-gray-700 bg-white rounded-lg"
                      >
                        <ZoomIn className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={() => setAnnotatingPhoto(photo)}
                        className="inline-flex items-center gap-1 h-7 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                        Annotate
                      </button>
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="inline-flex items-center gap-1 h-7 px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                  {/* Category badge */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end">
                    <span className="inline-flex items-center gap-1 text-xs text-white">
                      <Tag className="h-3 w-3" />
                      {ALL_CATEGORIES.find((c) => c.id === photoCategoryFromPhoto(photo))?.label || "General"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg"
                >
                  {/* Thumbnail */}
                  <img
                    src={photo.fileUrl}
                    alt={photo.caption || photo.fileName}
                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {ALL_CATEGORIES.find((c) => c.id === photoCategoryFromPhoto(photo))?.label || "General"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {photo.caption || "No notes"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(photo.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setAnnotatingPhoto(photo)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      Annotate
                    </button>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: PHOTO VIEWER MODAL */}
      {viewerPhoto && (
        <PhotoViewerModal
          photo={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onAnnotate={() => {
            setAnnotatingPhoto(viewerPhoto);
            setViewerPhoto(null);
          }}
        />
      )}

      {/* SECTION 4: ANNOTATION CANVAS */}
      {annotatingPhoto && (
        <AnnotationCanvas
          photo={annotatingPhoto}
          onClose={() => setAnnotatingPhoto(null)}
        />
      )}
    </div>
  );
};

// --- Photo Viewer Modal ---

const PhotoViewerModal: React.FC<{
  photo: Photo;
  onClose: () => void;
  onAnnotate: () => void;
}> = ({ photo, onClose, onAnnotate }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {photo.caption || photo.fileName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Image */}
        <img
          src={photo.fileUrl}
          alt={photo.caption || photo.fileName}
          className="w-full rounded-lg mb-4"
        />

        {/* Category dropdown */}
        <select className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 outline-none focus:border-blue-500">
          {ALL_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>

        {/* Notes */}
        <textarea
          rows={3}
          placeholder="Add notes about this photo..."
          className="w-full p-3 text-sm border border-gray-300 rounded-lg mb-3 outline-none focus:border-blue-500 resize-none"
          defaultValue={photo.caption || ""}
        />

        {/* Annotate button */}
        <button
          onClick={onAnnotate}
          className="w-full h-10 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Annotate Photo
        </button>
      </div>
    </div>
  );
};

// --- Annotation Canvas ---

const AnnotationCanvas: React.FC<{
  photo: Photo;
  onClose: () => void;
}> = ({ photo, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [color, setColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initial]);
      setHistoryIndex(0);
    };
    img.src = photo.fileUrl;
  }, [photo.fileUrl]);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), data]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "pen" && tool !== "eraser") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 3 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const handleSave = () => {
    toast.success("Annotated photo saved");
    onClose();
  };

  const tools: { id: AnnotationTool; icon: React.ReactNode }[] = [
    { id: "pen", icon: <Pencil className="h-5 w-5" /> },
    { id: "rectangle", icon: <Square className="h-5 w-5" /> },
    { id: "circle", icon: <Circle className="h-5 w-5" /> },
    { id: "arrow", icon: <ArrowRight className="h-5 w-5" /> },
    { id: "text", icon: <Type className="h-5 w-5" /> },
    { id: "eraser", icon: <Eraser className="h-5 w-5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Drawing tools */}
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${
                tool === t.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.icon}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <Undo className="h-5 w-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <Redo className="h-5 w-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Color picker */}
          <span className="text-sm text-gray-700 mr-1">Color:</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 border border-gray-300 rounded cursor-pointer"
          />

          {/* Line width */}
          <span className="text-sm text-gray-700 ml-3 mr-1">Size:</span>
          <input
            type="range"
            min={1}
            max={15}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-700 w-6 text-center">{lineWidth}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center h-9 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Save Annotated Photo
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 bg-gray-900 p-8 flex items-center justify-center overflow-auto">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[calc(100vh-200px)] rounded-lg shadow-2xl cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
};
