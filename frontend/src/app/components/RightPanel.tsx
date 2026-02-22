import React, { useState, useMemo, useCallback } from "react";
import { Button } from "./ui/button";
import {
  FileDown,
  Search,
  X,
  Cloud,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useSiteContext } from "../context/SiteContext";
import { useWorkflowContext } from "../context/WorkflowContext";
import { BOQSpreadsheetView } from "./BOQSpreadsheetView";
import { exportBOQTemplate, API_BASE } from "../api/client";
import { uploadAndGetEditUrl } from "../api/graphService";
import type { CatalogSection } from "../types/site";
import { toast } from "sonner";

type ActiveTab = "siteforge" | "excel";
type SectionFilter = "all" | CatalogSection;

const SECTION_LABELS: Record<SectionFilter, string> = {
  all: "All",
  product: "Products",
  service: "Services",
  griptel: "Griptel",
  solar: "Solar",
};

export const RightPanel: React.FC = () => {
  const {
    boqItems,
    recentChanges,
    projectId,
    tssrData,
    boqComputeStatus,
    boqComputeError,
    retryBOQCompute,
  } = useSiteContext();
  const { instance } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("siteforge");
  const [activeSection, setActiveSection] = useState<SectionFilter>("all");
  const { isAtLeastStatus } = useWorkflowContext();
  const [showActuals, setShowActuals] = useState(false);

  // Excel Online state
  const [excelWebUrl, setExcelWebUrl] = useState<string | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelSyncedAt, setExcelSyncedAt] = useState<string | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelOneDrivePath, setExcelOneDrivePath] = useState<string | null>(
    null,
  );

  // Upload BOQ to OneDrive
  const syncToOneDrive = useCallback(async () => {
    if (!projectId) {
      toast.warning("No project loaded");
      return;
    }
    if (!isMsalAuthenticated) {
      toast.warning("Sign in to OneDrive first (ONEDRIVE tab)");
      return;
    }

    setExcelLoading(true);
    try {
      // Upload as .xlsm (original format) — Excel Online opens it and disables macros
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/boq/export`,
      );
      if (!res.ok) throw new Error("BOQ export failed");
      const blob = await res.blob();

      const siteId = tssrData.siteId || "unknown";
      const folderPath = `SiteForge/${siteId}`;
      const fileName = `${siteId}_BOQ_live.xlsm`;
      const result = await uploadAndGetEditUrl(
        instance,
        folderPath,
        fileName,
        await blob.arrayBuffer(),
      );

      setExcelWebUrl(result.webUrl);
      setExcelFileName(fileName);
      setExcelOneDrivePath(`OneDrive/${folderPath}`);
      setExcelSyncedAt(
        new Date().toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );

      toast.success("BOQ synced to OneDrive");
    } catch (err: any) {
      console.error("Excel Online sync failed:", err);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setExcelLoading(false);
    }
  }, [projectId, isMsalAuthenticated, instance, tssrData.siteId]);

  // Filter pipeline: section -> active/all -> search
  const filteredItems = useMemo(() => {
    let items = boqItems;

    if (activeSection !== "all") {
      items = items.filter((item) => item.section === activeSection);
    }

    if (!showAll) {
      items = items.filter((item) => item.quantity > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.description.toLowerCase().includes(q) ||
          item.productCode.toLowerCase().includes(q) ||
          item.productCategory.toLowerCase().includes(q) ||
          (item.vendor && item.vendor.toLowerCase().includes(q)) ||
          (item.orderingHints && item.orderingHints.toLowerCase().includes(q)),
      );
    }

    return items;
  }, [boqItems, activeSection, showAll, searchQuery]);

  // Section counts for tab badges
  const sectionCounts = useMemo(() => {
    const counts: Record<SectionFilter, number> = {
      all: boqItems.length,
      product: 0,
      service: 0,
      griptel: 0,
      solar: 0,
    };
    for (const item of boqItems) {
      if (item.section) counts[item.section]++;
    }
    return counts;
  }, [boqItems]);

  const totalQuantity = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
  const activeItemCount = boqItems.filter((i) => i.quantity > 0).length;

  const handleExport = async () => {
    if (!projectId) {
      toast.warning("No project loaded");
      return;
    }
    try {
      await exportBOQTemplate(projectId);
      toast.success("BOQ exported", {
        description: "Template filled with quantities and downloaded",
      });
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header with main tabs */}
      <div className="border-b bg-white pl-4 pr-10 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "siteforge"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("siteforge")}
          >
            SiteForge View
          </button>
          {isMsalAuthenticated && (
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "excel"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("excel")}
            >
              Excel Online
              {excelSyncedAt && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAtLeastStatus("approved") && (
            <Button
              variant={showActuals ? "default" : "outline"}
              size="sm"
              onClick={() => setShowActuals(!showActuals)}
              className="text-xs h-7"
            >
              {showActuals ? "Actuals" : "Planned"}
            </Button>
          )}
          <Button
            variant={showAll ? "outline" : "default"}
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs h-7"
          >
            {showAll ? "All" : "Active"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-7"
            onClick={handleExport}
          >
            <FileDown className="h-3.5 w-3.5" />
            <span className="text-xs">Export</span>
          </Button>
        </div>
      </div>

      {activeTab === "siteforge" ? (
        <>
          {/* Section Tabs */}
          <div className="border-b bg-white px-3 py-1.5">
            <Tabs
              value={activeSection}
              onValueChange={(v) => setActiveSection(v as SectionFilter)}
              className="gap-0"
            >
              <TabsList className="h-8 w-full">
                {(
                  Object.entries(SECTION_LABELS) as [SectionFilter, string][]
                ).map(([key, label]) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="text-xs gap-1 px-2 h-7"
                  >
                    {label}
                    {sectionCounts[key] > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0 min-w-[16px] h-4 leading-none"
                      >
                        {sectionCounts[key]}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* BOQ Compute Status */}
          {boqComputeStatus === "computing" && (
            <div className="border-b bg-blue-50 px-4 py-1.5 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
              <span className="text-xs text-blue-700">
                Computing BOQ from imports...
              </span>
            </div>
          )}
          {boqComputeStatus === "error" && (
            <div className="border-b bg-red-50 px-4 py-1.5 flex items-center justify-between">
              <span className="text-xs text-red-700 truncate">
                BOQ compute failed
                {boqComputeError ? `: ${boqComputeError}` : ""}
              </span>
              <button
                onClick={retryBOQCompute}
                className="flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 px-2 py-0.5 rounded hover:bg-red-100 transition-colors shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}
          {boqComputeStatus === "success" && boqItems.length > 0 && (
            <div className="border-b bg-green-50 px-4 py-1.5 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs text-green-700">
                {boqItems.filter((i) => i.quantity > 0).length} items computed
                from catalog
              </span>
            </div>
          )}

          {/* Search Bar */}
          <div className="border-b bg-white px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Spreadsheet */}
          <div className="flex-1 min-h-0 overflow-auto">
            <BOQSpreadsheetView
              items={filteredItems}
              recentChanges={recentChanges}
              showActuals={showActuals}
            />
          </div>

          {/* Footer Totals */}
          <div className="border-t bg-white px-4 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-600">
                {filteredItems.length} items
                {activeSection !== "all" &&
                  ` in ${SECTION_LABELS[activeSection]}`}
              </span>
              <span className="text-gray-500 tabular-nums font-medium">
                {totalQuantity} total qty
              </span>
            </div>
          </div>
        </>
      ) : (
        /* Excel Online tab */
        <div className="flex-1 flex flex-col">
          {excelLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700">
                  Syncing BOQ to OneDrive...
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Exporting, uploading, and preparing link
                </p>
              </div>
            </div>
          ) : excelWebUrl ? (
            /* Synced state */
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-xs text-green-800 font-medium">
                  Synced to OneDrive at {excelSyncedAt}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                  {/* File card */}
                  <div className="border border-gray-200 rounded-xl bg-white p-5 mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5 text-green-700"
                          fill="currentColor"
                        >
                          <path d="M14.5 1h-11L2 2.5v19l1.5 1.5h15l1.5-1.5V7l-5.5-6zm3 20.5h-11v-17h7V8h4v13.5z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {excelFileName}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <FolderOpen className="h-3 w-3" />
                          {excelOneDrivePath}
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                          Items
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {activeItemCount}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                          Total Qty
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {totalQuantity}
                        </p>
                      </div>
                    </div>

                    {/* Open button */}
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={() => window.open(excelWebUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in Excel Online
                    </Button>
                  </div>

                  {/* Secondary actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 text-xs"
                      size="sm"
                      onClick={syncToOneDrive}
                      disabled={excelLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Re-sync
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 text-xs"
                      size="sm"
                      onClick={handleExport}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Download .xlsm
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Not synced — initial state */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center w-full max-w-xs">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Cloud className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Excel Online
                </p>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  Push the current BOQ to OneDrive and open it in Excel Online
                  for native spreadsheet editing and final review.
                </p>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={syncToOneDrive}
                  disabled={excelLoading}
                >
                  <Cloud className="h-4 w-4" />
                  Sync & Open in Excel Online
                </Button>
                <p className="text-[11px] text-gray-300 mt-3">
                  Changes in Excel Online are saved to OneDrive, not back to
                  SiteForge
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
