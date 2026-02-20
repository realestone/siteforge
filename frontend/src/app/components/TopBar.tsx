import React from "react";
import { Badge } from "./ui/badge";
import {
  Save,
  FileDown,
  SendHorizonal,
  CheckCircle,
  ChevronDown,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { useSiteContext } from "../context/SiteContext";
import { useWorkflowContext, availableUsers } from "../context/WorkflowContext";
import { toast } from "sonner";
import { exportBOQTemplate, exportTSSRTemplate } from "../api/client";
import { WorkflowStatus } from "../types/site";

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
  const { tssrData, boqItems, projectId } = useSiteContext();
  const {
    currentUser,
    workflow,
    canEdit,
    submitForReview,
    approveAndForward,
    setCurrentUser,
  } = useWorkflowContext();

  const handleSave = () => {
    toast.success("Draft saved", {
      description: "All changes saved successfully",
    });
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
      try {
        await exportTSSRTemplate(projectId, format);
        toast.success("TSSR exported", {
          description:
            format === "modern"
              ? "Modern template generated and downloaded"
              : "Template filled with project data and downloaded",
        });
      } catch {
        toast.error("TSSR export failed");
      }
    }
    if (type === "boq" || type === "both") {
      if (!projectId) {
        toast.warning("No project loaded");
        return;
      }
      try {
        await exportBOQTemplate(projectId);
        toast.success("BOQ exported", {
          description: "Template filled with quantities and downloaded",
        });
      } catch {
        toast.error("BOQ export failed");
      }
    }
  };

  const getStatusColor = (status: WorkflowStatus) => {
    const colors: Record<WorkflowStatus, string> = {
      draft: "bg-gray-500",
      "internal-review": "bg-blue-500",
      "changes-requested": "bg-orange-500",
      submitted: "bg-purple-500",
      rejected: "bg-red-500",
      approved: "bg-green-500",
      building: "bg-teal-500",
      "as-built-complete": "bg-emerald-700",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: WorkflowStatus) => {
    const labels: Record<WorkflowStatus, string> = {
      draft: "Draft",
      "internal-review": "Internal Review",
      "changes-requested": "Changes Requested",
      submitted: "Submitted",
      rejected: "Rejected",
      approved: "Approved",
      building: "Building",
      "as-built-complete": "As-Built Complete",
    };
    return labels[status] || status;
  };

  const getTimeSince = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Project Info + Status */}
        <div className="flex items-center gap-4">
          {/* Logo / Branding */}
          <span className="text-xl font-bold text-gray-900">SiteForge</span>

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

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* Existing status info */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Status:</span>
              <Badge
                className={`${getStatusColor(workflow.status)} text-white border-0 text-[10px] px-2 py-0.5`}
              >
                &#9679; {getStatusLabel(workflow.status)}
              </Badge>
            </div>
            {workflow.assignedTo && (
              <>
                <span className="text-gray-400">&bull;</span>
                <span className="text-gray-600">
                  Assigned to: {workflow.assignedTo.name}
                </span>
                {workflow.assignedAt && (
                  <span className="text-gray-500">
                    ({getTimeSince(workflow.assignedAt)})
                  </span>
                )}
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
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Submit / Approve */}
          {currentUser.role === "maker" && workflow.status === "draft" && (
            <button
              onClick={submitForReview}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-sm transition-all"
            >
              <SendHorizonal className="h-4 w-4" />
              Submit
            </button>
          )}

          {currentUser.role === "checker" &&
            workflow.status === "internal-review" && (
              <button
                onClick={approveAndForward}
                className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-sm transition-all"
              >
                <CheckCircle className="h-4 w-4" />
                Approve & Forward
              </button>
            )}

          {currentUser.role === "spl" && workflow.status === "submitted" && (
            <button
              onClick={approveAndForward}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-sm transition-all"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
