import React, { useRef, useState, useCallback } from "react";
import { useSiteContext } from "../../context/SiteContext";
import { useWorkflowContext } from "../../context/WorkflowContext";
import { Photo } from "../../types/site";
import {
  PHOTO_CATEGORIES,
  REQUIRED_CATEGORIES,
  type TSSRPhotoCategory,
  type PhotoCategoryConfig,
} from "../../lib/photo-categories";
import {
  Upload,
  Camera,
  Grid3x3,
  List,
  Layers,
  Search,
  ZoomIn,
  Edit2,
  Trash2,
  Tag,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  Cloud,
  HardHat,
} from "lucide-react";
import { toast } from "sonner";
import { SketchMode } from "./SketchMode";
import type { SketchAnnotation } from "../../types/sketch";
import { OneDrivePhotoBrowser } from "../OneDrivePhotoBrowser";

// --- Types ---

type ViewMode = "grid" | "list" | "buckets";

// --- Component ---

export const PhotosMode: React.FC = () => {
  const {
    photos,
    addPhotos,
    deletePhoto,
    movePhotoToSection,
    updatePhoto,
    reloadPhotos,
    projectId,
  } = useSiteContext();
  const { isAtLeastStatus } = useWorkflowContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canShowAsBuilt = isAtLeastStatus("approved");
  const [photoPhase, setPhotoPhase] = useState<"planning" | "as_built">(
    canShowAsBuilt ? "as_built" : "planning",
  );
  const [activeCategory, setActiveCategory] = useState<
    TSSRPhotoCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<ViewMode>("buckets");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [annotatingPhoto, setAnnotatingPhoto] = useState<Photo | null>(null);
  const [dragPhotoId, setDragPhotoId] = useState<string | null>(null);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(
    new Set(),
  );
  const [showOneDriveBrowser, setShowOneDriveBrowser] = useState(false);

  // --- Helpers ---

  // Filter photos by current phase
  const phasePhotos = photos.filter(
    (p) => (p.phase || "planning") === photoPhase,
  );

  const photosInCategory = useCallback(
    (cat: TSSRPhotoCategory) =>
      phasePhotos.filter((p) => (p.section || "unsorted") === cat),
    [phasePhotos],
  );

  const filteredPhotos = phasePhotos.filter((p) => {
    const section = p.section || "unsorted";
    const matchesCategory =
      activeCategory === "all" || section === activeCategory;
    const matchesSearch =
      !searchQuery ||
      (p.caption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.autoFilename || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      p.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Checklist: count required categories that have at least minPhotos
  const filledRequired = REQUIRED_CATEGORIES.filter((cat) => {
    const count = photosInCategory(cat.id).length;
    return count >= cat.minPhotos;
  }).length;
  const totalRequired = REQUIRED_CATEGORIES.length;

  // --- Handlers ---

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type === "image/heic",
      );
      if (fileArray.length > 0) {
        addPhotos(fileArray, photoPhase);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDelete = (photoId: string) => {
    deletePhoto(photoId);
    toast.success("Photo deleted");
  };

  // Drag-and-drop between buckets
  const onDragStart = (photoId: string) => {
    setDragPhotoId(photoId);
  };

  const onBucketDrop = (
    e: React.DragEvent,
    targetCategory: TSSRPhotoCategory,
  ) => {
    e.preventDefault();
    if (dragPhotoId) {
      movePhotoToSection(dragPhotoId, targetCategory);
      setDragPhotoId(null);
    }
  };

  const onBucketDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const toggleBucket = (catId: string) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // --- Render ---

  return (
    <div className="flex h-full bg-white">
      {/* LEFT SIDEBAR: Checklist + Categories */}
      <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Checklist Progress */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              TSSR Checklist
            </span>
            <span className="text-xs font-medium text-gray-500">
              {filledRequired}/{totalRequired}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalRequired > 0 ? (filledRequired / totalRequired) * 100 : 0}%`,
                backgroundColor:
                  filledRequired === totalRequired ? "#22c55e" : "#3b82f6",
              }}
            />
          </div>
          {/* Category dots */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {REQUIRED_CATEGORIES.map((cat) => {
              const count = photosInCategory(cat.id).length;
              const filled = count >= cat.minPhotos;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  title={`${cat.label}: ${count}/${cat.minPhotos} required`}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    filled
                      ? "bg-green-500 border-green-600"
                      : "bg-white border-orange-400"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
              activeCategory === "all"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>All Photos</span>
            <span className="text-xs font-medium">{photos.length}</span>
          </button>

          {/* Unsorted at top */}
          <CategorySidebarItem
            label="Unsorted"
            count={photosInCategory("unsorted").length}
            active={activeCategory === "unsorted"}
            required={false}
            filled={true}
            onClick={() => setActiveCategory("unsorted")}
          />

          <div className="h-px bg-gray-200 my-2" />

          {PHOTO_CATEGORIES.map((cat) => {
            const count = photosInCategory(cat.id).length;
            const filled = count >= cat.minPhotos;
            return (
              <CategorySidebarItem
                key={cat.id}
                label={cat.label}
                tssrSection={cat.tssrSection}
                count={count}
                active={activeCategory === cat.id}
                required={cat.required}
                filled={filled}
                onClick={() => setActiveCategory(cat.id)}
              />
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Phase Toggle (visible when approved or beyond) */}
        {canShowAsBuilt && (
          <div className="border-b border-gray-200 bg-white px-6 py-2 flex items-center gap-2">
            <button
              onClick={() => setPhotoPhase("planning")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                photoPhase === "planning"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Planning Photos
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                  photoPhase === "planning"
                    ? "bg-blue-500 text-blue-100"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {
                  photos.filter((p) => (p.phase || "planning") === "planning")
                    .length
                }
              </span>
            </button>
            <button
              onClick={() => setPhotoPhase("as_built")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                photoPhase === "as_built"
                  ? "bg-orange-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <HardHat className="h-3.5 w-3.5" />
              As-Built Photos
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                  photoPhase === "as_built"
                    ? "bg-orange-500 text-orange-100"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {photos.filter((p) => p.phase === "as_built").length}
              </span>
            </button>
          </div>
        )}

        {/* Upload Dropzone + Toolbar */}
        <div className="border-b border-gray-200 bg-white">
          {/* Upload area: dropzone + OneDrive button */}
          <div className="mx-6 mt-4 mb-3 flex gap-2">
            <div
              className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={handleDrop}
            >
              <div className="flex items-center justify-center gap-3">
                <ImagePlus className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Drop photos here or{" "}
                  <span className="text-blue-600 font-medium">browse</span>
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
            {projectId && (
              <button
                onClick={() => setShowOneDriveBrowser(true)}
                className="flex flex-col items-center justify-center gap-1.5 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-400 hover:bg-teal-50/50 transition-colors"
              >
                <Cloud className="h-5 w-5 text-teal-600" />
                <span className="text-xs text-teal-700 font-medium whitespace-nowrap">
                  OneDrive
                </span>
              </button>
            )}
          </div>

          {/* Toolbar row */}
          <div className="px-6 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="inline-flex border border-gray-300 rounded-lg overflow-hidden">
                <ViewModeButton
                  active={viewMode === "buckets"}
                  onClick={() => setViewMode("buckets")}
                  icon={<Layers className="h-4 w-4" />}
                  title="Bucket view"
                />
                <ViewModeButton
                  active={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  icon={<Grid3x3 className="h-4 w-4" />}
                  title="Grid view"
                  borderLeft
                />
                <ViewModeButton
                  active={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  icon={<List className="h-4 w-4" />}
                  title="List view"
                  borderLeft
                />
              </div>
              <span className="text-xs text-gray-500 ml-2">
                {filteredPhotos.length} photo
                {filteredPhotos.length !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Photo Display Area */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {photos.length === 0 ? (
            <EmptyState onUpload={() => fileInputRef.current?.click()} />
          ) : viewMode === "buckets" ? (
            <BucketView
              photos={filteredPhotos}
              allPhotos={photos}
              activeCategory={activeCategory}
              collapsedBuckets={collapsedBuckets}
              onToggleBucket={toggleBucket}
              onDragStart={onDragStart}
              onBucketDrop={onBucketDrop}
              onBucketDragOver={onBucketDragOver}
              onView={setViewerPhoto}
              onAnnotate={setAnnotatingPhoto}
              onDelete={handleDelete}
            />
          ) : viewMode === "grid" ? (
            <GridView
              photos={filteredPhotos}
              onView={setViewerPhoto}
              onAnnotate={setAnnotatingPhoto}
              onDelete={handleDelete}
              onDragStart={onDragStart}
            />
          ) : (
            <ListView
              photos={filteredPhotos}
              onAnnotate={setAnnotatingPhoto}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Bottom checklist bar */}
        <div className="border-t border-gray-200 bg-white px-6 py-2 flex items-center gap-3">
          <span className="text-xs text-gray-500">Checklist:</span>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalRequired > 0 ? (filledRequired / totalRequired) * 100 : 0}%`,
                backgroundColor:
                  filledRequired === totalRequired ? "#22c55e" : "#3b82f6",
              }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600">
            {filledRequired}/{totalRequired} slots filled
          </span>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewerPhoto && (
        <PhotoViewerModal
          photo={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onAnnotate={() => {
            setAnnotatingPhoto(viewerPhoto);
            setViewerPhoto(null);
          }}
          onMoveToSection={(section) => {
            movePhotoToSection(viewerPhoto.id, section);
            setViewerPhoto(null);
          }}
        />
      )}

      {/* Sketch Mode Overlay */}
      {annotatingPhoto && (
        <SketchMode
          photo={annotatingPhoto}
          onSave={(annotations: SketchAnnotation[]) => {
            updatePhoto(annotatingPhoto.id, {
              annotations: annotations as any,
            });
            setAnnotatingPhoto(null);
            toast.success("Annotations saved");
          }}
          onClose={() => setAnnotatingPhoto(null)}
        />
      )}

      {/* OneDrive Photo Browser */}
      {showOneDriveBrowser && (
        <OneDrivePhotoBrowser
          onClose={() => {
            setShowOneDriveBrowser(false);
            reloadPhotos();
          }}
        />
      )}
    </div>
  );
};

// --- Sub-components ---

const CategorySidebarItem: React.FC<{
  label: string;
  tssrSection?: string;
  count: number;
  active: boolean;
  required: boolean;
  filled: boolean;
  onClick: () => void;
}> = ({ label, tssrSection, count, active, required, filled, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors ${
      active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
    }`}
  >
    <span className="flex items-center gap-1.5 truncate">
      {required && (
        <span className="flex-shrink-0">
          {filled ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
          )}
        </span>
      )}
      <span className="truncate">{label}</span>
      {tssrSection && (
        <span className="text-[10px] text-gray-400 flex-shrink-0">
          {tssrSection}
        </span>
      )}
    </span>
    <span className="text-xs font-medium flex-shrink-0 ml-1">{count}</span>
  </button>
);

const ViewModeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  borderLeft?: boolean;
}> = ({ active, onClick, icon, title, borderLeft }) => (
  <button
    onClick={onClick}
    title={title}
    className={`h-9 w-9 flex items-center justify-center transition-colors ${
      borderLeft ? "border-l border-gray-300" : ""
    } ${active ? "bg-gray-100" : "bg-white hover:bg-gray-50"}`}
  >
    <span className="text-gray-700">{icon}</span>
  </button>
);

const EmptyState: React.FC<{ onUpload: () => void }> = ({ onUpload }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <p className="text-sm font-medium text-gray-900">No photos yet</p>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Upload photos to document the site
      </p>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Upload className="h-4 w-4" />
        Upload Photos
      </button>
    </div>
  </div>
);

// --- Bucket View ---

const BucketView: React.FC<{
  photos: Photo[];
  allPhotos: Photo[];
  activeCategory: TSSRPhotoCategory | "all";
  collapsedBuckets: Set<string>;
  onToggleBucket: (id: string) => void;
  onDragStart: (id: string) => void;
  onBucketDrop: (e: React.DragEvent, cat: TSSRPhotoCategory) => void;
  onBucketDragOver: (e: React.DragEvent) => void;
  onView: (p: Photo) => void;
  onAnnotate: (p: Photo) => void;
  onDelete: (id: string) => void;
}> = ({
  allPhotos,
  activeCategory,
  collapsedBuckets,
  onToggleBucket,
  onDragStart,
  onBucketDrop,
  onBucketDragOver,
  onView,
  onAnnotate,
  onDelete,
}) => {
  const categoriesToShow =
    activeCategory === "all"
      ? PHOTO_CATEGORIES
      : PHOTO_CATEGORIES.filter((c) => c.id === activeCategory);

  // Also show unsorted bucket
  const unsortedPhotos = allPhotos.filter(
    (p) => !p.section || p.section === "unsorted",
  );
  const showUnsorted =
    activeCategory === "all" || activeCategory === "unsorted";

  return (
    <div className="p-6 space-y-3">
      {/* Unsorted bucket */}
      {showUnsorted && unsortedPhotos.length > 0 && (
        <CategoryBucket
          catId="unsorted"
          label="Unsorted"
          description="Drag photos to a category below"
          tssrSection=""
          required={false}
          filled={true}
          count={unsortedPhotos.length}
          minPhotos={0}
          photos={unsortedPhotos}
          collapsed={collapsedBuckets.has("unsorted")}
          onToggle={() => onToggleBucket("unsorted")}
          onDragStart={onDragStart}
          onDrop={(e) => onBucketDrop(e, "unsorted")}
          onDragOver={onBucketDragOver}
          onView={onView}
          onAnnotate={onAnnotate}
          onDelete={onDelete}
        />
      )}

      {categoriesToShow.map((cat) => {
        const catPhotos = allPhotos.filter((p) => p.section === cat.id);
        return (
          <CategoryBucket
            key={cat.id}
            catId={cat.id}
            label={cat.label}
            description={cat.description}
            tssrSection={cat.tssrSection}
            required={cat.required}
            filled={catPhotos.length >= cat.minPhotos}
            count={catPhotos.length}
            minPhotos={cat.minPhotos}
            photos={catPhotos}
            collapsed={collapsedBuckets.has(cat.id)}
            onToggle={() => onToggleBucket(cat.id)}
            onDragStart={onDragStart}
            onDrop={(e) => onBucketDrop(e, cat.id)}
            onDragOver={onBucketDragOver}
            onView={onView}
            onAnnotate={onAnnotate}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
};

const CategoryBucket: React.FC<{
  catId: string;
  label: string;
  description: string;
  tssrSection: string;
  required: boolean;
  filled: boolean;
  count: number;
  minPhotos: number;
  photos: Photo[];
  collapsed: boolean;
  onToggle: () => void;
  onDragStart: (id: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onView: (p: Photo) => void;
  onAnnotate: (p: Photo) => void;
  onDelete: (id: string) => void;
}> = ({
  label,
  description,
  tssrSection,
  required,
  filled,
  count,
  minPhotos,
  photos,
  collapsed,
  onToggle,
  onDragStart,
  onDrop,
  onDragOver,
  onView,
  onAnnotate,
  onDelete,
}) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        dragOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200 bg-white"
      }`}
      onDragOver={(e) => {
        onDragOver(e);
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        onDrop(e);
        setDragOver(false);
      }}
    >
      {/* Bucket header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="flex-1 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {tssrSection && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {tssrSection}
            </span>
          )}
          {required && !filled && (
            <AlertCircle className="h-4 w-4 text-orange-400" />
          )}
          {required && filled && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </span>
        <span className="text-xs text-gray-500">
          {count}
          {required && minPhotos > 0 ? `/${minPhotos} req` : ""}
        </span>
      </button>

      {/* Bucket content */}
      {!collapsed && (
        <div className="px-4 pb-4">
          {photos.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg py-6 text-center">
              <p className="text-xs text-gray-400">{description}</p>
              <p className="text-[10px] text-gray-300 mt-1">Drag photos here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {photos.map((photo) => (
                <DraggablePhotoCard
                  key={photo.id}
                  photo={photo}
                  onDragStart={() => onDragStart(photo.id)}
                  onView={() => onView(photo)}
                  onAnnotate={() => onAnnotate(photo)}
                  onDelete={() => onDelete(photo.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DraggablePhotoCard: React.FC<{
  photo: Photo;
  onDragStart: () => void;
  onView: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
}> = ({ photo, onDragStart, onView, onAnnotate, onDelete }) => (
  <div
    draggable
    onDragStart={onDragStart}
    className="group relative aspect-square rounded-lg border border-gray-200 bg-gray-100 overflow-hidden cursor-grab active:cursor-grabbing"
  >
    <img
      src={photo.thumbnailUrl || photo.fileUrl}
      alt={photo.caption || photo.fileName}
      className="w-full h-full object-cover"
      loading="lazy"
    />
    {/* Drag handle indicator */}
    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <GripVertical className="h-4 w-4 text-white drop-shadow-md" />
    </div>
    {/* Hover overlay */}
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex items-center justify-center">
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="h-7 w-7 flex items-center justify-center bg-white rounded text-gray-700 hover:bg-gray-100"
          title="View"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAnnotate();
          }}
          className="h-7 w-7 flex items-center justify-center bg-blue-600 rounded text-white hover:bg-blue-700"
          title="Annotate"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-7 w-7 flex items-center justify-center bg-red-600 rounded text-white hover:bg-red-700"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
    {/* Auto-filename badge */}
    {photo.autoFilename && (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
        <span className="text-[10px] text-white truncate block">
          {photo.autoFilename}
        </span>
      </div>
    )}
  </div>
);

// --- Grid View ---

const GridView: React.FC<{
  photos: Photo[];
  onView: (p: Photo) => void;
  onAnnotate: (p: Photo) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
}> = ({ photos, onView, onAnnotate, onDelete, onDragStart }) => (
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          draggable
          onDragStart={() => onDragStart(photo.id)}
          className="group relative aspect-video rounded-lg border border-gray-200 bg-white overflow-hidden cursor-grab"
        >
          <img
            src={photo.thumbnailUrl || photo.fileUrl}
            alt={photo.caption || photo.fileName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={() => onView(photo)}
                className="inline-flex items-center gap-1 h-7 px-3 py-1.5 text-xs text-gray-700 bg-white rounded-lg"
              >
                <ZoomIn className="h-4 w-4" />
                View
              </button>
              <button
                onClick={() => onAnnotate(photo)}
                className="inline-flex items-center gap-1 h-7 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg"
              >
                <Edit2 className="h-4 w-4" />
                Annotate
              </button>
              <button
                onClick={() => onDelete(photo.id)}
                className="inline-flex items-center gap-1 h-7 px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-end">
            <span className="text-[11px] text-white truncate">
              {photo.autoFilename || photo.fileName}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- List View ---

const ListView: React.FC<{
  photos: Photo[];
  onAnnotate: (p: Photo) => void;
  onDelete: (id: string) => void;
}> = ({ photos, onAnnotate, onDelete }) => (
  <div className="p-6 space-y-2">
    {photos.map((photo) => {
      const catConfig = PHOTO_CATEGORIES.find(
        (c) => c.id === (photo.section || "unsorted"),
      );
      return (
        <div
          key={photo.id}
          className="flex gap-4 p-3 bg-white border border-gray-200 rounded-lg"
        >
          <img
            src={photo.thumbnailUrl || photo.fileUrl}
            alt={photo.caption || photo.fileName}
            className="w-20 h-20 rounded object-cover flex-shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {photo.autoFilename || photo.fileName}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-600">
                {catConfig?.label || "Unsorted"}
              </span>
              {catConfig?.tssrSection && (
                <span className="text-[10px] text-gray-400">
                  {catConfig.tssrSection}
                </span>
              )}
            </div>
            {photo.caption && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {photo.caption}
              </p>
            )}
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(photo.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onAnnotate(photo)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Annotate
            </button>
            <button
              onClick={() => onDelete(photo.id)}
              className="inline-flex items-center h-8 w-8 justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

// --- Photo Viewer Modal ---

const PhotoViewerModal: React.FC<{
  photo: Photo;
  onClose: () => void;
  onAnnotate: () => void;
  onMoveToSection: (section: TSSRPhotoCategory) => void;
}> = ({ photo, onClose, onAnnotate, onMoveToSection }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {photo.autoFilename || photo.caption || photo.fileName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <img
          src={photo.fileUrl}
          alt={photo.caption || photo.fileName}
          className="w-full rounded-lg mb-4"
        />

        {/* Category selector */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={photo.section || "unsorted"}
          onChange={(e) => onMoveToSection(e.target.value as TSSRPhotoCategory)}
          className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 outline-none focus:border-blue-500"
        >
          <option value="unsorted">Unsorted</option>
          {PHOTO_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.tssrSection ? `${cat.tssrSection} — ` : ""}
              {cat.label}
            </option>
          ))}
        </select>

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
