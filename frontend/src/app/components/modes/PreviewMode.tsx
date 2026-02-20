import React, { useEffect, useCallback, useState } from "react";
import { useSiteContext } from "../../context/SiteContext";
import {
  Building2,
  Radio,
  Table as TableIcon,
  Camera,
  CheckCircle2,
  Circle,
  Download,
  FileDown,
  FileText,
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Zap as ZapIcon,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { downloadBOQCsv } from "../../lib/boq-export";
import { exportBOQTemplate } from "../../api/client";

// ============================================================
// Helpers
// ============================================================

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="mb-5">
    <div className="flex items-center gap-3">
      {icon}
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
    {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
  </div>
);

const Field: React.FC<{ label: string; value?: string | number }> = ({
  label,
  value,
}) => (
  <div className="mb-4">
    <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
    <p className="text-base text-gray-900 leading-relaxed">
      {value || <span className="text-gray-400">&mdash;</span>}
    </p>
  </div>
);

const SectionDivider: React.FC = () => (
  <div className="mb-8 pb-6 border-b border-gray-200" />
);

// ============================================================
// TSSR Document Content
// ============================================================

const TSSRDocumentContent: React.FC = () => {
  const { tssrData, boqItems, photos } = useSiteContext();
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const requiredFields = [
    tssrData.siteName,
    tssrData.siteId,
    tssrData.operator,
    tssrData.config,
    tssrData.landlordName,
  ];
  const isComplete = requiredFields.every((f) => f && f.trim() !== "");

  return (
    <>
      {/* Document Header */}
      <div className="pb-8 border-b-2 border-gray-200 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Technical Site Survey Report
        </h1>
        <p className="text-xl font-semibold text-blue-600 mt-2">
          {tssrData.siteName || (
            <span className="text-gray-400">Untitled Site</span>
          )}
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: "Site ID", value: tssrData.siteId },
            { label: "Owner", value: tssrData.landlordName },
            { label: "Customer", value: tssrData.operator },
            { label: "Configuration Code", value: tssrData.config },
            { label: "Document Version", value: "1.0" },
            { label: "Date Generated", value: dateStr },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {item.value || <span className="text-gray-400">&mdash;</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Site Identity & Access */}
      <SectionHeader
        icon={<Building2 className="h-6 w-6 text-blue-600" />}
        title="Site Identity & Access"
      />
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Field label="Site Name" value={tssrData.siteName} />
          <Field label="Site ID" value={tssrData.siteId} />
          <Field label="Operator" value={tssrData.operator} />
          <Field label="Site Category" value={tssrData.siteCategory} />
        </div>
        <div>
          <Field label="Landlord / Owner" value={tssrData.landlordName} />
          <Field
            label="Access Instructions"
            value={tssrData.accessInstructions}
          />
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-600 mb-1">
              Crane Required
            </p>
            <div className="flex items-center gap-2">
              {tssrData.craneNeeded ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
              <span className="text-base text-gray-900">
                {tssrData.craneNeeded ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <SectionDivider />

      {/* Transmission */}
      <SectionHeader
        icon={<Radio className="h-6 w-6 text-cyan-600" />}
        title="Transmission"
      />
      <div className="mb-4">
        <span className="inline-block px-4 py-2 text-base font-semibold text-cyan-700 bg-cyan-50 border border-cyan-400 rounded-lg">
          {tssrData.config || (
            <span className="text-gray-400">Not specified</span>
          )}
        </span>
      </div>
      {tssrData.additionalNotes && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-600 mb-2">Notes</p>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {tssrData.additionalNotes}
          </div>
        </div>
      )}
      <SectionDivider />

      {/* Antenna Mounts */}
      <SectionHeader
        icon={<Radio className="h-6 w-6 text-pink-600" />}
        title="Antenna Mounts"
      />
      {tssrData.sectorData.length > 0 ? (
        <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-48">
                  Sector
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Antenna
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-28">
                  Azimuth
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-28">
                  M-Tilt
                </th>
              </tr>
            </thead>
            <tbody>
              {tssrData.sectorData.map((sector, i) => (
                <tr
                  key={sector.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    Sector {sector.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {(sector.antennas || []).join(", ") || (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                    {sector.azimuth}°
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                    {sector.mTilt}°
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No sectors configured</p>
      )}
      <SectionDivider />

      {/* BOQ Summary (condensed) */}
      <SectionHeader
        icon={<TableIcon className="h-6 w-6 text-blue-600" />}
        title="Bill of Quantities"
        subtitle="Auto-generated from TSSR data"
      />
      {boqItems.length > 0 ? (
        <div className="mt-4 w-full border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-36">
                  Product Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-20">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-32">
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {boqItems.slice(0, 10).map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 bg-gray-50">
                    {item.productCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {item.productCategory}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td
                  colSpan={2}
                  className="px-4 py-3 text-sm font-bold text-gray-900"
                >
                  Total Items: {boqItems.length}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                  {boqItems.reduce((s, i) => s + i.quantity, 0)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
          {boqItems.length > 10 && (
            <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
              Showing 10 of {boqItems.length} items
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic mt-4">
          No BOQ items generated yet
        </p>
      )}
      <SectionDivider />

      {/* Photos */}
      {photos.length > 0 && (
        <>
          <SectionHeader
            icon={<Camera className="h-6 w-6 text-blue-600" />}
            title="Site Photos"
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                <div className="aspect-[4/3]">
                  <img
                    src={photo.fileUrl}
                    alt={photo.caption || photo.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    {photo.section || "General"}
                  </p>
                  {photo.caption && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(photo.timestamp).toLocaleString([], {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <SectionDivider />
        </>
      )}

      {/* Document Footer */}
      <div className="mt-12 pt-6 border-t-2 border-gray-200 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Document generated on {dateStr} at {timeStr}
        </p>
        <span
          className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${isComplete ? "bg-green-100 text-green-800 border-green-300" : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}
        >
          {isComplete ? "\u2713 Complete" : "\u26A0 Incomplete"}
        </span>
      </div>
    </>
  );
};

// ============================================================
// BOQ Spreadsheet Content
// ============================================================

type SortField = "productCode" | "description" | "quantity" | "productCategory";
type SortDir = "asc" | "desc";

const BOQSpreadsheetContent: React.FC<{ onGoToForm: () => void }> = ({
  onGoToForm,
}) => {
  const { boqItems } = useSiteContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [mappingMode, setMappingMode] = useState(false);
  const perPage = 50;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 text-gray-300 ml-2 inline" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-blue-600 ml-2 inline" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-600 ml-2 inline" />
    );
  };

  // Filter
  let filtered = boqItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      categoryFilter === "all" || item.productCategory === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Sort
  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalQty = filtered.reduce((s, i) => s + i.quantity, 0);

  const categories = Array.from(
    new Set(boqItems.map((i) => i.productCategory)),
  ).sort();

  if (boqItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-12">
          <TableIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">
            No BOQ Items Yet
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Start filling out the TSSR form to automatically generate BOQ items.
            Add equipment, cables, antennas, and other materials.
          </p>
          <button
            onClick={onGoToForm}
            className="inline-flex items-center gap-2 mt-6 h-10 px-5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Form
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 bg-gray-50 border-b border-gray-200 px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search BOQ items..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="h-9 w-70 pl-9 pr-3 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* Category filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="h-9 w-50 pl-9 pr-3 text-sm border border-gray-300 rounded-lg bg-white outline-none appearance-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMappingMode(!mappingMode)}
            className={`inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg border transition-colors ${
              mappingMode
                ? "bg-blue-100 border-blue-400 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Eye className="h-4 w-4" />
            Mapping
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="sticky top-0 z-[5]">
            <tr className="bg-gray-50 border-b-2 border-gray-300 h-12">
              <th className="w-[60px] px-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide border-r border-gray-200 bg-gray-100">
                #
              </th>
              <th
                className="w-[160px] px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer select-none"
                onClick={() => toggleSort("productCode")}
              >
                Product Code <SortIcon field="productCode" />
              </th>
              <th
                className="px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer select-none min-w-[300px]"
                onClick={() => toggleSort("description")}
              >
                Description <SortIcon field="description" />
              </th>
              <th
                className="w-[120px] px-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer select-none"
                onClick={() => toggleSort("quantity")}
              >
                Qty <SortIcon field="quantity" />
              </th>
              <th
                className="w-[140px] px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer select-none"
                onClick={() => toggleSort("productCategory")}
              >
                Category <SortIcon field="productCategory" />
              </th>
              <th className="w-[220px] px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                Calculated From
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((item, i) => (
              <tr
                key={item.id}
                className={`h-[52px] border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"}`}
              >
                <td className="px-3 text-sm font-medium text-gray-400 text-center border-r border-gray-100 bg-[#FAFAFA]">
                  {page * perPage + i + 1}
                </td>
                <td className="px-4 font-mono text-[13px] font-semibold text-gray-800 bg-gray-50 tracking-wide">
                  {item.productCode}
                </td>
                <td className="px-4 text-sm text-gray-700 leading-relaxed">
                  {item.description}
                </td>
                <td
                  className={`px-4 text-[15px] font-bold text-right ${item.quantity > 10 ? "text-yellow-800 bg-yellow-100" : "text-gray-900"}`}
                >
                  {item.quantity}
                </td>
                <td className="px-4 text-sm text-gray-500">
                  {item.productCategory}
                </td>
                <td className="px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md ${mappingMode ? "cursor-pointer hover:bg-blue-100 hover:border-blue-400 hover:scale-[1.02] transition-all" : ""}`}
                  >
                    {item.ruleApplied || "Auto"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-[5] h-14 bg-gray-100 border-t-2 border-gray-300 px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-700">
            Total Items: {filtered.length}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            Total Qty: {totalQty}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Showing {page * perPage + 1}-
            {Math.min((page + 1) * perPage, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-9 w-9 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 text-gray-700" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i).map(
              (i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`h-9 w-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                    page === i
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ),
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-9 w-9 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Preview Modal (shared container with TSSR/BOQ toggle)
// ============================================================

type PreviewView = "tssr" | "boq";

export const PreviewModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { tssrData, boqItems, projectId } = useSiteContext();
  const [view, setView] = useState<PreviewView>("tssr");

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  const subtitle =
    view === "tssr"
      ? tssrData.siteName
        ? `${tssrData.siteName} - TSSR`
        : "Technical Site Survey Report"
      : `Auto-generated from TSSR data \u2022 ${boqItems.length} items`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-auto"
      onClick={onClose}
    >
      <div
        className={`relative ${view === "boq" ? "w-[95vw] max-w-[1600px]" : "w-[90vw] max-w-[1200px]"} max-h-[90vh] bg-gray-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {view === "tssr"
                  ? "TSSR Document Preview"
                  : "Bill of Quantities"}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-sm text-gray-500">{subtitle}</p>
                {view === "boq" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 border border-green-300 rounded-full animate-pulse">
                    <ZapIcon className="h-3 w-3 text-green-600" />
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView("tssr")}
                className={`inline-flex items-center gap-1.5 w-[100px] h-9 justify-center text-sm rounded-md transition-all ${
                  view === "tssr"
                    ? "bg-white shadow-sm font-semibold text-blue-600"
                    : "text-gray-500 font-medium hover:bg-gray-200"
                }`}
              >
                <FileText className="h-4 w-4" />
                TSSR
              </button>
              <button
                onClick={() => setView("boq")}
                className={`inline-flex items-center gap-1.5 w-[100px] h-9 justify-center text-sm rounded-md transition-all ${
                  view === "boq"
                    ? "bg-white shadow-sm font-semibold text-blue-600"
                    : "text-gray-500 font-medium hover:bg-gray-200"
                }`}
              >
                <TableIcon className="h-4 w-4" />
                BOQ
              </button>
            </div>

            {/* Actions */}
            {view === "tssr" ? (
              <button
                onClick={() =>
                  toast.success("Exporting DOCX", {
                    description: "Download will begin shortly",
                  })
                }
                className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:-translate-y-px hover:shadow-md active:translate-y-0 transition-all duration-150"
              >
                <Download className="h-[18px] w-[18px]" />
                Export DOCX
              </button>
            ) : (
              <>
                <button
                  onClick={async () => {
                    if (!projectId) {
                      toast.warning("No project loaded");
                      return;
                    }
                    try {
                      await exportBOQTemplate(projectId);
                      toast.success("BOQ exported", {
                        description: "Template filled with quantities",
                      });
                    } catch {
                      toast.error("Export failed");
                    }
                  }}
                  className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 hover:-translate-y-px hover:shadow-md active:translate-y-0 transition-all duration-150"
                >
                  <Download className="h-[18px] w-[18px]" />
                  Export XLSM
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadBOQCsv(boqItems);
                      toast.success("CSV exported");
                    } catch {
                      toast.error("Export failed");
                    }
                  }}
                  className="inline-flex items-center gap-2 h-10 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileDown className="h-[18px] w-[18px]" />
                  Export CSV
                </button>
              </>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-100 hover:text-red-600 active:bg-red-200 transition-all duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "tssr" ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-10">
            <div className="w-full max-w-[850px] mx-auto bg-white rounded-xl shadow-lg p-16 min-h-[1200px]">
              <TSSRDocumentContent />
            </div>
          </div>
        ) : (
          <BOQSpreadsheetContent
            onGoToForm={() => {
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Legacy tab export
export const PreviewMode: React.FC = () => (
  <div className="h-full bg-gray-50 overflow-y-auto p-10">
    <div className="max-w-[850px] mx-auto bg-white rounded-xl shadow-lg p-16 min-h-[1000px]">
      <TSSRDocumentContent />
    </div>
  </div>
);
