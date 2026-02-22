/**
 * API client for SiteForge backend.
 *
 * All catalog and BOQ operations go through here.
 * When the backend is not available, methods throw — the UI
 * should handle this gracefully with error states.
 */

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Catalog types (match backend Pydantic schemas) ──────────────────

export interface CatalogItem {
  id: string;
  section: "product" | "service" | "griptel" | "solar";
  rowIndex: number;
  sheetName: string;
  productCode: string;
  description: string;
  comments: string | null;
  orderingHints: string | null;
  productCategory: string;
  productSubcategory: string | null;
  vendor: string | null;
}

export interface CatalogStats {
  total: number;
  products: number;
  services: number;
  griptel: number;
  solar: number;
  categories: string[];
  vendors: string[];
}

// ── BOQ types (match backend Pydantic schemas) ──────────────────────

export interface BOQItemFromAPI {
  id: string;
  catalogItemId: string | null;
  section: "product" | "service" | "griptel" | "solar" | null;
  productCode: string;
  description: string;
  comments: string | null;
  orderingHints: string | null;
  productCategory: string;
  productSubcategory: string | null;
  vendor: string | null;
  quantity: number;
  ruleApplied: string | null;
  isManualOverride: boolean;
  overrideNote: string | null;
  actualQuantity: number | null;
  actualComment: string | null;
  rowIndex: number | null;
  sheetName: string | null;
}

// ── Catalog endpoints ───────────────────────────────────────────────

export async function searchCatalog(params: {
  q?: string;
  section?: string;
  category?: string;
  vendor?: string;
  limit?: number;
  offset?: number;
}): Promise<CatalogItem[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.section) qs.set("section", params.section);
  if (params.category) qs.set("category", params.category);
  if (params.vendor) qs.set("vendor", params.vendor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request<CatalogItem[]>(`/api/catalog/search?${qs}`);
}

export async function getCatalogStats(): Promise<CatalogStats> {
  return request<CatalogStats>("/api/catalog/stats");
}

export async function getCatalogItem(itemId: string): Promise<CatalogItem> {
  return request<CatalogItem>(`/api/catalog/${itemId}`);
}

// ── Project endpoints ────────────────────────────────────────────────

export interface ProjectFromAPI {
  id: string;
  site_id: string;
  site_name: string;
  operator: string;
  status: string;
  created_at: string;
  updated_at: string;
  onedrive_folder_id?: string | null;
  onedrive_folder_path?: string | null;
  tssr_export_version?: number;
  boq_export_version?: number;
  export_history?: ExportHistoryEntry[];
  build_tasks?: BuildTask[];
}

