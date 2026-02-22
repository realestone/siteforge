import React, { useState } from "react";
import { FileText, Camera, Eye, Hammer } from "lucide-react";
import { TSSRSidebar } from "./TSSRSidebar";
import { TSSRContentArea } from "./TSSRContentArea";
import { PhotosMode } from "./modes/PhotosMode";
import { BuildMode } from "./modes/BuildMode";
import { PreviewModal } from "./modes/PreviewMode";

import { useWorkflowContext } from "../context/WorkflowContext";
import { SectionId } from "../lib/tssr-nav-config";

type PanelMode = "form" | "photos" | "build";

export const LeftPanel: React.FC = () => {
  const [mode, setMode] = useState<PanelMode>("form");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("radio-plan");
  const { isAtLeastStatus } = useWorkflowContext();

  const tabs: {
    id: PanelMode | "preview";
    icon: React.ReactNode;
    label: string;
    hidden?: boolean;
  }[] = [
    { id: "form", icon: <FileText className="h-4 w-4" />, label: "FORM" },
    { id: "photos", icon: <Camera className="h-4 w-4" />, label: "PHOTOS" },
    {
      id: "build",
      icon: <Hammer className="h-4 w-4" />,
      label: "BUILD",
      hidden: !isAtLeastStatus("approved"),
    },
    { id: "preview", icon: <Eye className="h-4 w-4" />, label: "PREVIEW" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Module Navigation */}
      <div className="flex justify-center border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex gap-1">
          {tabs
            .filter((t) => !t.hidden)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "preview") {
                    setPreviewOpen(true);
                  } else {
                    setMode(tab.id);
                  }
                }}
                className={`flex h-10 min-w-[100px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  tab.id !== "preview" && mode === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      {/* Mode Content */}
      {mode === "form" && (
        <div className="flex flex-1 min-h-0">
          <TSSRSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <TSSRContentArea activeSection={activeSection} />
        </div>
      )}

      {mode === "photos" && <PhotosMode />}

      {mode === "build" && <BuildMode />}

      {/* Preview Modal */}
      {previewOpen && <PreviewModal onClose={() => setPreviewOpen(false)} />}
    </div>
  );
};
