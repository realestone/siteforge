import React, { useMemo } from "react";
import { AlertTriangle, Package, ClipboardList } from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";

export const DeviationReportSection: React.FC = () => {
  const { boqItems, buildTasks, tssrData, updateTSSRField } = useSiteContext();

  // BOQ deviations: items where actual differs from planned
  const boqDeviations = useMemo(
    () =>
      boqItems.filter(
        (item) =>
          item.actualQuantity != null && item.actualQuantity !== item.quantity,
      ),
    [boqItems],
  );

  // Build task notes: tasks with non-empty notes
  const taskNotes = useMemo(
    () => buildTasks.filter((t) => t.note && t.note.trim()),
    [buildTasks],
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* BOQ Deviations */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            BOQ Deviations
          </h3>
          {boqDeviations.length > 0 && (
            <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
              {boqDeviations.length}
            </span>
          )}
        </div>
        {boqDeviations.length === 0 ? (
          <p className="text-xs text-gray-400 italic ml-6">
            No deviations — all actual quantities match planned.
          </p>
        ) : (
          <div className="space-y-1.5 ml-6">
            {boqDeviations.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs"
              >
                <span className="font-mono font-semibold text-gray-600 w-[90px] shrink-0">
                  {item.productCode}
                </span>
                <span className="text-gray-700 flex-1 truncate">
                  {item.description}
                </span>
                <span className="text-gray-500 shrink-0">
                  Planned:{" "}
                  <span className="font-semibold">{item.quantity}</span>
                </span>
                <span className="text-orange-700 shrink-0">
                  Actual:{" "}
                  <span className="font-semibold">{item.actualQuantity}</span>
                </span>
                {item.actualComment && (
                  <span className="text-gray-500 italic truncate max-w-[150px]" title={item.actualComment}>
                    — {item.actualComment}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Build Task Notes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Build Task Notes
          </h3>
          {taskNotes.length > 0 && (
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
              {taskNotes.length}
            </span>
          )}
        </div>
        {taskNotes.length === 0 ? (
          <p className="text-xs text-gray-400 italic ml-6">
            No task notes recorded.
          </p>
        ) : (
          <div className="space-y-1.5 ml-6">
            {taskNotes.map((task) => (
              <div
                key={task.id}
                className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-700">
                    {task.section}
                  </span>
                  <span className="text-gray-400">›</span>
                  <span className="text-gray-600 truncate">{task.text}</span>
                </div>
                <p className="text-gray-700 italic ml-0">{task.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Free Text */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Additional Deviation Notes
          </h3>
        </div>
        <textarea
          value={(tssrData as Record<string, unknown>).deviationsFreeText as string ?? ""}
          onChange={(e) =>
            updateTSSRField("deviationsFreeText", e.target.value)
          }
          placeholder="Enter any additional deviation notes or comments about the as-built state..."
          rows={6}
          className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-y"
        />
      </section>
    </div>
  );
};
