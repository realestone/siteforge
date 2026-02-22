import React, { useState, useCallback, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { graphScopes } from "../lib/msalConfig";
import {
  listFiles,
  searchFiles,
  downloadFile,
  getFileMetadata,
} from "../api/graphService";
import {
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Search,
  Folder,
  FileText,
  FileSpreadsheet,
  File,
  ChevronRight,
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
  X,
  RefreshCw,
  FileType,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl?: string;
  parentReference?: { path: string; id: string };
}

interface BreadcrumbItem {
  id: string | null; // null = root
  name: string;
}

type FileCategory = "tssr" | "boq" | "effekt" | "radioplan" | "photo" | "other";

// ── Helpers ─────────────────────────────────────────────────────────

function categorizeFile(name: string): FileCategory {
  const lower = name.toLowerCase();
  if (lower.includes("tssr") && lower.endsWith(".docx")) return "tssr";
  if (
    (lower.includes("boq") || lower.includes("bill")) &&
    (lower.endsWith(".xlsx") || lower.endsWith(".xlsm"))
  )
    return "boq";
  if (lower.includes("effekt") && lower.endsWith(".xlsx")) return "effekt";
  if (lower.includes("radioplan") && lower.endsWith(".xlsx"))
    return "radioplan";
  if (/\.(jpg|jpeg|png|heic|webp)$/i.test(lower)) return "photo";
  return "other";
}

function categoryBadge(
  cat: FileCategory,
): { label: string; color: string } | null {
  switch (cat) {
    case "tssr":
      return { label: "TSSR", color: "bg-blue-100 text-blue-700" };
    case "boq":
      return { label: "BOQ", color: "bg-green-100 text-green-700" };
    case "effekt":
      return { label: "Effekt", color: "bg-orange-100 text-orange-700" };
    case "radioplan":
      return { label: "RadioPlan", color: "bg-purple-100 text-purple-700" };
    case "photo":
      return { label: "Photo", color: "bg-pink-100 text-pink-700" };
    default:
      return null;
  }
}

function fileIcon(item: DriveItem) {
  if (item.folder) return <Folder className="h-5 w-5 text-yellow-500" />;
  const name = item.name?.toLowerCase() || "";
  if (name.endsWith(".docx") || name.endsWith(".doc"))
    return <FileText className="h-5 w-5 text-blue-600" />;
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm") || name.endsWith(".xls"))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (name.endsWith(".pdf"))
    return <FileType className="h-5 w-5 text-red-500" />;
  if (/\.(jpg|jpeg|png|heic|webp|gif)$/i.test(name))
    return <ImageIcon className="h-5 w-5 text-pink-500" />;
  return <File className="h-5 w-5 text-gray-400" />;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Component ───────────────────────────────────────────────────────

interface OneDriveBrowserProps {
  onClose: () => void;
}

export const OneDriveBrowser: React.FC<OneDriveBrowserProps> = ({
  onClose,
}) => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "OneDrive" },
  ]);
  const [selectedItem, setSelectedItem] = useState<DriveItem | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loadingEmbed, setLoadingEmbed] = useState(false);

  // Load folder contents
  const loadFolder = useCallback(
    async (folderId?: string | null, folderName?: string) => {
      setLoading(true);
      setIsSearching(false);
      setSelectedItem(null);
      setEmbedUrl(null);
      try {
        const result = await listFiles(instance, folderId || undefined);
        setItems(result.value || []);
        if (folderId && folderName) {
          setBreadcrumbs((prev) => [
            ...prev,
            { id: folderId, name: folderName },
          ]);
        } else if (!folderId) {
          setBreadcrumbs([{ id: null, name: "OneDrive" }]);
        }
      } catch (err) {
        console.error("Failed to list files:", err);
        toast.error("Failed to load files from OneDrive");
      } finally {
        setLoading(false);
      }
    },
    [instance],
  );

  // Search files
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      // Reset to current folder
      const current = breadcrumbs[breadcrumbs.length - 1];
      await loadFolder(current.id);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    setSelectedItem(null);
    setEmbedUrl(null);
    try {
      const result = await searchFiles(instance, searchQuery.trim());
      setItems(result.value || []);
    } catch (err) {
      console.error("Search failed:", err);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [instance, searchQuery, breadcrumbs, loadFolder]);

  // Navigate to breadcrumb
  const navigateTo = useCallback(
    async (index: number) => {
      const target = breadcrumbs[index];
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setLoading(true);
      setIsSearching(false);
      setSelectedItem(null);
      setEmbedUrl(null);
      try {
        const result = await listFiles(instance, target.id || undefined);
        setItems(result.value || []);
      } catch (err) {
        console.error("Navigation failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [instance, breadcrumbs],
  );

  // Open folder
  const openFolder = useCallback(
    (item: DriveItem) => {
      loadFolder(item.id, item.name);
    },
    [loadFolder],
  );

  // Download file
  const handleDownload = useCallback(
    async (item: DriveItem) => {
      try {
        toast.info(`Downloading ${item.name}...`);
        const blob = await downloadFile(instance, item.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${item.name}`);
      } catch (err) {
        console.error("Download failed:", err);
        toast.error("Download failed");
      }
    },
    [instance],
  );

  // Open file in Office Online for preview/editing (new tab)
  const handlePreview = useCallback(
    async (item: DriveItem) => {
      setLoadingEmbed(true);
      try {
        const metadata = await getFileMetadata(instance, item.id);
        if (metadata.webUrl) {
          window.open(metadata.webUrl, "_blank");
        } else {
          toast.error("Could not get file URL");
        }
      } catch (err) {
        console.error("Failed to get file URL:", err);
        toast.error("Could not open file");
      } finally {
        setLoadingEmbed(false);
      }
    },
    [instance],
  );

  // Open in Word/Excel Online for full editing (new tab)
  const handleEditOnline = useCallback((item: DriveItem) => {
    if (item.webUrl) {
      window.open(item.webUrl, "_blank");
    } else {
      toast.error("No edit URL available");
    }
  }, []);

  // Sign in — use redirect flow (popups open as tabs in many browsers)
  const handleSignIn = useCallback(() => {
    instance.loginRedirect({
      scopes: [...graphScopes.files, ...graphScopes.user],
      prompt: "select_account",
    });
  }, [instance]);

  // Sign out
  const handleSignOut = useCallback(() => {
    instance.logoutRedirect({ postLogoutRedirectUri: "http://localhost:5173" });
  }, [instance]);

  // Auto-load root on auth
  useEffect(() => {
    if (isAuthenticated && items.length === 0 && !loading) {
      loadFolder();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Not Authenticated ───────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col bg-white">
        <BrowserHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CloudOff className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect to OneDrive
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Sign in with your Microsoft account to browse, import, and export
              files directly from OneDrive.
            </p>
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 h-10 px-6 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated ─────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-white">
      <BrowserHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-gray-500">
            {instance.getAllAccounts()[0]?.username || "Connected"}
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </BrowserHeader>

      {/* Search bar */}
      <div className="border-b border-gray-200 px-4 py-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by site ID, filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full h-9 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-9 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {!isSearching && (
        <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1 text-sm overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
              <button
                onClick={() => navigateTo(i)}
                className={`flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
          {breadcrumbs.length > 1 && (
            <button
              onClick={() => navigateTo(breadcrumbs.length - 2)}
              className="ml-auto flex-shrink-0 inline-flex items-center gap-1 h-7 px-2 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
        </div>
      )}

      {isSearching && (
        <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Search results for "{searchQuery}" ({items.length} found)
          </span>
          <button
            onClick={() => {
              setSearchQuery("");
              const current = breadcrumbs[breadcrumbs.length - 1];
              loadFolder(current.id);
            }}
            className="inline-flex items-center gap-1 h-7 px-2 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </button>
        </div>
      )}

      {/* Content area: file list + optional preview */}
      <div className="flex-1 flex min-h-0">
        {/* File list */}
        <div
          className={`${embedUrl ? "w-1/2 border-r border-gray-200" : "w-full"} overflow-y-auto`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-gray-400">No files found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <FileRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onOpenFolder={openFolder}
                  onSelect={setSelectedItem}
                  onDownload={handleDownload}
                  onPreview={handlePreview}
                  onEditOnline={handleEditOnline}
                />
              ))}
            </div>
          )}
        </div>

        {/* Embed preview */}
        {embedUrl && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50">
              <span className="text-sm font-medium text-gray-700 truncate">
                {selectedItem?.name}
              </span>
              <div className="flex items-center gap-2">
                {selectedItem?.webUrl && (
                  <button
                    onClick={() =>
                      selectedItem && handleEditOnline(selectedItem)
                    }
                    className="inline-flex items-center gap-1 h-7 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Edit in{" "}
                    {selectedItem?.name?.endsWith(".docx")
                      ? "Word"
                      : "Excel"}{" "}
                    Online
                  </button>
                )}
                <button
                  onClick={() => {
                    setEmbedUrl(null);
                    setSelectedItem(null);
                  }}
                  className="h-7 w-7 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            {loadingEmbed ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <iframe
                src={embedUrl}
                className="flex-1 w-full border-0"
                title="Office Online Preview"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────

const BrowserHeader: React.FC<{
  onClose: () => void;
  children?: React.ReactNode;
}> = ({ onClose, children }) => (
  <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
    <div className="flex items-center gap-3">
      <Cloud className="h-5 w-5 text-blue-500" />
      <span className="text-sm font-semibold text-gray-900">OneDrive</span>
    </div>
    <div className="flex items-center gap-3">
      {children}
      <button
        onClick={onClose}
        className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  </div>
);

const FileRow: React.FC<{
  item: DriveItem;
  isSelected: boolean;
  onOpenFolder: (item: DriveItem) => void;
  onSelect: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
  onEditOnline: (item: DriveItem) => void;
}> = ({
  item,
  isSelected,
  onOpenFolder,
  onSelect,
  onDownload,
  onPreview,
  onEditOnline,
}) => {
  const isFolder = !!item.folder;
  const cat = isFolder ? null : categorizeFile(item.name);
  const badge = cat ? categoryBadge(cat) : null;

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50" : ""
      }`}
      onClick={() => {
        if (isFolder) {
          onOpenFolder(item);
        } else {
          onSelect(item);
        }
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{fileIcon(item)}</div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm truncate ${
              isFolder ? "font-medium text-gray-900" : "text-gray-800"
            }`}
          >
            {item.name}
          </span>
          {badge && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.color}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
          {item.size != null && <span>{formatSize(item.size)}</span>}
          {item.lastModifiedDateTime && (
            <span>{formatDate(item.lastModifiedDateTime)}</span>
          )}
          {isFolder && item.folder && (
            <span>{item.folder.childCount} items</span>
          )}
        </div>
      </div>

      {/* Actions (visible on hover) */}
      {!isFolder && (
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(item);
            }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            title="Download"
          >
            <Download className="h-3.5 w-3.5 text-gray-500" />
          </button>
          {(item.name?.endsWith(".docx") ||
            item.name?.endsWith(".xlsx") ||
            item.name?.endsWith(".xlsm") ||
            item.name?.endsWith(".pdf")) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5 text-gray-500" />
            </button>
          )}
          {(item.name?.endsWith(".docx") ||
            item.name?.endsWith(".xlsx") ||
            item.name?.endsWith(".xlsm")) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditOnline(item);
              }}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
              title="Edit in Office Online"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
            </button>
          )}
        </div>
      )}

      {/* Folder arrow */}
      {isFolder && (
        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      )}
    </div>
  );
};
