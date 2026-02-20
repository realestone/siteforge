/**
 * API client for SiteForge backend.
 *
 * All catalog and BOQ operations go through here.
 * When the backend is not available, methods throw — the UI
 * should handle this gracefully with error states.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
): Promise<BOQComputeResponse> {
  return request<BOQComputeResponse>(`/api/projects/${projectId}/boq/compute`, {
    method: "POST",
    body: JSON.stringify(radioPlan),
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

/**
 * Download TSSR as filled .docx template from backend.
 * The backend copies the original Word template, fills Site Identity (Table 0)
 * and TSSR Alignment (Table 1) with project data, preserving formatting.
 */
export async function exportTSSRTemplate(
  projectId: string,
  format: "legacy" | "modern" = "legacy",
): Promise<void> {
  const qs = format !== "legacy" ? `?format=${format}` : "";
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
export async function exportBOQTemplate(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/boq/export`);
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
