import React, { useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  FileText,
  Camera,
  PenTool,
  Eye,
} from "lucide-react";
import { useSiteContext } from "../context/SiteContext";
import { RadioConfigSection } from "./sections/RadioConfigSection";
import { SiteIdentitySection } from "./sections/SiteIdentitySection";

import { PhotosMode } from "./modes/PhotosMode";
import { SketchMode } from "./modes/SketchMode";
import { PreviewMode } from "./modes/PreviewMode";

type PanelMode = "form" | "photos" | "sketch" | "preview";

interface Section {
  id: string;
  title: string;
  status: "complete" | "warning" | "empty";
  component: React.FC;
}

export const LeftPanel: React.FC = () => {
  const { tssrData, photos } = useSiteContext();
  const [mode, setMode] = useState<PanelMode>("form");

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["site-identity", "radio-config"]),
  );

  const sections: Section[] = [
    {
      id: "site-identity",
      title: "Site Identity",
      status: "empty",
      component: SiteIdentitySection,
    },
    {
      id: "radio-config",
      title: "Radio Configuration",
      status: "empty",
      component: RadioConfigSection,
    },
  ];

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusIcon = (status: Section["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "empty":
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getModeIcon = (modeType: PanelMode) => {
    switch (modeType) {
      case "form":
        return <FileText className="h-4 w-4" />;
      case "photos":
        return <Camera className="h-4 w-4" />;
      case "sketch":
        return <PenTool className="h-4 w-4" />;
      case "preview":
        return <Eye className="h-4 w-4" />;
    }
  };

  const getModeLabel = (modeType: PanelMode) => {
    switch (modeType) {
      case "form":
        return "Form";
      case "photos":
        return "Photos";
      case "sketch":
        return "Sketch";
      case "preview":
        return "Preview";
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Mode Switcher */}
      <div className="border-b bg-white px-2 py-2">
        <div className="flex gap-1">
          {(["form", "photos", "sketch", "preview"] as PanelMode[]).map(
            (modeType) => (
              <button
                key={modeType}
                onClick={() => setMode(modeType)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  mode === modeType
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {getModeIcon(modeType)}
                {getModeLabel(modeType)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Mode Content */}
      {mode === "form" && (
        <>
          <div className="border-b bg-white px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              TSSR Builder
            </h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {sections.map((section) => {
                const isOpen = openSections.has(section.id);
                const SectionComponent = section.component;

                return (
                  <Collapsible
                    key={section.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={`h-4 w-4 text-gray-500 transition-transform ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                          <span className="font-medium text-gray-900">
                            {section.title}
                          </span>
                        </div>
                        {getStatusIcon(section.status)}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-2 rounded-lg border bg-white p-4">
                        <SectionComponent />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}

      {mode === "photos" && <PhotosMode />}
      {mode === "sketch" && <SketchMode />}
      {mode === "preview" && <PreviewMode />}
    </div>
  );
};