export async function getProjects(params?: {
  site_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ProjectFromAPI[]> {
  const qs = new URLSearchParams();
  if (params?.site_id) qs.set("site_id", params.site_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return request<ProjectFromAPI[]>(`/api/projects${query ? `?${query}` : ""}`);
}

export async function getProject(projectId: string): Promise<ProjectFromAPI> {
  return request<ProjectFromAPI>(`/api/projects/${projectId}`);
}

export async function createProject(params: {
  siteId: string;
  siteName: string;
  operator: string;
  onedriveFolderId?: string;
  onedriveFolderPath?: string;
}): Promise<ProjectFromAPI> {
  return request<ProjectFromAPI>("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      site_id: params.siteId,
      site_name: params.siteName,
      operator: params.operator,
      onedrive_folder_id: params.onedriveFolderId,
      onedrive_folder_path: params.onedriveFolderPath,
    }),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  return request<void>(`/api/projects/${projectId}`, { method: "DELETE" });
}

export async function updateProject(
  projectId: string,
  data: {
    site_id?: string;
    site_name?: string;
    operator?: string;
    status?: string;
    onedrive_folder_id?: string;
    onedrive_folder_path?: string;
  },
): Promise<ProjectFromAPI> {
  return request<ProjectFromAPI>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Project BOQ endpoints ───────────────────────────────────────────

export async function getProjectBOQ(
  projectId: string,
  activeOnly = false,
): Promise<BOQItemFromAPI[]> {
  const qs = activeOnly ? "?activeOnly=true" : "";
  return request<BOQItemFromAPI[]>(`/api/projects/${projectId}/boq${qs}`);
}

export async function addBOQItem(
  projectId: string,
  catalogItemId: string,
  quantity = 0,
  overrideNote?: string,
): Promise<BOQItemFromAPI> {
  return request<BOQItemFromAPI>(`/api/projects/${projectId}/boq`, {
    method: "POST",
    body: JSON.stringify({ catalogItemId, quantity, overrideNote }),
  });
}

export async function updateBOQItem(
  projectId: string,
  itemId: string,
  quantity: number,
  isManualOverride = true,
  overrideNote?: string,
): Promise<BOQItemFromAPI> {
  return request<BOQItemFromAPI>(`/api/projects/${projectId}/boq/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({
      quantity,
      is_manual_override: isManualOverride,
      override_note: overrideNote,
    }),
  });
}

export async function updateBOQItemActuals(
  projectId: string,
  itemId: string,
  actualQuantity: number | null,
  actualComment: string | null,
): Promise<BOQItemFromAPI> {
  return request<BOQItemFromAPI>(`/api/projects/${projectId}/boq/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({
      actual_quantity: actualQuantity,
      actual_comment: actualComment,
    }),
  });
}

export async function removeBOQItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  return request<void>(`/api/projects/${projectId}/boq/${itemId}`, {
    method: "DELETE",
  });
}

// ── BOQ Compute (radio plan → dependency engine → catalog) ──────────

export interface ComputedBOQItem {
  productCode: string;
  description: string;
  quantity: number;
  section: string;
  productCategory: string;
  productSubcategory: string | null;
  vendor: string | null;
  ruleApplied: string;
  rowIndex: number | null;
  sheetName: string | null;
  inCatalog: boolean;
}

export interface BOQComputeResponse {
  items: ComputedBOQItem[];
  diff: {
    changed: {
      productCode: string;
      description: string;
      oldQuantity: number;
      newQuantity: number;
      rule: string | null;
    }[];
    added: {
      productCode: string;
      description: string;
      oldQuantity: number;
      newQuantity: number;
      rule: string | null;
    }[];
    removed: {
      productCode: string;
      description: string;
      oldQuantity: number;
      newQuantity: number;
      rule: string | null;
    }[];
  };
}

export async function computeBOQ(
  projectId: string,
  radioPlan: object,
  powerCalc?: {
    rectifierModules: number;
    rectifierModel: string;
    rectifierIsNew: boolean;
    maxModules: number;
    batteryStrings: number;
    dcCables?: {
      sector: number;
      band: string;
      lengthM: number;
      crossSection: number;
    }[];
  } | null,
): Promise<BOQComputeResponse> {
  const payload = { ...radioPlan, ...(powerCalc ? { powerCalc } : {}) };
  return request<BOQComputeResponse>(`/api/projects/${projectId}/boq/compute`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── TSSR endpoints ──────────────────────────────────────────────────

export interface TSSRFromAPI {
  id: string;
  projectId: string;
  [key: string]: unknown;
}

export async function getProjectTSSR(projectId: string): Promise<TSSRFromAPI> {
  return request<TSSRFromAPI>(`/api/projects/${projectId}/tssr`);
}

export async function updateProjectTSSR(
  projectId: string,
  data: object,
): Promise<TSSRFromAPI> {
  return request<TSSRFromAPI>(`/api/projects/${projectId}/tssr`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Photo endpoints ─────────────────────────────────────────────────

export interface PhotoFromAPI {
  id: string;
  projectId: string;
  originalFilename: string;
  autoFilename: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  section: string;
  sectorId: string | null;
  caption: string | null;
  sortOrder: number;
  annotations: unknown[] | null;
  exifCompass: number | null;
  phase: string;
}

export async function uploadPhotos(
  projectId: string,
  files: File[],
  phase: string = "planning",
): Promise<PhotoFromAPI[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const qs = phase !== "planning" ? `?phase=${encodeURIComponent(phase)}` : "";
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/photos${qs}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getProjectPhotos(
  projectId: string,
  section?: string,
  phase?: string,
): Promise<PhotoFromAPI[]> {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  if (phase) params.set("phase", phase);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<PhotoFromAPI[]>(`/api/projects/${projectId}/photos${qs}`);
}

export async function updateProjectPhoto(
  projectId: string,
  photoId: string,
  update: {
    section?: string;
    sectorId?: string;
    caption?: string;
    sortOrder?: number;
    autoFilename?: string;
    annotations?: unknown[];
  },
): Promise<PhotoFromAPI> {
  return request<PhotoFromAPI>(`/api/projects/${projectId}/photos/${photoId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export async function deleteProjectPhoto(
  projectId: string,
  photoId: string,
): Promise<void> {
  return request<void>(`/api/projects/${projectId}/photos/${photoId}`, {
    method: "DELETE",
  });
}

export async function reorderPhotos(
  projectId: string,
  photoIds: string[],
): Promise<void> {
  return request<void>(`/api/projects/${projectId}/photos/reorder`, {
    method: "POST",
    body: JSON.stringify({ photoIds }),
  });
}

export interface OneDrivePhotoImportItem {
  onedrive_item_id: string;
  filename: string;
  mime_type: string;
  download_url: string;
  file_size: number;
}

export async function importPhotosFromOneDrive(
  projectId: string,
  photos: OneDrivePhotoImportItem[],
  phase: string = "planning",
): Promise<PhotoFromAPI[]> {
  return request<PhotoFromAPI[]>(
    `/api/projects/${projectId}/photos/import-onedrive`,
    {
      method: "POST",
      body: JSON.stringify({ photos, phase }),
    },
  );
}

// ── Build tasks ─────────────────────────────────────────────────────

export interface BuildTask {
  id: string;
  source: "planned_works" | "boq";
  section: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  note: string;
}

export async function getBuildTasks(projectId: string): Promise<BuildTask[]> {
  return request<BuildTask[]>(`/api/projects/${projectId}/build-tasks`);
}

export async function saveBuildTasks(
  projectId: string,
  tasks: BuildTask[],
): Promise<BuildTask[]> {
  return request<BuildTask[]>(`/api/projects/${projectId}/build-tasks`, {
    method: "PUT",
    body: JSON.stringify(tasks),
  });
}

// ── Export history ───────────────────────────────────────────────────

export interface ExportHistoryEntry {
  type: string;
  version: number;
  destination: string;
  filename: string;
  timestamp: string;
  onedrive_path?: string | null;
}

export async function recordExport(
  projectId: string,
  entry: ExportHistoryEntry,
): Promise<ExportHistoryEntry[]> {
  return request<ExportHistoryEntry[]>(`/api/projects/${projectId}/exports`, {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

/**
 * Download TSSR as filled .docx template from backend.
 * The backend copies the original Word template, fills Site Identity (Table 0)
 * and TSSR Alignment (Table 1) with project data, preserving formatting.
 */
export async function exportTSSRTemplate(
  projectId: string,
  format: "legacy" | "modern" = "legacy",
  asBuilt: boolean = false,
): Promise<void> {
  const params = new URLSearchParams();
  if (format !== "legacy") params.set("format", format);
  if (asBuilt) params.set("as_built", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${API_BASE}/api/projects/${projectId}/tssr/export${qs}`,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${res.status} ${body}`);
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || "TSSR_export.docx";

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download BOQ as filled .xlsm template from backend.
 * The backend copies the original Excel template, fills quantities + metadata,
 * and returns the file preserving macros, formatting, and formulas.
 */
export async function exportBOQTemplate(
  projectId: string,
  asBuilt: boolean = false,
): Promise<void> {
  const qs = asBuilt ? "?as_built=true" : "";
  const res = await fetch(
    `${API_BASE}/api/projects/${projectId}/boq/export${qs}`,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${res.status} ${body}`);
  }
  // Extract filename from Content-Disposition header
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || "BoQ_export.xlsm";

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
