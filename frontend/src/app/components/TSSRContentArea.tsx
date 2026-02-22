import React from "react";
import {
  FileSpreadsheet,
  LayoutDashboard,
  Zap,
  ClipboardList,
  FileWarning,
  CheckCircle2,
  AlertCircle,
  Circle,
} from "lucide-react";
import { useSiteContext } from "../context/SiteContext";
import {
  SectionId,
  getSectionConfig,
  computeSectionCompletion,
} from "../lib/tssr-nav-config";

// Section components
import { RadioPlanSection } from "./sections/RadioPlanSection";
import { PowerCalcSection } from "./sections/PowerCalcSection";
import { SiteOverviewSection } from "./sections/SiteOverviewSection";
import { PlannedWorksSection } from "./sections/PlannedWorksSection";
import { DeviationReportSection } from "./sections/DeviationReportSection";

// Map icon names to components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FileSpreadsheet,
  LayoutDashboard,
  Zap,
  ClipboardList,
  FileWarning,
};

// Map section IDs to their form components
const SECTION_COMPONENTS: Record<SectionId, React.FC> = {
  "radio-plan": RadioPlanSection,
  "power-calculator": PowerCalcSection,
  "planned-works": PlannedWorksSection,
  overview: SiteOverviewSection,
  "as-built-deviations": DeviationReportSection,
};

interface TSSRContentAreaProps {
  activeSection: SectionId;
}

export const TSSRContentArea: React.FC<TSSRContentAreaProps> = ({
  activeSection,
}) => {
  const { tssrData } = useSiteContext();
  const config = getSectionConfig(activeSection);
  const completion = computeSectionCompletion(activeSection, tssrData);
  const SectionComponent = SECTION_COMPONENTS[activeSection];
  const IconComponent = config ? ICON_MAP[config.iconName] : null;

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-white">
      {/* Section header */}
      {config && (
        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
          {IconComponent && (
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}
            >
              <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              {config.label.replace(" (Combined)", "")}
            </h2>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
          {/* Completion badge */}
          {completion.status === "complete" && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700">
                Complete
              </span>
            </div>
          )}
          {completion.status === "partial" && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-semibold text-orange-600">
                {completion.percent}%
              </span>
            </div>
          )}
          {completion.status === "empty" && (
            <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
              <Circle className="h-4 w-4 text-gray-300" />
              <span className="text-xs font-semibold text-gray-400">Empty</span>
            </div>
          )}
        </div>
      )}

      {/* Section content — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <SectionComponent />
      </div>
    </div>
  );
};
