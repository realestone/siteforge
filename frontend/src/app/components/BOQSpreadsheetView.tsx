import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { ChevronUp, ChevronDown, Package, Pencil } from "lucide-react";
import { useSiteContext } from "../context/SiteContext";
import type { BOQItem } from "../types/site";

// ── Category Colors ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; row: string }
> = {
  "System module": {
    bg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-l-violet-400",
    row: "bg-violet-50/30",
  },
  "Service items": {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-l-emerald-400",
    row: "bg-emerald-50/30",
  },
  // Extend here for future categories:
  // "Griptel":     { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-l-amber-400",  row: "bg-amber-50/30" },
  // "Solar":       { bg: "bg-sky-100",     text: "text-sky-700",     border: "border-l-sky-400",    row: "bg-sky-50/30" },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: "bg-gray-100",
  text: "text-gray-600",
  border: "border-l-gray-400",
  row: "bg-gray-50/30",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

// ── Types ───────────────────────────────────────────────────────────

type SortField =
  | "productCode"
  | "description"
  | "quantity"
  | "productCategory"
  | "vendor";
type SortDir = "asc" | "desc";

interface BOQSpreadsheetViewProps {
  items: BOQItem[];
  recentChanges: Set<string>;
  showActuals?: boolean;
}

// ── Editable Quantity Cell ──────────────────────────────────────────

const EditableQuantityCell: React.FC<{
  itemId: string;
  value: number;
  isChanged: boolean;
}> = ({ itemId, value, isChanged }) => {
  const { updateBOQItemQuantity } = useSiteContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = useCallback(() => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0 && num !== value) {
      updateBOQItemQuantity(itemId, num, true);
    }
    setEditing(false);
  }, [draft, value, itemId, updateBOQItemQuantity]);

  const cancel = useCallback(() => {
    setDraft(String(value));
    setEditing(false);
  }, [value]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className="w-16 h-7 px-1.5 text-right text-sm font-semibold tabular-nums border border-blue-400 rounded bg-white outline-none ring-2 ring-blue-200"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-16 h-7 px-1.5 text-right text-sm font-semibold tabular-nums rounded cursor-pointer transition-colors ${
        isChanged
          ? "bg-blue-100 text-blue-700"
          : value > 10
            ? "bg-amber-50 text-amber-800"
            : "text-gray-900 hover:bg-gray-100"
      }`}
      title="Click to edit quantity"
    >
      {value}
    </button>
  );
};

// ── Editable Actual Quantity Cell ────────────────────────────────────

const EditableActualQtyCell: React.FC<{
  item: BOQItem;
}> = ({ item }) => {
  const { updateBOQItemActuals } = useSiteContext();
  const [editing, setEditing] = useState(false);
  const actualVal = item.actualQuantity ?? item.quantity;
  const [draft, setDraft] = useState(String(actualVal));
  const inputRef = useRef<HTMLInputElement>(null);
  const differs =
    item.actualQuantity != null && item.actualQuantity !== item.quantity;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(String(item.actualQuantity ?? item.quantity));
  }, [item.actualQuantity, item.quantity, editing]);

  const commit = useCallback(() => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) {
      updateBOQItemActuals(item.id, num, item.actualComment ?? null);
    }
    setEditing(false);
  }, [draft, item.id, item.actualComment, updateBOQItemActuals]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(actualVal));
            setEditing(false);
          }
        }}
        className="w-16 h-7 px-1.5 text-right text-sm font-semibold tabular-nums border border-orange-400 rounded bg-white outline-none ring-2 ring-orange-200"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-16 h-7 px-1.5 text-right text-sm font-semibold tabular-nums rounded cursor-pointer transition-colors ${
        differs
          ? "bg-orange-100 text-orange-700"
          : "text-gray-900 hover:bg-gray-100"
      }`}
      title="Click to edit actual quantity"
    >
      {actualVal}
    </button>
  );
};

// ── Actual Comment Cell ──────────────────────────────────────────────

