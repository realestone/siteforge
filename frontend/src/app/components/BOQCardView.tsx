import React, { useState, useMemo } from "react";
import { ChevronRight, Package } from "lucide-react";
import { Badge } from "./ui/badge";
import type { BOQItem } from "../types/site";

// ── Category Colors ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; accent: string; badge: string }
> = {
  "System module": {
    bg: "bg-violet-50",
    text: "text-violet-700",
    accent: "border-l-violet-400",
    badge: "bg-violet-100 text-violet-700",
  },
  "Service items": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    accent: "border-l-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

const DEFAULT_COLOR = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  accent: "border-l-gray-400",
  badge: "bg-gray-100 text-gray-600",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

interface BOQCardViewProps {
  items: BOQItem[];
  recentChanges: Set<string>;
}

export const BOQCardView: React.FC<BOQCardViewProps> = ({
  items,
  recentChanges,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, BOQItem[]>();
    for (const item of items) {
      const key = item.productCategory || "Uncategorized";
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16">
        <Package className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No BOQ items match</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {Array.from(grouped.entries()).map(([category, catItems]) => {
        const isCollapsed = collapsedCategories.has(category);
        const catColor = getCategoryColor(category);
        return (
          <div
            key={category}
            className={`rounded-lg border overflow-hidden border-l-[3px] ${catColor.accent}`}
          >
            <button
              onClick={() => toggleCategory(category)}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${catColor.bg} hover:opacity-80`}
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`h-3.5 w-3.5 ${catColor.text} transition-transform ${
                    !isCollapsed ? "rotate-90" : ""
                  }`}
                />
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${catColor.text}`}
                >
                  {category}
                </span>
              </div>
              <Badge
                className={`text-[10px] px-1.5 py-0 border-0 ${catColor.badge}`}
              >
                {catItems.length}
              </Badge>
            </button>

            {!isCollapsed && (
              <div className="border-t divide-y divide-gray-100">
                {catItems.map((item) => {
                  const isChanged = recentChanges.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`px-3 py-2 flex items-center justify-between text-sm transition-colors ${
                        isChanged
                          ? "bg-blue-50"
                          : item.isNew
                            ? "bg-green-50"
                            : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 truncate text-xs font-medium">
                            {item.description}
                          </span>
                          {item.isManualOverride && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 text-amber-600 border-amber-300"
                            >
                              Manual
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400 font-mono">
                            {item.productCode}
                          </span>
                          {item.vendor && (
                            <span className="text-[10px] text-gray-300">
                              {item.vendor}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            item.quantity > 10
                              ? "text-blue-600"
                              : "text-gray-700"
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
