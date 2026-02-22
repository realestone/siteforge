import React, { useState, useCallback, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { graphScopes } from "../lib/msalConfig";
import { useSiteContext } from "../context/SiteContext";
import {
  importPhotosFromOneDrive,
  type OneDrivePhotoImportItem,
} from "../api/client";
import { toast } from "sonner";
import {
  Cloud,
  CloudOff,
  LogIn,
  Folder,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  thumbnails?: { large?: { url: string }; medium?: { url: string } }[];
  "@microsoft.graph.downloadUrl"?: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isImageFile(item: DriveItem): boolean {
  if (!item.file) return false;
  const mime = item.file.mimeType || "";
  if (mime.startsWith("image/")) return true;
  const ext = item.name.toLowerCase();
  return /\.(jpg|jpeg|png|heic|webp|gif|bmp|tiff?)$/i.test(ext);
}

async function listFilesWithThumbnails(
  msalInstance: any,
  folderId?: string,
): Promise<{ value: DriveItem[] }> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error("Not signed in");

  const response = await msalInstance.acquireTokenSilent({
    scopes: graphScopes.files,
    account: accounts[0],
  });

  const path = folderId
    ? `/me/drive/items/${folderId}/children`
    : `/me/drive/root/children`;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0${path}?$expand=thumbnails&$orderby=name&$top=200`,
    {
      headers: { Authorization: `Bearer ${response.accessToken}` },
    },
  );
  if (!res.ok) throw new Error(`Graph API error ${res.status}`);
  return res.json();
}

async function getDownloadUrl(
  msalInstance: any,
  itemId: string,
): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  const response = await msalInstance.acquireTokenSilent({
    scopes: graphScopes.files,
    account: accounts[0],
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
    {
      headers: { Authorization: `Bearer ${response.accessToken}` },
    },
  );
  if (!res.ok) throw new Error(`Graph API error ${res.status}`);
  const data = await res.json();
  return data["@microsoft.graph.downloadUrl"];
}

// ── Component ───────────────────────────────────────────────────────

interface OneDrivePhotoBrowserProps {
  onClose: () => void;
}

export const OneDrivePhotoBrowser: React.FC<OneDrivePhotoBrowserProps> = ({
  onClose,
}) => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { projectId, onedriveFolderId } = useSiteContext();

  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "OneDrive" },
  ]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Images in current folder
  const imageItems = items.filter(isImageFile);
  const folderItems = items.filter((i) => !!i.folder);

  // ── Load folder ─────────────────────────────────────────────────

  const loadFolder = useCallback(
    async (folderId?: string | null, folderName?: string) => {
      setLoading(true);
      setSelected(new Set());
      try {
        const result = await listFilesWithThumbnails(
          instance,
          folderId || undefined,
        );
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
        toast.error("Failed to load OneDrive folder");
      } finally {
        setLoading(false);
      }
    },
    [instance],
  );

  const navigateTo = useCallback(
    async (index: number) => {
      const target = breadcrumbs[index];
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setLoading(true);
      setSelected(new Set());
      try {
        const result = await listFilesWithThumbnails(
          instance,
          target.id || undefined,
        );
        setItems(result.value || []);
      } catch (err) {
        console.error("Navigation failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [instance, breadcrumbs],
  );

  // Auto-load linked folder or root on mount
  useEffect(() => {
    if (isAuthenticated && items.length === 0 && !loading) {
      if (onedriveFolderId) {
        loadFolder(onedriveFolderId, "Project Folder");
      } else {
        loadFolder();
      }
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection ───────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === imageItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(imageItems.map((i) => i.id)));
    }
  };

  // ── Import ──────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!projectId || selected.size === 0) return;

    setImporting(true);
    try {
      const selectedItems = imageItems.filter((i) => selected.has(i.id));

      // Get download URLs for all selected items
      setImportProgress(`Getting download links (0/${selectedItems.length})...`);
      const photoImports: OneDrivePhotoImportItem[] = [];

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setImportProgress(
          `Getting download links (${i + 1}/${selectedItems.length})...`,
        );
        try {
          const downloadUrl = await getDownloadUrl(instance, item.id);
          photoImports.push({
            onedrive_item_id: item.id,
            filename: item.name,
            mime_type: item.file?.mimeType || "image/jpeg",
            download_url: downloadUrl,
            file_size: item.size || 0,
          });
        } catch (err) {
          console.error(`Failed to get download URL for ${item.name}:`, err);
        }
      }

      if (photoImports.length === 0) {
        toast.error("Could not get download links for any photos");
        setImporting(false);
        return;
      }

      // Send to backend for download + storage
      setImportProgress(
        `Downloading ${photoImports.length} photos to server...`,
      );
      const imported = await importPhotosFromOneDrive(projectId, photoImports);

      toast.success(`${imported.length} photo(s) imported from OneDrive`);
      onClose();
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error("Import failed", { description: err.message });
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  }, [projectId, selected, imageItems, instance, onClose]);

  // ── Not signed in ─────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8 text-center">
          <CloudOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect to OneDrive
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Sign in with your Microsoft account to import photos.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onClose}
              className="h-10 px-4 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                instance.loginRedirect({
                  scopes: [...graphScopes.files, ...graphScopes.user],
                  prompt: "select_account",
                })
              }
              className="h-10 px-6 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Importing progress ────────────────────────────────────────

  if (importing) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <Loader2 className="h-10 w-10 text-teal-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Importing Photos
          </h3>
          <p className="text-sm text-gray-500">{importProgress}</p>
        </div>
      </div>
    );
  }

  // ── Main browser ──────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Import Photos from OneDrive
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1 text-sm overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
              <button
                onClick={() => navigateTo(i)}
                className={`flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-gray-100 ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-gray-900"
                    : "text-gray-500"
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar */}
        {imageItems.length > 0 && (
          <div className="px-6 py-2 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={selectAll}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              {selected.size === imageItems.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selected.size === imageItems.length
                ? "Deselect all"
                : `Select all (${imageItems.length})`}
            </button>
            <span className="text-xs text-gray-500">
              {selected.size} selected
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400">Empty folder</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Folders */}
              {folderItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">
                    Folders
                  </h4>
                  <div className="space-y-0.5">
                    {folderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => loadFolder(item.id, item.name)}
                      >
                        <Folder className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm font-medium flex-1">
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.folder?.childCount ?? 0} items
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos grid */}
              {imageItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">
                    Photos ({imageItems.length})
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {imageItems.map((item) => {
                      const isSelected = selected.has(item.id);
                      const thumbUrl =
                        item.thumbnails?.[0]?.medium?.url ||
                        item.thumbnails?.[0]?.large?.url;
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelect(item.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-transparent hover:border-gray-300"
                          }`}
                        >
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                          {/* Selection indicator */}
                          <div
                            className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-blue-500"
                                : "bg-black/30 group-hover:bg-black/50"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          {/* Filename */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                            <span className="text-[10px] text-white truncate block">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No images in folder */}
              {imageItems.length === 0 && folderItems.length > 0 && (
                <div className="text-center py-8">
                  <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No photos in this folder
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Browse into a subfolder to find photos
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="h-9 px-4 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-2 h-9 px-6 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Import {selected.size > 0 ? `${selected.size} Photo${selected.size !== 1 ? "s" : ""}` : "Photos"}
          </button>
        </div>
      </div>
    </div>
  );
};