const ActualCommentCell: React.FC<{ item: BOQItem }> = ({ item }) => {
  const { updateBOQItemActuals } = useSiteContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.actualComment ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(item.actualComment ?? "");
  }, [item.actualComment, editing]);

  const commit = useCallback(() => {
    const val = draft.trim() || null;
    if (val !== (item.actualComment ?? null)) {
      updateBOQItemActuals(item.id, item.actualQuantity ?? null, val);
    }
    setEditing(false);
  }, [
    draft,
    item.id,
    item.actualQuantity,
    item.actualComment,
    updateBOQItemActuals,
  ]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(item.actualComment ?? "");
            setEditing(false);
          }
        }}
        placeholder="Comment..."
        className="w-full h-7 px-1.5 text-xs border border-orange-400 rounded bg-white outline-none ring-2 ring-orange-200"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full h-7 px-1.5 text-left text-xs text-gray-500 rounded cursor-pointer hover:bg-gray-100 truncate"
      title={item.actualComment || "Click to add comment"}
    >
      {item.actualComment || "—"}
    </button>
  );
};

// ── Spreadsheet View ────────────────────────────────────────────────

export const BOQSpreadsheetView: React.FC<BOQSpreadsheetViewProps> = ({
  items,
  recentChanges,
  showActuals = false,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width for responsive columns
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showCategory = containerWidth >= 500;
  const showVendor = containerWidth >= 650;

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const sorted = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, sortField, sortDir]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 text-gray-300 ml-1 inline" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-blue-600 ml-1 inline" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-600 ml-1 inline" />
    );
  };

  const SortableHead: React.FC<{
    field: SortField;
    label: string;
    className?: string;
  }> = ({ field, label, className }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-gray-100 transition-colors ${className || ""}`}
      onClick={() => toggleSort(field)}
    >
      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
        {label}
        <SortIcon field={field} />
      </span>
    </TableHead>
  );

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center text-gray-400">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No BOQ items match</p>
        </div>
      </div>
    );
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-[2] bg-gray-50">
          <TableRow className="border-b-2 border-gray-300 hover:bg-gray-50">
            <TableHead className="w-[40px] text-center">
              <span className="text-[11px] font-semibold text-gray-500">#</span>
            </TableHead>
            <SortableHead
              field="productCode"
              label="Code"
              className="w-[110px]"
            />
            <SortableHead field="description" label="Description" />
            <SortableHead
              field="quantity"
              label={showActuals ? "Plan Qty" : "Qty"}
              className="w-[80px] text-right"
            />
            {showActuals && (
              <TableHead className="w-[80px] text-right">
                <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wide">
                  Act Qty
                </span>
              </TableHead>
            )}
            {showActuals && (
              <TableHead className="w-[120px]">
                <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wide">
                  Comment
                </span>
              </TableHead>
            )}
            {showCategory && (
              <SortableHead
                field="productCategory"
                label="Category"
                className="w-[120px]"
              />
            )}
            {showVendor && (
              <SortableHead
                field="vendor"
                label="Vendor"
                className="w-[100px]"
              />
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item, i) => {
            const isChanged = recentChanges.has(item.id);
            const catColor = getCategoryColor(item.productCategory);
            return (
              <TableRow
                key={item.id}
                className={`h-[40px] transition-colors duration-200 border-l-[3px] ${catColor.border} ${
                  isChanged
                    ? "bg-blue-50"
                    : item.isNew
                      ? "bg-green-50"
                      : i % 2 === 0
                        ? "bg-white"
                        : catColor.row
                }`}
              >
                <TableCell className="text-center text-xs text-gray-400 font-medium">
                  {i + 1}
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-gray-700 tracking-wide">
                  {item.productCode}
                </TableCell>
                <TableCell
                  className="text-xs text-gray-700 truncate max-w-[200px]"
                  title={item.description}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{item.description}</span>
                    {item.isManualOverride && (
                      <Pencil className="h-3 w-3 text-amber-500 shrink-0" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <EditableQuantityCell
                    itemId={item.id}
                    value={item.quantity}
                    isChanged={isChanged}
                  />
                </TableCell>
                {showActuals && (
                  <TableCell className="text-right">
                    <EditableActualQtyCell item={item} />
                  </TableCell>
                )}
                {showActuals && (
                  <TableCell className="max-w-[120px]">
                    <ActualCommentCell item={item} />
                  </TableCell>
                )}
                {showCategory && (
                  <TableCell
                    className="max-w-[120px]"
                    title={item.productCategory}
                  >
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor.bg} ${catColor.text}`}
                    >
                      {item.productCategory}
                    </span>
                  </TableCell>
                )}
                {showVendor && (
                  <TableCell
                    className="text-xs text-gray-400 truncate max-w-[100px]"
                    title={item.vendor || ""}
                  >
                    {item.vendor || ""}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
