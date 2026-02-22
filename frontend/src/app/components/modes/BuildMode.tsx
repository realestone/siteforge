import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Package,
  ClipboardList,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";
import type { BuildTask } from "../../api/client";
import type { BOQItem } from "../../types/site";
import { toast } from "sonner";

type SubView = "tasks" | "materials";

export const BuildMode: React.FC = () => {
  const {
    buildTasks,
    persistBuildTasks,
    plannedWorks,
    boqItems,
    projectId,
    buildProgress,
    updateBOQItemActuals,
  } = useSiteContext();

  const [subView, setSubView] = useState<SubView>("tasks");
  const [generating, setGenerating] = useState(false);

  // Auto-generate tasks if empty and we have planned works data
  const generateTasks = useCallback(() => {
    if (!plannedWorks?.sections) return;
    setGenerating(true);

    const tasks: BuildTask[] = [];

    // From planned works
    for (const section of plannedWorks.sections) {
      for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        const text =
          item.text?.trim() ||
          (item.manualFields || [])
            .filter((f: { value?: string }) => f.value && f.value.trim())
            .map(
              (f: { label?: string; value?: string }) =>
                `${f.label || ""}: ${f.value || ""}`,
            )
            .join("; ");
        if (!text) continue;
        tasks.push({
          id: `pw-${section.id}-${i}`,
          source: "planned_works",
          section: section.title,
          text,
          completed: false,
          completedAt: null,
          note: "",
        });
      }
    }

    // From BOQ items with quantity > 0
    for (const item of boqItems) {
      if (item.quantity <= 0) continue;
      tasks.push({
        id: `boq-${item.productCode || item.id}`,
        source: "boq",
        section: item.productCategory || "Materials",
        text: `${item.description || item.productCode} (${item.quantity}x)`,
        completed: false,
        completedAt: null,
        note: "",
      });
    }

    persistBuildTasks(tasks);
    setGenerating(false);
    toast.success(`Generated ${tasks.length} build tasks`);
  }, [plannedWorks, boqItems, persistBuildTasks]);

  // Prompt generation if tasks are empty
  useEffect(() => {
    if (
      buildTasks.length === 0 &&
      plannedWorks?.sections &&
      plannedWorks.sections.length > 0 &&
      projectId
    ) {
      generateTasks();
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group tasks by section
  const pwTasks = useMemo(
    () => buildTasks.filter((t) => t.source === "planned_works"),
    [buildTasks],
  );
  const boqTasks = useMemo(
    () => buildTasks.filter((t) => t.source === "boq"),
    [buildTasks],
  );

  const tasksBySection = useMemo(() => {
    const items = subView === "tasks" ? pwTasks : boqTasks;
    const map = new Map<string, BuildTask[]>();
    for (const t of items) {
      const existing = map.get(t.section) || [];
      existing.push(t);
      map.set(t.section, existing);
    }
    return map;
  }, [subView, pwTasks, boqTasks]);

  // BOQ deviations: items where actual differs from planned
  const boqDeviations = useMemo(
    () =>
      boqItems.filter(
        (item) =>
          item.actualQuantity != null && item.actualQuantity !== item.quantity,
      ),
    [boqItems],
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      const updated = buildTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
            }
          : t,
      );
      persistBuildTasks(updated);
    },
    [buildTasks, persistBuildTasks],
  );

  const updateNote = useCallback(
    (taskId: string, note: string) => {
      const updated = buildTasks.map((t) =>
        t.id === taskId ? { ...t, note } : t,
      );
      persistBuildTasks(updated);
    },
    [buildTasks, persistBuildTasks],
  );

  if (generating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">
          Generating build tasks...
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sub-view tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white">
        <button
          onClick={() => setSubView("tasks")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            subView === "tasks"
              ? "bg-indigo-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Installation Tasks
          <span
            className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
              subView === "tasks"
                ? "bg-indigo-500 text-indigo-100"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {pwTasks.filter((t) => t.completed).length}/{pwTasks.length}
          </span>
        </button>
        <button
          onClick={() => setSubView("materials")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            subView === "materials"
              ? "bg-indigo-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          Material Pick List
          <span
            className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
              subView === "materials"
                ? "bg-indigo-500 text-indigo-100"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {boqTasks.filter((t) => t.completed).length}/{boqTasks.length}
          </span>
        </button>

        <div className="flex-1" />

        {/* Overall progress */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {buildProgress.completed}/{buildProgress.total} done
          </span>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: `${buildProgress.total > 0 ? (buildProgress.completed / buildProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Deviation summary banner */}
      {subView === "materials" && boqDeviations.length > 0 && (
        <div className="border-b border-orange-200 bg-orange-50 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-medium text-orange-700">
            {boqDeviations.length} item{boqDeviations.length !== 1 ? "s" : ""}{" "}
            differ from planned
          </span>
        </div>
      )}

      {/* Task list / Material list */}
      <div className="flex-1 overflow-y-auto">
        {subView === "materials" ? (
          /* Material Pick List with actual quantities */
          boqItems.filter((i) => i.quantity > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No BOQ items</p>
              <p className="text-xs mt-1">Add items via the BOQ panel</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {boqItems
                .filter((i) => i.quantity > 0)
                .map((item) => (
                  <MaterialRow
                    key={item.id}
                    item={item}
                    onUpdateActuals={updateBOQItemActuals}
                  />
                ))}
            </div>
          )
        ) : tasksBySection.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ClipboardList className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs mt-1">
              Tasks are auto-generated from planned works and BOQ
            </p>
            {plannedWorks?.sections && plannedWorks.sections.length > 0 && (
              <button
                onClick={generateTasks}
                className="mt-4 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Generate Tasks
              </button>
            )}
          </div>
        ) : (
          Array.from(tasksBySection.entries()).map(([section, tasks]) => (
            <TaskSection
              key={section}
              title={section}
              tasks={tasks}
              onToggle={toggleTask}
              onUpdateNote={updateNote}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ── TaskSection ─────────────────────────────────────────────────────

const TaskSection: React.FC<{
  title: string;
  tasks: BuildTask[];
  onToggle: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}> = ({ title, tasks, onToggle, onUpdateNote }) => {
  const [collapsed, setCollapsed] = useState(false);
  const done = tasks.filter((t) => t.completed).length;

  return (
    <div className="border-b border-gray-100">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span className="text-xs font-semibold text-gray-700 flex-1 text-left">
          {title}
        </span>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            done === tasks.length && tasks.length > 0
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {done}/{tasks.length}
        </span>
      </button>

      {/* Tasks */}
      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onUpdateNote={onUpdateNote}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── TaskRow ─────────────────────────────────────────────────────────

const TaskRow: React.FC<{
  task: BuildTask;
  onToggle: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}> = ({ task, onToggle, onUpdateNote }) => {
  const [showNote, setShowNote] = useState(!!task.note);
  const [noteText, setNoteText] = useState(task.note);

  return (
    <div className="group px-4 py-2 hover:bg-gray-50">
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className="mt-0.5 flex-shrink-0"
        >
          {task.completed ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
          ) : (
            <Circle className="h-4.5 w-4.5 text-gray-300 hover:text-gray-400" />
          )}
        </button>

        {/* Text */}
        <span
          className={`text-sm flex-1 ${
            task.completed ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          {task.text}
        </span>

        {/* Note toggle */}
        <button
          onClick={() => setShowNote(!showNote)}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity ${
            task.note ? "opacity-100 text-amber-500" : "text-gray-400"
          }`}
          title="Add note"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Note field */}
      {showNote && (
        <div className="ml-7 mt-1.5">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              if (noteText !== task.note) {
                onUpdateNote(task.id, noteText);
              }
            }}
            placeholder="Add deviation note..."
            rows={2}
            className="w-full text-xs text-gray-600 border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
          />
        </div>
      )}
    </div>
  );
};

// ── MaterialRow ─────────────────────────────────────────────────────

const MaterialRow: React.FC<{
  item: BOQItem;
  onUpdateActuals: (
    id: string,
    actualQuantity: number | null,
    actualComment: string | null,
  ) => void;
}> = ({ item, onUpdateActuals }) => {
  const actualVal = item.actualQuantity ?? item.quantity;
  const [qtyDraft, setQtyDraft] = useState(String(actualVal));
  const [commentDraft, setCommentDraft] = useState(item.actualComment ?? "");
  const differs =
    item.actualQuantity != null && item.actualQuantity !== item.quantity;

  // Sync drafts when item changes externally
  useEffect(() => {
    setQtyDraft(String(item.actualQuantity ?? item.quantity));
  }, [item.actualQuantity, item.quantity]);

  useEffect(() => {
    setCommentDraft(item.actualComment ?? "");
  }, [item.actualComment]);

  const commitQty = useCallback(() => {
    const num = parseFloat(qtyDraft);
    if (!isNaN(num) && num >= 0) {
      onUpdateActuals(item.id, num, item.actualComment ?? null);
    }
  }, [qtyDraft, item.id, item.actualComment, onUpdateActuals]);

  const commitComment = useCallback(() => {
    const val = commentDraft.trim() || null;
    if (val !== (item.actualComment ?? null)) {
      onUpdateActuals(item.id, item.actualQuantity ?? null, val);
    }
  }, [
    commentDraft,
    item.id,
    item.actualQuantity,
    item.actualComment,
    onUpdateActuals,
  ]);

  return (
    <div className={`px-4 py-2.5 ${differs ? "bg-orange-50/50" : ""}`}>
      {/* Top row: product info */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[11px] font-semibold text-gray-500 w-[90px] shrink-0 truncate">
          {item.productCode}
        </span>
        <span
          className="text-xs text-gray-700 flex-1 truncate"
          title={item.description}
        >
          {item.description}
        </span>
        {differs && (
          <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded shrink-0">
            DIFFERS
          </span>
        )}
      </div>

      {/* Bottom row: quantities + comment */}
      <div className="flex items-center gap-3 ml-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 uppercase">Planned</span>
          <span className="text-xs font-semibold text-gray-600 tabular-nums w-10 text-right">
            {item.quantity}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-orange-500 uppercase">Actual</span>
          <input
            type="number"
            min="0"
            step="1"
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            onBlur={commitQty}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitQty();
            }}
            className={`w-14 h-6 px-1.5 text-right text-xs font-semibold tabular-nums border rounded focus:outline-none focus:ring-1 focus:ring-orange-400 ${
              differs
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-gray-200 text-gray-700"
            }`}
          />
        </div>
        <input
          type="text"
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          onBlur={commitComment}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitComment();
          }}
          placeholder="Comment..."
          className="flex-1 h-6 px-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400 text-gray-600"
        />
      </div>
    </div>
  );
};
