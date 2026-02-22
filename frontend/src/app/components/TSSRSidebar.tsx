import React, { useState, useMemo } from "react";
import { ScrollArea } from "./ui/scroll-area";
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  LayoutDashboard,
  ShieldCheck,
  Warehouse,
  Radio,
  Zap,
  Cable,
  ClipboardList,
  FileSpreadsheet,
  FileWarning,
} from "lucide-react";
import { useSiteContext } from "../context/SiteContext";
import { useWorkflowContext } from "../context/WorkflowContext";
import {
  NAV_TREE,
  SectionId,
  computeSectionCompletion,
  type CompletionStatus,
} from "../lib/tssr-nav-config";

// Map icon names from config to actual lucide components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  ShieldCheck,
  Warehouse,
  Radio,
  Zap,
  Cable,
  ClipboardList,
  FileSpreadsheet,
  FileWarning,
};

interface TSSRSidebarProps {
  activeSection: SectionId;
  onSectionChange: (id: SectionId) => void;
}

function StatusIcon({
  status,
  isActive,
}: {
  status: CompletionStatus;
  isActive: boolean;
}) {
  const activeOpacity = "opacity-90";
  switch (status) {
    case "complete":
      return (
        <CheckCircle2
          className={`h-4 w-4 flex-shrink-0 ${
            isActive ? `text-white ${activeOpacity}` : "text-green-600"
          }`}
        />
      );
    case "partial":
      return (
        <AlertCircle
          className={`h-4 w-4 flex-shrink-0 ${
            isActive ? `text-white ${activeOpacity}` : "text-orange-500"
          }`}
        />
      );
    case "empty":
      return (
        <Circle
          className={`h-4 w-4 flex-shrink-0 ${
            isActive ? "text-white opacity-60" : "text-gray-300"
          }`}
        />
      );
  }
}

export const TSSRSidebar: React.FC<TSSRSidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { tssrData } = useSiteContext();
  const { isAtLeastStatus } = useWorkflowContext();

  // Filter nav tree: hide as-built group unless status >= building
  const visibleNavTree = useMemo(
    () =>
      NAV_TREE.filter(
        (group) => group.id !== "as-built" || isAtLeastStatus("building"),
      ),
    [isAtLeastStatus],
  );

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(NAV_TREE.map((g) => g.id)),
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <div className="flex h-full w-[288px] flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      {/* Dark header */}
      <div className="sticky top-0 z-5 flex h-12 items-center border-b border-white/5 bg-gradient-to-b from-gray-700 to-gray-800 px-4">
        <span className="text-sm font-semibold tracking-wide text-white">
          TSSR Sections
        </span>
      </div>

      {/* Navigation tree */}
      <ScrollArea className="flex-1">
        <div className="py-0">
          {visibleNavTree.map((group) => {
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-100"
                >
                  <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                  <span className="flex-1 text-[13px] font-semibold text-gray-900 truncate">
                    {group.label}
                  </span>
                </button>

                {/* Subsection items */}
                {isExpanded &&
                  group.sections.map((section) => {
                    const isActive = activeSection === section.id;
                    const completion = computeSectionCompletion(
                      section.id,
                      tssrData,
                    );
                    const IconComponent = ICON_MAP[section.iconName];

                    return (
                      <button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        className={`flex w-full items-center gap-2 border-l-[3px] py-2 pl-11 pr-3 text-left transition-all duration-150 ${
                          isActive
                            ? "border-l-blue-700 bg-blue-600 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                            : "border-l-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <StatusIcon
                          status={completion.status}
                          isActive={isActive}
                        />
                        <span className="flex-1 truncate text-sm">
                          {section.label}
                        </span>
                        {completion.status === "partial" && (
                          <span
                            className={`inline-flex min-w-[32px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-orange-500/10 text-orange-500"
                            }`}
                          >
                            {completion.percent}%
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
