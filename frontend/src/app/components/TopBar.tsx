import React from "react";
import { Badge } from "./ui/badge";
import {
  Save,
  FileDown,
  SendHorizonal,
  CheckCircle,
  ChevronDown,
  User,
  Cloud,
  ExternalLink,
  Home,
  History,
} from "lucide-react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { useSiteContext } from "../context/SiteContext";
import {
  useWorkflowContext,
  availableUsers,
  type WorkflowStatus,
} from "../context/WorkflowContext";
import { useNavigation } from "../context/NavigationContext";
import { toast } from "sonner";
import {
  exportBOQTemplate,
  exportTSSRTemplate,
  recordExport,
  API_BASE,
} from "../api/client";
import { uploadAndGetEditUrl } from "../api/graphService";

const InfoField: React.FC<{
  label: string;
  value?: string;
  placeholder: string;
}> = ({ label, value, placeholder }) => (
  <div className="flex flex-col">
    <span className="text-[11px] font-medium text-gray-500 uppercase leading-tight">
      {label}
    </span>
    <span
      className={`text-sm font-semibold leading-tight ${value ? "text-gray-900" : "text-gray-400"}`}
    >
      {value || placeholder}
    </span>
  </div>
);

export const TopBar: React.FC = () => {
  const {
    tssrData,
    boqItems,
    projectId,
    onedriveFolderPath,
    tssrExportVersion,
    boqExportVersion,
    exportHistory,
    setExportHistory,
    incrementExportVersion,
    buildProgress,
  } = useSiteContext();
  const { navigateHome } = useNavigation();
  const { instance } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const {
    currentUser,
    status,
    canEdit,
    isReviewer,
    isAtLeastStatus,
    submitForReview,
    approve,
    requestChanges,
    startBuild,
    completeAsBuilt,
    setCurrentUser,
  } = useWorkflowContext();

  const handleSave = () => {
    toast.success("Draft saved", {
      description: "All changes saved successfully",
    });
  };

  const logExport = async (
    type: string,
    version: number,
    destination: "download" | "onedrive",
    filename: string,
    onedrivePath?: string,
  ) => {
    if (!projectId) return;
    try {
      const updated = await recordExport(projectId, {
        type,
        version,
        destination,
        filename,
        timestamp: new Date().toISOString(),
        onedrive_path: onedrivePath || null,
      });
      setExportHistory(updated);
    } catch {
      // Non-critical — don't block export
    }
  };

  const handleExport = async (
    type: "tssr" | "tssr-modern" | "boq" | "both",
  ) => {
    if (type === "tssr" || type === "tssr-modern" || type === "both") {
      if (!projectId) {
        toast.warning("No project loaded");
        return;
      }
      const format = type === "tssr-modern" ? "modern" : "legacy";
      const siteId = tssrData.siteId || "export";
      const filename = `${siteId}_TSSR.docx`;
      try {
        await exportTSSRTemplate(projectId, format);
        toast.success("TSSR exported", {
          description:
            format === "modern"
              ? "Modern template generated and downloaded"
              : "Template filled with project data and downloaded",
        });
        logExport(
          type === "tssr-modern" ? "tssr-modern" : "tssr",
          0,
          "download",
          filename,
        );
      } catch {
        toast.error("TSSR export failed");
      }
    }
    if (type === "boq" || type === "both") {
      if (!projectId) {
        toast.warning("No project loaded");
        return;
      }
      const siteId = tssrData.siteId || "export";
      const filename = `${siteId}_BOQ.xlsm`;
      try {
        await exportBOQTemplate(projectId);
        toast.success("BOQ exported", {
          description: "Template filled with quantities and downloaded",
        });
        logExport("boq", 0, "download", filename);
      } catch {
        toast.error("BOQ export failed");
      }
    }
  };

  const handleAsBuiltExport = async (type: "tssr" | "boq") => {
    if (!projectId) {
      toast.warning("No project loaded");
      return;
    }
    try {
      if (type === "tssr") {
        await exportTSSRTemplate(projectId, "modern", true);
        toast.success("As-Built TSSR exported");
      } else {
        await exportBOQTemplate(projectId, true);
        toast.success("As-Built BOQ exported");
      }
    } catch {
      toast.error(`As-Built ${type.toUpperCase()} export failed`);
    }
  };

  const handleExportToOneDrive = async (type: "tssr" | "boq") => {
    if (!projectId) {
      toast.warning("No project loaded");
      return;
    }
    if (!isMsalAuthenticated) {
      toast.warning("Sign in to OneDrive first (ONEDRIVE tab)");
      return;
    }

    const siteId = tssrData.siteId || "unknown";
    const nextVersion =
      type === "tssr" ? tssrExportVersion + 1 : boqExportVersion + 1;
    const versionStr = String(nextVersion).padStart(2, "0");

    // Use linked folder if available, otherwise fallback to SiteForge/{siteId}
    const folderPath = onedriveFolderPath || `SiteForge/${siteId}`;

    try {
      toast.info(
        `Exporting ${type.toUpperCase()} v${versionStr} to OneDrive...`,
      );

      // Get file blob from backend
      let blob: Blob;
      if (type === "tssr") {
        const res = await fetch(
          `${API_BASE}/api/projects/${projectId}/tssr/export?format=legacy`,
        );
        if (!res.ok) throw new Error("TSSR export failed");
        blob = await res.blob();
      } else {
        const res = await fetch(
          `${API_BASE}/api/projects/${projectId}/boq/export`,
        );
        if (!res.ok) throw new Error("BOQ export failed");
        blob = await res.blob();
      }

      // Versioned filename
      const fileName =
        type === "tssr"
          ? `${siteId}_TSSR_v${versionStr}.docx`
          : `${siteId}_BOQ_v${versionStr}.xlsm`;

      const result = await uploadAndGetEditUrl(
        instance,
        folderPath,
        fileName,
        await blob.arrayBuffer(),
      );

      // Increment version in state + backend
      incrementExportVersion(type);

      // Log to export history
      logExport(type, nextVersion, "onedrive", fileName, folderPath);

      toast.success(`${type.toUpperCase()} v${versionStr} saved to OneDrive`, {
        description: `${folderPath}/${fileName}`,
      });

      // Open in Word/Excel Online
      window.open(result.webUrl, "_blank");
    } catch (err: any) {
      console.error("Export to OneDrive failed:", err);
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const getStatusColor = (s: WorkflowStatus) => {
    const colors: Record<WorkflowStatus, string> = {
      draft: "bg-gray-500",
      in_review: "bg-blue-500",
      changes_requested: "bg-orange-500",
      approved: "bg-green-500",
      building: "bg-indigo-500",
      as_built_complete: "bg-emerald-600",
    };
    return colors[s] || "bg-gray-500";
  };

  const getStatusLabel = (s: WorkflowStatus) => {
    const labels: Record<WorkflowStatus, string> = {
      draft: "Draft",
      in_review: "In Review",
      changes_requested: "Changes Requested",
      approved: "Approved",
      building: "Building",
      as_built_complete: "As-Built Complete",
    };
    return labels[s] || s;
  };

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Project Info + Status */}
        <div className="flex items-center gap-4">
          {/* Logo / Branding */}
          <button
            onClick={navigateHome}
            className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-teal-700 transition-colors"
            title="Back to projects"
          >
            <Home className="h-4 w-4" />
            SiteForge
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* Project Info Fields */}
          <div className="flex items-center gap-4">
            <InfoField
              label="Project"
              value={tssrData.siteName}
              placeholder="Untitled Project"
            />
            <InfoField
              label="Site ID"
              value={tssrData.siteId}
              placeholder="—"
            />
            <InfoField
              label="Owner"
              value={tssrData.landlordName}
              placeholder="—"
            />
            <InfoField
              label="Customer"
              value={tssrData.operator}
              placeholder="—"
            />
            <InfoField label="Config" value={tssrData.config} placeholder="—" />
            <InfoField label="Version" value="1.0" placeholder="—" />
          </div>

          {/* OneDrive folder breadcrumb */}
          {onedriveFolderPath && (
            <>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-500 max-w-[200px]">
                <Cloud className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <span className="truncate" title={onedriveFolderPath}>
                  {onedriveFolderPath}
                </span>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* Status info */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Status:</span>
              <Badge
                className={`${getStatusColor(status)} text-white border-0 text-[10px] px-2 py-0.5`}
              >
                &#9679; {getStatusLabel(status)}
              </Badge>
            </div>
            {isAtLeastStatus("building") && buildProgress.total > 0 && (
              <>
                <span className="text-gray-400">&bull;</span>
                <span className="text-gray-600">
                  Build: {buildProgress.completed}/{buildProgress.total} (
                  {Math.round(
                    (buildProgress.completed / buildProgress.total) * 100,
                  )}
                  %)
                </span>
              </>
            )}
            {tssrData.config && (
              <>
                <span className="text-gray-400">&bull;</span>
                <span className="font-mono font-semibold text-gray-600">
                  {tssrData.config}
                </span>
              </>
            )}
            {tssrData.sectors > 0 && (
              <>
                <span className="text-gray-400">&bull;</span>
                <span className="text-gray-600">
                  {tssrData.sectors} Sectors
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Role switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 h-9 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <User className="h-3.5 w-3.5" />
                {currentUser.name}
                <span className="text-xs text-gray-500">
                  ({currentUser.role})
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.values(availableUsers).map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => setCurrentUser(user)}
                >
                  {user.name} ({user.role})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save */}
          {canEdit && (
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          )}

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-500 rounded-lg hover:bg-green-100 transition-colors">
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>TSSR</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport("tssr")}>
                <FileDown className="mr-2 h-4 w-4" />
                TSSR (OneCo Template)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("tssr-modern")}>
                <FileDown className="mr-2 h-4 w-4" />
                TSSR (Modern)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>BOQ</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport("boq")}>
                <FileDown className="mr-2 h-4 w-4" />
                BOQ.xlsm
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("both")}>
                <FileDown className="mr-2 h-4 w-4" />
                Both (Legacy TSSR + BOQ)
              </DropdownMenuItem>
              {isAtLeastStatus("building") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>As-Built</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleAsBuiltExport("tssr")}>
                    <FileDown className="mr-2 h-4 w-4 text-orange-500" />
                    As-Built TSSR
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAsBuiltExport("boq")}>
                    <FileDown className="mr-2 h-4 w-4 text-orange-500" />
                    As-Built BOQ
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>OneDrive</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleExportToOneDrive("tssr")}
                disabled={!isMsalAuthenticated}
              >
                <Cloud className="mr-2 h-4 w-4" />
                Save TSSR to OneDrive (v
                {String(tssrExportVersion + 1).padStart(2, "0")})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportToOneDrive("boq")}
                disabled={!isMsalAuthenticated}
              >
                <Cloud className="mr-2 h-4 w-4" />
                Save BOQ to OneDrive (v
                {String(boqExportVersion + 1).padStart(2, "0")})
              </DropdownMenuItem>
              {!isMsalAuthenticated && (
                <p className="px-2 py-1 text-[10px] text-gray-400">
                  Sign in via ONEDRIVE tab first
                </p>
              )}
              {onedriveFolderPath && (
                <p className="px-2 py-1 text-[10px] text-gray-400">
                  Target: {onedriveFolderPath}
                </p>
              )}
              {exportHistory.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    <span className="flex items-center gap-1.5">
                      <History className="h-3 w-3" />
                      Recent Exports
                    </span>
                  </DropdownMenuLabel>
                  {exportHistory
                    .slice()
                    .reverse()
                    .slice(0, 5)
                    .map((entry, i) => {
                      const date = new Date(entry.timestamp);
                      const timeStr = date.toLocaleDateString("nb-NO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const icon = entry.destination === "onedrive" ? "☁" : "↓";
                      const vStr =
                        entry.version > 0
                          ? ` v${String(entry.version).padStart(2, "0")}`
                          : "";
                      return (
                        <div
                          key={i}
                          className="px-2 py-1 text-[11px] text-gray-500 flex justify-between gap-3"
                        >
                          <span className="truncate">
                            {icon} {entry.type.toUpperCase()}
                            {vStr}
                          </span>
                          <span className="text-gray-400 whitespace-nowrap">
                            {timeStr}
                          </span>
                        </div>
                      );
                    })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Submit (maker in draft or changes_requested) */}
          {currentUser.role === "maker" &&
            (status === "draft" || status === "changes_requested") && (
              <button
                onClick={submitForReview}
                className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-sm transition-all"
              >
                <SendHorizonal className="h-4 w-4" />
                Submit
              </button>
            )}

          {/* Reviewer actions */}
          {isReviewer && status === "in_review" && (
            <>
              <button
                onClick={() => requestChanges()}
                className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors"
              >
                Request Changes
              </button>
              <button
                onClick={approve}
                className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 hover:shadow-sm transition-all"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            </>
          )}

          {/* Start Build (maker, when approved) */}
          {currentUser.role === "maker" && status === "approved" && (
            <button
              onClick={startBuild}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 hover:shadow-sm transition-all"
            >
              Start Build
            </button>
          )}

          {/* Complete As-Built (maker, when building) */}
          {currentUser.role === "maker" && status === "building" && (
            <button
              onClick={completeAsBuilt}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 hover:shadow-sm transition-all"
            >
              <CheckCircle className="h-4 w-4" />
              Complete As-Built
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
