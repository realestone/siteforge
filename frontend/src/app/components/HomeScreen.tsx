import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trash2,
  Loader2,
  FolderOpen,
  Cloud,
  RefreshCw,
  Search,
  ArrowUpDown,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import {
  getProjects,
  deleteProject,
  type ProjectFromAPI,
  type BuildTask,
} from "../api/client";
import { OneDriveImportFlow } from "./OneDriveImportFlow";
import { toast } from "sonner";

interface HomeScreenProps {
  onSiteSelect: (projectId: string) => void;
}

// ── Status config ───────────────────────────────────────────────────

type FilterKey = "all" | "active" | "in_review" | "building" | "completed";

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  in_review: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "In Review",
  },
  changes_requested: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Changes Requested",
  },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  building: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    label: "Building",
  },
  as_built_complete: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "As-Built Complete",
  },
};

const FILTER_MATCH: Record<FilterKey, string[]> = {
  all: [],
  active: ["draft", "changes_requested", "approved"],
  in_review: ["in_review"],
  building: ["building"],
  completed: ["as_built_complete"],
};

type SortKey = "updated" | "name" | "status";

// ── Helpers ─────────────────────────────────────────────────────────

function buildProgress(tasks?: BuildTask[]): {
  completed: number;
  total: number;
} | null {
  if (!tasks || tasks.length === 0) return null;
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
  };
}

function relativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("nb-NO", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

// ── Component ───────────────────────────────────────────────────────

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSiteSelect }) => {
  const [projects, setProjects] = useState<ProjectFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showOneDriveImport, setShowOneDriveImport] = useState(false);

  // Filters & search
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjects({ limit: 100 });
      setProjects(data);
    } catch {
      toast.error("Could not load projects — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const handleDelete = async (e: React.MouseEvent, project: ProjectFromAPI) => {
    e.stopPropagation();
    setMenuOpen(null);
    if (!confirm(`Delete project "${project.site_name || project.site_id}"?`))
      return;
    setDeleting(project.id);
    try {
      await deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(null);
    }
  };

  // ── Filter counts ─────────────────────────────────────────────────

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: projects.length,
      active: 0,
      in_review: 0,
      building: 0,
      completed: 0,
    };
    for (const p of projects) {
      for (const key of Object.keys(FILTER_MATCH) as FilterKey[]) {
        if (key === "all") continue;
        if (FILTER_MATCH[key].includes(p.status)) counts[key]++;
      }
    }
    return counts;
  }, [projects]);

  // ── Filtered + sorted list ────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    let list = [...projects];

    // Status filter
    if (activeFilter !== "all") {
      const statuses = FILTER_MATCH[activeFilter];
      list = list.filter((p) => statuses.includes(p.status));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.site_id.toLowerCase().includes(q) ||
          (p.site_name || "").toLowerCase().includes(q) ||
          (p.operator || "").toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.site_name || "").localeCompare(b.site_name || "");
        case "status":
          return a.status.localeCompare(b.status);
        case "updated":
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      }
    });

    return list;
  }, [projects, activeFilter, searchQuery, sortBy]);

  // ── Render ────────────────────────────────────────────────────────

  const filterTabs: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "in_review", label: "In Review" },
    { key: "building", label: "Building" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-teal-600 text-white font-bold text-lg">
              &#9670;
            </div>
            <h1 className="text-xl font-semibold text-gray-900">SiteForge</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProjects}
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-3 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => setShowOneDriveImport(true)}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Cloud className="h-4 w-4" />
              New from OneDrive
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-4">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === key
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
              <span
                className={`ml-1.5 text-xs ${
                  activeFilter === key ? "text-teal-200" : "text-gray-400"
                }`}
              >
                {filterCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by site ID, name, or operator..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="appearance-none h-9 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 cursor-pointer"
            >
              <option value="updated">Last Updated</option>
              <option value="name">Site Name</option>
              <option value="status">Status</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Project Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-700 mb-2">
              No projects yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Import a Radio Plan or connect OneDrive to get started.
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No projects match your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredProjects.map((project) => {
              const badge = STATUS_BADGE[project.status] || STATUS_BADGE.draft;
              const progress = buildProgress(project.build_tasks);
              const progressPct =
                progress && progress.total > 0
                  ? Math.round((progress.completed / progress.total) * 100)
                  : null;

              return (
                <div
                  key={project.id}
                  onClick={() => onSiteSelect(project.id)}
                  className="group relative bg-white border border-gray-200 rounded-xl px-5 py-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-semibold text-teal-700">
                          {project.site_id || "—"}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {project.site_name || "Untitled"}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {project.operator && <span>{project.operator}</span>}
                        <span>{relativeTime(project.updated_at)}</span>
                      </div>
                    </div>

                    {/* Right: metadata + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Export versions */}
                      {((project.tssr_export_version ?? 0) > 0 ||
                        (project.boq_export_version ?? 0) > 0) && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {(project.tssr_export_version ?? 0) > 0 && (
                            <span>
                              TSSR v
                              {String(project.tssr_export_version).padStart(
                                2,
                                "0",
                              )}
                            </span>
                          )}
                          {(project.boq_export_version ?? 0) > 0 && (
                            <span>
                              BOQ v
                              {String(project.boq_export_version).padStart(
                                2,
                                "0",
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Build progress */}
                      {progressPct !== null && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums">
                            {progressPct}%
                          </span>
                        </div>
                      )}

                      {/* Context menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(
                              menuOpen === project.id ? null : project.id,
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpen === project.id && (
                          <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(null);
                                onSiteSelect(project.id);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                              Open in Editor
                            </button>
                            {project.onedrive_folder_path && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpen(null);
                                  // OneDrive folder paths are display-only; no direct link available
                                  toast.info(
                                    `OneDrive: ${project.onedrive_folder_path}`,
                                  );
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                OneDrive Folder
                              </button>
                            )}
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={(e) => handleDelete(e, project)}
                              disabled={deleting === project.id}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                            >
                              {deleting === project.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* OneDrive path (subtle) */}
                  {project.onedrive_folder_path && (
                    <div className="mt-2 text-xs text-gray-400 truncate">
                      <Cloud className="inline h-3 w-3 mr-1 -mt-0.5" />
                      {project.onedrive_folder_path}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OneDrive Import Flow */}
      {showOneDriveImport && (
        <OneDriveImportFlow
          onComplete={(projectId) => {
            setShowOneDriveImport(false);
            onSiteSelect(projectId);
          }}
          onCancel={() => setShowOneDriveImport(false)}
        />
      )}
    </div>
  );
};
