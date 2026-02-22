import React, { useState, useCallback } from "react";
import {
  Bot,
  Clipboard,
  Hand,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  AlertTriangle,
  Info,
  Trash2,
} from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";
import { generatePlannedWorks } from "../../lib/planned-works-generator";
import type {
  PlannedWorksState,
  PlannedWorksSection as PWSection,
  WorkItem,
  ManualField,
} from "../../types/planned-works";
import { toast } from "sonner";

// ── Source icon component ───────────────────────────────────────

const SourceIcon: React.FC<{ source: WorkItem["source"]; className?: string }> =
  ({ source, className = "h-4 w-4" }) => {
    switch (source) {
      case "generated":
        return <Bot className={`${className} text-blue-500`} />;
      case "template":
        return <Clipboard className={`${className} text-gray-500`} />;
      case "manual":
        return <Hand className={`${className} text-amber-500`} />;
    }
  };

// ── Manual field input ──────────────────────────────────────────

const ManualFieldInput: React.FC<{
  field: ManualField;
  onChange: (value: string) => void;
}> = ({ field, onChange }) => (
  <div className="mt-2 flex items-center gap-2">
    <label className="text-xs font-medium text-gray-500 min-w-[120px]">
      {field.label}:
    </label>
    {field.type === "select" ? (
      <select
        value={field.value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="">{field.placeholder}</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={field.type}
        value={field.value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 rounded border px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
          !field.value ? "border-orange-300 bg-orange-50" : "border-gray-300"
        }`}
      />
    )}
  </div>
);

// ── Work item row ───────────────────────────────────────────────

const WorkItemRow: React.FC<{
  item: WorkItem;
  onToggleLock: () => void;
  onTextChange: (text: string) => void;
  onFieldChange: (fieldId: string, value: string) => void;
  onRemove: () => void;
}> = ({ item, onToggleLock, onTextChange, onFieldChange, onRemove }) => {
  const [showDerivation, setShowDerivation] = useState(false);

  return (
    <div
      className={`group relative flex gap-2 rounded-md border px-3 py-2 transition-colors ${
        item.overridden
          ? "border-l-2 border-l-amber-400 border-t-gray-100 border-r-gray-100 border-b-gray-100 bg-amber-50/50"
          : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
      }`}
    >
      {/* Source icon */}
      <div className="mt-0.5 flex-shrink-0">
        <SourceIcon source={item.source} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {item.warning && (
          <div className="mb-1 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>{item.warning}</span>
          </div>
        )}

        {item.locked ? (
          <p className="text-sm text-gray-800 leading-relaxed">{item.text}</p>
        ) : item.source === "manual" && !item.text && item.manualFields ? (
          // Manual field only — no text area, just fields
          <div />
        ) : (
          <textarea
            value={item.text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={Math.max(1, Math.ceil(item.text.length / 80))}
            placeholder="Enter text..."
            className="w-full resize-none rounded border-0 bg-transparent p-0 text-sm text-gray-800 leading-relaxed focus:outline-none focus:ring-0"
          />
        )}

        {/* Manual fields */}
        {item.manualFields?.map((field) => (
          <ManualFieldInput
            key={field.id}
            field={field}
            onChange={(val) => onFieldChange(field.id, val)}
          />
        ))}

        {/* Derivation */}
        {item.derivation && (
          <button
            onClick={() => setShowDerivation(!showDerivation)}
            className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <Info className="h-3 w-3" />
            <span>{showDerivation ? "Hide" : "Source"}</span>
          </button>
        )}
        {showDerivation && item.derivation && (
          <p className="mt-1 rounded bg-gray-50 px-2 py-1 text-xs text-gray-500 font-mono">
            {item.derivation}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {item.source !== "manual" && (
          <button
            onClick={onToggleLock}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={item.locked ? "Unlock to edit" : "Lock"}
          >
            {item.locked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Section block ───────────────────────────────────────────────

const SectionBlock: React.FC<{
  section: PWSection;
  onUpdate: (updated: PWSection) => void;
}> = ({ section: sec, onUpdate }) => {
  const filledCount = sec.items.filter(
    (i) =>
      i.text.trim() !== "" ||
      i.manualFields?.some((f) => f.value.trim() !== ""),
  ).length;
  const totalCount = sec.items.length;

  const typeIcon =
    sec.type === "auto"
      ? "auto"
      : sec.type === "template"
        ? "template"
        : sec.type === "manual"
          ? "manual"
          : "hybrid";

  const toggleCollapse = () => onUpdate({ ...sec, collapsed: !sec.collapsed });

  const updateItem = (index: number, updated: WorkItem) => {
    const items = [...sec.items];
    items[index] = updated;
    onUpdate({ ...sec, items });
  };

  const removeItem = (index: number) => {
    const items = sec.items.filter((_, i) => i !== index);
    onUpdate({ ...sec, items });
  };

  const addManualItem = () => {
    const newItem: WorkItem = {
      id: `manual-${Date.now()}`,
      text: "",
      source: "manual",
      locked: false,
      overridden: false,
      order: sec.items.length,
    };
    onUpdate({ ...sec, items: [...sec.items, newItem] });
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Section header */}
      <button
        onClick={toggleCollapse}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
      >
        {sec.collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
        <span className="flex-1 text-sm font-semibold text-gray-800">
          {sec.title}
        </span>
        <span className="text-xs text-gray-400">
          {typeIcon === "auto" && <Bot className="inline h-3 w-3 mr-1" />}
          {typeIcon === "template" && (
            <Clipboard className="inline h-3 w-3 mr-1" />
          )}
          {typeIcon === "manual" && <Hand className="inline h-3 w-3 mr-1" />}
          {typeIcon === "hybrid" && (
            <>
              <Bot className="inline h-3 w-3 mr-0.5" />
              <Hand className="inline h-3 w-3 mr-1" />
            </>
          )}
          {filledCount}/{totalCount}
        </span>
      </button>

      {/* Section items */}
      {!sec.collapsed && (
        <div className="space-y-1 px-4 pb-3">
          {sec.items.map((item, i) => (
            <WorkItemRow
              key={item.id}
              item={item}
              onToggleLock={() => {
                const updated = { ...item, locked: !item.locked };
                if (!updated.locked && !item.overridden) {
                  updated.originalText = item.text;
                }
                updateItem(i, updated);
              }}
              onTextChange={(text) => {
                const updated = {
                  ...item,
                  text,
                  overridden: item.source !== "manual" && text !== item.originalText,
                };
                updateItem(i, updated);
              }}
              onFieldChange={(fieldId, value) => {
                const updated = {
                  ...item,
                  manualFields: item.manualFields?.map((f) =>
                    f.id === fieldId ? { ...f, value } : f,
                  ),
                };
                updateItem(i, updated);
              }}
              onRemove={() => removeItem(i)}
            />
          ))}

          <button
            onClick={addManualItem}
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            <Plus className="h-3 w-3" />
            Add bullet
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────

export const PlannedWorksSection: React.FC = () => {
  const {
    parsedRadioPlan,
    parsedPowerCalc,
    plannedWorks,
    setPlannedWorks,
  } = useSiteContext();

  const hasData = parsedRadioPlan !== null || parsedPowerCalc !== null;

  const handleGenerate = useCallback(() => {
    const state = generatePlannedWorks(
      parsedRadioPlan,
      parsedPowerCalc,
      plannedWorks,
    );
    setPlannedWorks(state);
    const totalItems = state.sections.reduce(
      (s, sec) => s + sec.items.length,
      0,
    );
    toast.success("Planned works generated", {
      description: `${state.sections.length} sections, ${totalItems} items`,
    });
  }, [parsedRadioPlan, parsedPowerCalc, plannedWorks, setPlannedWorks]);

  const updateSection = useCallback(
    (sectionId: string, updated: PWSection) => {
      if (!plannedWorks) return;
      setPlannedWorks({
        ...plannedWorks,
        sections: plannedWorks.sections.map((s) =>
          s.id === sectionId ? updated : s,
        ),
      });
    },
    [plannedWorks, setPlannedWorks],
  );

  // Completion stats
  const stats = plannedWorks
    ? (() => {
        const allItems = plannedWorks.sections.flatMap((s) => s.items);
        const total = allItems.length;
        const filled = allItems.filter(
          (i) =>
            i.text.trim() !== "" ||
            i.manualFields?.some((f) => f.value.trim() !== ""),
        ).length;
        const auto = allItems.filter((i) => i.source === "generated").length;
        const manual = allItems.filter((i) => i.source === "manual").length;
        const template = allItems.filter(
          (i) => i.source === "template",
        ).length;
        const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
        return { total, filled, auto, manual, template, pct };
      })()
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Status bar */}
      {!hasData && !plannedWorks && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <Clipboard className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            Upload a Radio Plan and Effektkalkulator to generate planned works
          </p>
          <p className="mt-1 text-xs text-gray-400">
            The planned works section will auto-populate TSSR 1.1 from your
            uploaded data
          </p>
        </div>
      )}

      {/* Generate / Regenerate button */}
      {hasData && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {parsedRadioPlan && (
              <span className="mr-3">
                Radio Plan: {parsedRadioPlan.siteId} ({parsedRadioPlan.sectors.length} sectors)
              </span>
            )}
            {parsedPowerCalc && (
              <span>
                Effektkalkulator: {parsedPowerCalc.cabinetType} cabinet
              </span>
            )}
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {plannedWorks ? "Regenerate" : "Generate"}
          </button>
        </div>
      )}

      {/* Generated content */}
      {plannedWorks && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {plannedWorks.sections.map((sec) => (
            <SectionBlock
              key={sec.id}
              section={sec}
              onUpdate={(updated) => updateSection(sec.id, updated)}
            />
          ))}
        </div>
      )}

      {/* Summary footer */}
      {stats && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>
              {stats.total} items total &middot; {stats.auto} auto-generated
              &middot; {stats.manual} manual &middot; {stats.template} template
            </span>
            <span className="font-semibold text-gray-700">
              {stats.pct}% complete
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
