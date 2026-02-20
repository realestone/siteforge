import React, { useState, useMemo } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { FileDown, Search, X, TableProperties, LayoutList } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useSiteContext } from "../context/SiteContext";
import { BOQSpreadsheetView } from "./BOQSpreadsheetView";
import { BOQCardView } from "./BOQCardView";
import { exportBOQTemplate } from "../api/client";
import type { CatalogSection } from "../types/site";
import { toast } from "sonner";

type ViewMode = "table" | "cards";
type SectionFilter = "all" | CatalogSection;

const SECTION_LABELS: Record<SectionFilter, string> = {
  all: "All",
  product: "Products",
  service: "Services",
  griptel: "Griptel",
  solar: "Solar",
};

export const RightPanel: React.FC = () => {
  const { boqItems, recentChanges, projectId } = useSiteContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeSection, setActiveSection] = useState<SectionFilter>("all");

  // Filter pipeline: section -> active/all -> search
  const filteredItems = useMemo(() => {
    let items = boqItems;

    // Section filter
    if (activeSection !== "all") {
      items = items.filter((item) => item.section === activeSection);
    }

    // Active only filter
    if (!showAll) {
      items = items.filter((item) => item.quantity > 0);
    }

    // Search filter
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
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">BOQ Live View</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredItems.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {/* View toggle */}
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 w-8 p-0"
            title="Spreadsheet view"
          >
            <TableProperties className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="h-8 w-8 p-0"
            title="Card view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <Button
            variant={showAll ? "outline" : "default"}
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs h-8"
          >
            {showAll ? "All" : "Active"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-8"
            onClick={handleExport}
          >
            <FileDown className="h-4 w-4" />
            <span className="text-xs">Export</span>
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b bg-white px-3 py-1.5">
        <Tabs
          value={activeSection}
          onValueChange={(v) => setActiveSection(v as SectionFilter)}
          className="gap-0"
        >
          <TabsList className="h-8 w-full">
            {(Object.entries(SECTION_LABELS) as [SectionFilter, string][]).map(
              ([key, label]) => (
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
              ),
            )}
          </TabsList>
        </Tabs>
      </div>

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

      {/* Content */}
      <ScrollArea className="flex-1">
        {viewMode === "table" ? (
          <BOQSpreadsheetView
            items={filteredItems}
            recentChanges={recentChanges}
          />
        ) : (
          <BOQCardView items={filteredItems} recentChanges={recentChanges} />
        )}
      </ScrollArea>

      {/* Footer Totals */}
      <div className="border-t bg-white px-4 py-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-600">
            {filteredItems.length} items
            {activeSection !== "all" && ` in ${SECTION_LABELS[activeSection]}`}
          </span>
          <span className="text-gray-500 tabular-nums font-medium">
            {totalQuantity} total qty
          </span>
        </div>
      </div>
    </div>
  );
};
