import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  TSSRData,
  BOQItem,
  ChangeLogEntry,
  Photo,
  Annotation,
  SketchData,
  SketchElement,
} from "../types/site";
import {
  type TSSRPhotoCategory,
  getAutoFilename,
} from "../lib/photo-categories";
import {
  searchCatalog,
  getProjectBOQ,
  getProjectTSSR,
  updateProjectTSSR,
  addBOQItem as apiAddBOQItem,
  updateBOQItem as apiUpdateBOQItem,
  updateBOQItemActuals as apiUpdateBOQItemActuals,
  removeBOQItem as apiRemoveBOQItem,
  computeBOQ as apiComputeBOQ,
  createProject as apiCreateProject,
  getProjects as apiGetProjects,
  getProject as apiGetProject,
  updateProject as apiUpdateProject,
  uploadPhotos as apiUploadPhotos,
  getProjectPhotos as apiGetProjectPhotos,
  updateProjectPhoto as apiUpdatePhoto,
  deleteProjectPhoto as apiDeletePhoto,
  type CatalogItem,
  type BOQItemFromAPI,
  type ComputedBOQItem,
  type PhotoFromAPI,
  getBuildTasks as apiGetBuildTasks,
  saveBuildTasks as apiSaveBuildTasks,
  type BuildTask,
} from "../api/client";
import { type RadioPlanData } from "../lib/radio-plan-parser";
import { type PowerCalcData } from "../lib/power-calc-parser";
import { type PlannedWorksState } from "../types/planned-works";
import { generatePlannedWorks } from "../lib/planned-works-generator";
import { toast } from "sonner";

interface SiteContextType {
  tssrData: TSSRData;
  parsedRadioPlan: RadioPlanData | null;
  setParsedRadioPlan: (data: RadioPlanData | null) => void;
  parsedPowerCalc: PowerCalcData | null;
  setParsedPowerCalc: (data: PowerCalcData | null) => void;
  plannedWorks: PlannedWorksState | null;
  setPlannedWorks: (data: PlannedWorksState | null) => void;
  boqItems: BOQItem[];
  changeLog: ChangeLogEntry[];
  recentChanges: Set<string>;
  photos: Photo[];
  sketchData: SketchData;
  projectId: string | null;
  backendConnected: boolean;
  projectLoading: boolean;
  onedriveFolderId: string | null;
  onedriveFolderPath: string | null;
  boqComputeStatus: "idle" | "computing" | "success" | "error";
  boqComputeError: string | null;
  retryBOQCompute: () => void;
  kickstartPending: boolean;
  setKickstartPending: (pending: boolean) => void;
  tssrExportVersion: number;
  boqExportVersion: number;
  exportHistory: import("../api/client").ExportHistoryEntry[];
  setExportHistory: (
    history: import("../api/client").ExportHistoryEntry[],
  ) => void;
  buildTasks: import("../api/client").BuildTask[];
  setBuildTasks: (tasks: import("../api/client").BuildTask[]) => void;
  buildProgress: { completed: number; total: number };
  loadBuildTasks: (projectId: string) => Promise<void>;
  persistBuildTasks: (
    tasks: import("../api/client").BuildTask[],
  ) => Promise<void>;
  setOneDriveFolder: (folderId: string, folderPath: string) => void;
  incrementExportVersion: (type: "tssr" | "boq") => void;
  updateTSSRField: (field: string, value: any) => void;
  updateSectorData: (index: number, field: string, value: any) => void;
  updateBOQItemQuantity: (
    id: string,
    quantity: number,
    isManual?: boolean,
  ) => void;
  updateBOQItemActuals: (
    id: string,
    actualQuantity: number | null,
    actualComment: string | null,
  ) => void;
  addCatalogItemToProject: (
    catalogItemId: string,
    quantity?: number,
  ) => Promise<void>;
  removeBOQItemFromProject: (itemId: string) => Promise<void>;
  searchCatalogItems: (
    query: string,
    section?: string,
  ) => Promise<CatalogItem[]>;
  loadProjectBOQ: (projectId: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<boolean>;
  clearProject: () => void;
  setProjectId: (id: string | null) => void;
  reloadPhotos: () => Promise<void>;
  addPhotos: (files: File[], phase?: string) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  deletePhoto: (photoId: string) => void;
  movePhotoToSection: (
    photoId: string,
    section: TSSRPhotoCategory,
    sectorId?: string,
  ) => void;
  addAnnotation: (photoId: string, annotation: Annotation) => void;
  updateAnnotation: (
    photoId: string,
    annotationId: string,
    updates: Partial<Annotation>,
  ) => void;
  deleteAnnotation: (photoId: string, annotationId: string) => void;
  addSketchElement: (element: SketchElement) => void;
  updateSketchElement: (
    elementId: string,
    updates: Partial<SketchElement>,
  ) => void;
  deleteSketchElement: (elementId: string) => void;
  updateSketchSettings: (settings: Partial<SketchData>) => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const useSiteContext = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error("useSiteContext must be used within SiteProvider");
  }
  return context;
};

const getDefaultTSSRData = (): TSSRData => ({
  radioPlanFile: null,
  powerCalcFile: null,
  siteId: "",
  siteName: "",
  operator: "",
  siteModel: "",
  siteType: "",
  customer: "",
  siteOwner: "",
  siteOwnerOffer: "",
  montasjeunderlag: "",
  sart: "",
  veiviser: "",
  rfsrRnp: "",
  guidelineVersion: "",
  veiviserComments: "",
  iloqRequired: false,
  iloqDetails: "",
  tssrAlignment: "",
  tssrAlignmentComments: "",
  sectors: 0,
  size: "" as any,
  config: "",
  sectorData: [],
  siteCategory: "" as any,
  landlordName: "",
  accessInstructions: "",
  craneNeeded: false,
  revisionHistory: [],
  additionalNotes: "",
});

/**
 * Convert backend API response to frontend BOQItem type.
 */
function apiItemToBOQItem(item: BOQItemFromAPI): BOQItem {
  return {
    id: item.id,
    catalogItemId: item.catalogItemId,
    section: item.section,
    productCode: item.productCode,
    description: item.description,
    comments: item.comments,
    orderingHints: item.orderingHints,
    productCategory: item.productCategory,
    productSubcategory: item.productSubcategory,
    vendor: item.vendor,
    quantity: item.quantity,
    ruleApplied: item.ruleApplied,
    isManualOverride: item.isManualOverride,
    overrideNote: item.overrideNote,
    rowIndex: item.rowIndex,
    sheetName: item.sheetName,
    actualQuantity: item.actualQuantity ?? null,
    actualComment: item.actualComment ?? null,
  };
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function apiPhotoToPhoto(p: PhotoFromAPI): Photo {
  return {
    id: p.id,
    fileName: p.originalFilename,
    autoFilename: p.autoFilename || undefined,
    fileUrl: `${API_BASE}${p.fileUrl}`,
    thumbnailUrl: p.thumbnailUrl ? `${API_BASE}${p.thumbnailUrl}` : undefined,
    section: (p.section as TSSRPhotoCategory) || "unsorted",
    sectorId: p.sectorId || undefined,
    caption: p.caption || undefined,
    annotations: (p.annotations as Photo["annotations"]) || [],
    exifCompass: p.exifCompass || undefined,
    timestamp: Date.now(),
    phase: p.phase || "planning",
  };
}

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tssrData, setTssrData] = useState<TSSRData>(getDefaultTSSRData());
  const [parsedRadioPlan, setParsedRadioPlan] = useState<RadioPlanData | null>(
    null,
  );
  const [parsedPowerCalc, setParsedPowerCalc] = useState<PowerCalcData | null>(
    null,
  );
  const [plannedWorks, setPlannedWorks] = useState<PlannedWorksState | null>(
    null,
  );
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projectId, setProjectIdRaw] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [boqComputeStatus, setBoqComputeStatus] = useState<
    "idle" | "computing" | "success" | "error"
  >("idle");
  const [boqComputeError, setBoqComputeError] = useState<string | null>(null);
  const [boqComputeRetry, setBoqComputeRetry] = useState(0);
  const [kickstartPending, setKickstartPending] = useState(false);
  const [onedriveFolderId, setOnedriveFolderId] = useState<string | null>(null);
  const [onedriveFolderPath, setOnedriveFolderPath] = useState<string | null>(
    null,
  );
  const [tssrExportVersion, setTssrExportVersion] = useState(0);
  const [boqExportVersion, setBoqExportVersion] = useState(0);
  const [exportHistory, setExportHistory] = useState<
    import("../api/client").ExportHistoryEntry[]
  >([]);
  const [buildTasks, setBuildTasks] = useState<
    import("../api/client").BuildTask[]
  >([]);
  const [sketchData, setSketchData] = useState<SketchData>({
    elements: [],
    canvasSize: { width: 1000, height: 800 },
    gridEnabled: true,
    snapEnabled: true,
    zoom: 1,
    mapView: false,
  });

  // ── Backend health check on mount ──────────────────────────────────
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/health`)
      .then((res) => {
        if (res.ok) setBackendConnected(true);
      })
      .catch(() => {
        setBackendConnected(false);
      });
  }, []);

  // ── Backend-connected BOQ operations ──────────────────────────────

  const loadProjectBOQ = useCallback(async (pid: string) => {
    try {
      const items = await getProjectBOQ(pid);
      setBoqItems(items.map(apiItemToBOQItem));
      setBackendConnected(true);
    } catch (err) {
      console.error("Failed to load project BOQ:", err);
      setBackendConnected(false);
      toast.error("Could not connect to backend", {
        description:
          "BOQ data will not be available until the backend is running",
      });
    }
  }, []);

  // Load photos from backend
  const loadProjectPhotos = useCallback(async (pid: string) => {
    try {
      const apiPhotos = await apiGetProjectPhotos(pid);
      setPhotos(apiPhotos.map(apiPhotoToPhoto));
    } catch (err) {
      console.error("Failed to load project photos:", err);
    }
  }, []);

  // Reload photos for current project (used after OneDrive import)
  const reloadPhotos = useCallback(async () => {
    if (projectId) {
      await loadProjectPhotos(projectId);
    }
  }, [projectId, loadProjectPhotos]);

  // Load TSSR data from backend
  const loadProjectTSSR = useCallback(async (pid: string) => {
    try {
      const data = await getProjectTSSR(pid);
      // Map backend camelCase response to TSSRData
      setTssrData((prev) => ({
        ...prev,
        radioPlanFile: (data.radioPlanFile as any) || null,
        powerCalcFile: (data.powerCalcFile as any) || null,
        siteId: (data.siteId as string) || "",
        siteName: (data.siteName as string) || "",
        operator: (data.operator as string) || "",
        siteModel: (data.siteModel as string) || "",
        siteType: (data.siteType as string) || "",
        customer: (data.customer as string) || "",
        siteOwner: (data.siteOwner as string) || "",
        siteOwnerOffer: (data.siteOwnerOffer as string) || "",
        montasjeunderlag: (data.montasjeunderlag as string) || "",
        sart: (data.sart as string) || "",
        veiviser: (data.veiviser as string) || "",
        rfsrRnp: (data.rfsrRnp as string) || "",
        guidelineVersion: (data.guidelineVersion as string) || "",
        veiviserComments: (data.veiviserComments as string) || "",
        iloqRequired: (data.iloqRequired as boolean) || false,
        iloqDetails: (data.iloqDetails as string) || "",
        tssrAlignment: (data.tssrAlignment as string) || "",
        tssrAlignmentComments: (data.tssrAlignmentComments as string) || "",
        sectors: (data.sectors as number) || 0,
        size: ((data.size as string) || "") as any,
        config: (data.config as string) || "",
        sectorData: (data.sectorData as any[]) || [],
        siteCategory: ((data.siteCategory as string) || "") as any,
        landlordName: (data.landlordName as string) || "",
        accessInstructions: (data.accessInstructions as string) || "",
        craneNeeded: (data.craneNeeded as boolean) || false,
        revisionHistory: (data.revisionHistory as any[]) || [],
        additionalNotes: (data.additionalNotes as string) || "",
      }));
      // Restore planned works from backend
      if ((data as any).plannedWorks) {
        setPlannedWorks((data as any).plannedWorks as PlannedWorksState);
      }
    } catch (err) {
      console.error("Failed to load TSSR data:", err);
    }
  }, []);

  // Persist projectId to localStorage
  const setProjectId = useCallback((id: string | null) => {
    setProjectIdRaw(id);
    if (id) {
      localStorage.setItem("siteforge_projectId", id);
    } else {
      localStorage.removeItem("siteforge_projectId");
    }
  }, []);

  // Load a full project by ID (metadata + TSSR + BOQ + photos)
  const loadProject = useCallback(
    async (pid: string): Promise<boolean> => {
      setProjectLoading(true);
      try {
        // Load project metadata (OneDrive binding, export versions)
        const proj = await apiGetProject(pid);
        setOnedriveFolderId(proj.onedrive_folder_id || null);
        setOnedriveFolderPath(proj.onedrive_folder_path || null);
        setTssrExportVersion(proj.tssr_export_version || 0);
        setBoqExportVersion(proj.boq_export_version || 0);
        setExportHistory(proj.export_history || []);
        setBuildTasks(proj.build_tasks || []);

        await loadProjectTSSR(pid);
        await loadProjectBOQ(pid);
        await loadProjectPhotos(pid);
        setProjectId(pid);
        setBackendConnected(true);
        return true;
      } catch (err) {
        console.error("Failed to load project:", err);
        return false;
      } finally {
        setProjectLoading(false);
      }
    },
    [loadProjectTSSR, loadProjectBOQ, loadProjectPhotos, setProjectId],
  );

  // Clear project state and localStorage
  const clearProject = useCallback(() => {
    setProjectId(null);
    setTssrData(getDefaultTSSRData());
    setBoqItems([]);
    setPhotos([]);
    setParsedRadioPlan(null);
    setParsedPowerCalc(null);
    setPlannedWorks(null);
    setChangeLog([]);
    setOnedriveFolderId(null);
    setOnedriveFolderPath(null);
    setTssrExportVersion(0);
    setBoqExportVersion(0);
    setExportHistory([]);
    setBuildTasks([]);
  }, [setProjectId]);

  // Set OneDrive folder binding and persist to backend
  const retryBOQCompute = useCallback(() => {
    setBoqComputeRetry((n) => n + 1);
  }, []);

  const setOneDriveFolder = useCallback(
    (folderId: string, folderPath: string) => {
      setOnedriveFolderId(folderId);
      setOnedriveFolderPath(folderPath);
      if (projectId) {
        apiUpdateProject(projectId, {
          onedrive_folder_id: folderId,
          onedrive_folder_path: folderPath,
        }).catch((err) =>
          console.error("Failed to save OneDrive folder binding:", err),
        );
      }
    },
    [projectId],
  );

  // Increment export version and persist
  const buildProgress = React.useMemo(() => {
    const total = buildTasks.length;
    const completed = buildTasks.filter((t) => t.completed).length;
    return { completed, total };
  }, [buildTasks]);

  const loadBuildTasks = useCallback(async (pid: string) => {
    try {
      const tasks = await apiGetBuildTasks(pid);
      setBuildTasks(tasks);
    } catch {
      // Non-critical
    }
  }, []);

  const persistBuildTasks = useCallback(
    async (tasks: BuildTask[]) => {
      setBuildTasks(tasks);
      if (projectId) {
        try {
          await apiSaveBuildTasks(projectId, tasks);
        } catch (err) {
          console.error("Failed to save build tasks:", err);
        }
      }
    },
    [projectId],
  );

  const incrementExportVersion = useCallback(
    (type: "tssr" | "boq") => {
      if (type === "tssr") {
        setTssrExportVersion((v) => {
          const next = v + 1;
          if (projectId) {
            apiUpdateProject(projectId, { tssr_export_version: next }).catch(
              (err) => console.error("Failed to save export version:", err),
            );
          }
          return next;
        });
      } else {
        setBoqExportVersion((v) => {
          const next = v + 1;
          if (projectId) {
            apiUpdateProject(projectId, { boq_export_version: next }).catch(
              (err) => console.error("Failed to save export version:", err),
            );
          }
          return next;
        });
      }
    },
    [projectId],
  );

  // On mount: restore project from localStorage
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current || !backendConnected) return;
    hasRestoredRef.current = true;
    const savedId = localStorage.getItem("siteforge_projectId");
    if (savedId) {
      loadProject(savedId).then((ok) => {
        if (!ok) {
          // Project no longer exists — clear
          localStorage.removeItem("siteforge_projectId");
        }
      });
    }
  }, [backendConnected, loadProject]);

  // Debounced sync of TSSR data to backend
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tssrDataRef = useRef(tssrData);
  tssrDataRef.current = tssrData;

  const plannedWorksRef = useRef(plannedWorks);
  plannedWorksRef.current = plannedWorks;

  // Use refs so the debounce timeout always reads the latest values,
  // even if projectId was set after the debounce was scheduled.
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const backendConnectedRef = useRef(backendConnected);
  backendConnectedRef.current = backendConnected;

  const syncTSSRToBackend = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const pid = projectIdRef.current;
      if (!pid || !backendConnectedRef.current) return;
      try {
        const payload = {
          ...tssrDataRef.current,
          plannedWorks: plannedWorksRef.current,
        };
        await updateProjectTSSR(pid, payload);
      } catch (err) {
        console.error("Failed to sync TSSR to backend:", err);
      }
    }, 800); // 800ms debounce
  }, []);

  // TODO: Load project from URL param or project selection

  // Sync planned works changes to backend (debounced)
  useEffect(() => {
    syncTSSRToBackend();
  }, [plannedWorks, syncTSSRToBackend]);

  // Auto-generate planned works when import data changes
  useEffect(() => {
    if (!parsedRadioPlan) return;
    // Only auto-generate if not already loaded from backend
    if (
      plannedWorks?.sourceVersions?.radioPlanHash ===
      String(parsedRadioPlan.totalCells)
    ) {
      return;
    }
    const state = generatePlannedWorks(
      parsedRadioPlan,
      parsedPowerCalc,
      plannedWorks,
    );
    setPlannedWorks(state);
  }, [parsedRadioPlan, parsedPowerCalc]);

  // Recompute BOQ items when import data changes
  // Backend path: POST parsed radio plan → dependency engine → catalog resolution
  // Skip if kickstart is pending — wait for user answers before computing
  useEffect(() => {
    if (!parsedRadioPlan && !parsedPowerCalc) return;
    if (kickstartPending) return;

    let cancelled = false;
    setBoqComputeStatus("computing");
    setBoqComputeError(null);

    const computeViaBackend = async () => {
      if (!backendConnected || !parsedRadioPlan) {
        throw new Error("Backend not connected or no radio plan data");
      }

      // Auto-create project if none exists, with dedup check
      let pid = projectId;
      if (!pid) {
        const existing = await apiGetProjects({
          site_id: parsedRadioPlan.siteId,
        });
        if (existing.length > 0) {
          pid = existing[0].id;
          toast.info("Existing project found", {
            description: `Loaded ${existing[0].site_name || existing[0].site_id}`,
          });
        } else {
          const proj = await apiCreateProject({
            siteId: parsedRadioPlan.siteId,
            siteName:
              tssrDataRef.current.siteName ||
              parsedRadioPlan.project ||
              parsedRadioPlan.siteId,
            operator: "ICE",
          });
          pid = proj.id;
        }
        setProjectIdRaw(pid);
        localStorage.setItem("siteforge_projectId", pid);
      }

      const pcPayload = parsedPowerCalc
        ? {
            rectifierModules:
              parsedPowerCalc.rectifierSetup.minModules ||
              parsedPowerCalc.results.rectifierModules,
            rectifierModel: parsedPowerCalc.rectifierSetup.model,
            rectifierIsNew: parsedPowerCalc.rectifierSetup.isNew,
            maxModules: parsedPowerCalc.rectifierSetup.maxModules,
            batteryStrings: parsedPowerCalc.results.batteryStrings2h,
            dcCables: parsedPowerCalc.dcCables,
          }
        : null;
      const response = await apiComputeBOQ(pid, parsedRadioPlan, pcPayload);
      if (cancelled) return;
      const items: BOQItem[] = response.items.map((item: ComputedBOQItem) => ({
        id: `rule-${item.productCode}`,
        catalogItemId: null,
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        section: item.section as BOQItem["section"],
        productCategory: item.productCategory,
        productSubcategory: item.productSubcategory || undefined,
        vendor: item.vendor || undefined,
        ruleApplied: item.ruleApplied,
        isManualOverride: false,
        rowIndex: item.rowIndex,
        sheetName: item.sheetName,
      }));
      setBoqItems((prev) => {
        const manualItems = prev.filter((i) => i.isManualOverride);
        return [...items, ...manualItems];
      });
      setBoqComputeStatus("success");
    };

    computeViaBackend().catch((err) => {
      if (cancelled) return;
      const msg = err instanceof Error ? err.message : "BOQ compute failed";
      console.error("BOQ compute failed:", msg);
      setBoqComputeStatus("error");
      setBoqComputeError(msg);
      toast.error("BOQ compute failed", {
        description: "Check backend connection. Use Retry to try again.",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    parsedRadioPlan,
    parsedPowerCalc,
    projectId,
    backendConnected,
    boqComputeRetry,
    kickstartPending,
  ]);

  const searchCatalogItems = useCallback(
    async (query: string, section?: string): Promise<CatalogItem[]> => {
      try {
        return await searchCatalog({ q: query, section, limit: 50 });
      } catch (err) {
        console.error("Catalog search failed:", err);
        toast.error("Catalog search failed");
        return [];
      }
    },
    [],
  );

  const addCatalogItemToProject = useCallback(
    async (catalogItemId: string, quantity = 0) => {
      if (!projectId) {
        toast.error("No project selected");
        return;
      }
      try {
        const item = await apiAddBOQItem(projectId, catalogItemId, quantity);
        const boqItem = apiItemToBOQItem(item);
        boqItem.isNew = true;
        boqItem.timestamp = Date.now();
        setBoqItems((prev) => [...prev, boqItem]);
        setRecentChanges((prev) => new Set([...prev, boqItem.id]));
        setTimeout(() => setRecentChanges(new Set()), 5000);
        toast.success("Item added to BOQ", {
          description: boqItem.description,
        });
      } catch (err: any) {
        if (err.message?.includes("409")) {
          toast.warning("Item already in project BOQ");
        } else {
          toast.error("Failed to add item");
        }
      }
    },
    [projectId],
  );

  const removeBOQItemFromProject = useCallback(
    async (itemId: string) => {
      if (!projectId) return;
      try {
        await apiRemoveBOQItem(projectId, itemId);
        setBoqItems((prev) => prev.filter((i) => i.id !== itemId));
        toast.success("Item removed from BOQ");
      } catch (err) {
        toast.error("Failed to remove item");
      }
    },
    [projectId],
  );

  const updateBOQItemQuantity = useCallback(
    (id: string, quantity: number, isManual = false) => {
      // Optimistic update
      setBoqItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              quantity,
              isManualOverride: isManual,
              previousQuantity:
                item.quantity !== quantity ? item.quantity : undefined,
              timestamp: Date.now(),
            };
          }
          return item;
        }),
      );

      // Persist to backend if connected
      if (projectId && backendConnected) {
        apiUpdateBOQItem(projectId, id, quantity, isManual).catch((err) => {
          console.error("Failed to persist BOQ update:", err);
          toast.error("Failed to save quantity change");
        });
      }

      if (isManual) {
        toast.warning("Manual override applied", {
          description: `Quantity manually set to ${quantity}`,
        });
      }
    },
    [projectId, backendConnected],
  );

  const updateBOQItemActuals = useCallback(
    (
      id: string,
      actualQuantity: number | null,
      actualComment: string | null,
    ) => {
      // Optimistic update
      setBoqItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, actualQuantity, actualComment } : item,
        ),
      );

      // Persist to backend
      if (projectId && backendConnected) {
        apiUpdateBOQItemActuals(
          projectId,
          id,
          actualQuantity,
          actualComment,
        ).catch((err) => {
          console.error("Failed to persist actuals:", err);
          toast.error("Failed to save actual quantity");
        });
      }
    },
    [projectId, backendConnected],
  );

  // ── TSSR field updates ────────────────────────────────────────────

  const updateTSSRField = useCallback(
    (field: string, value: any) => {
      setTssrData((prev) => {
        const updated = { ...prev, [field]: value };

        // Resize sectorData array when sector count changes
        if (field === "sectors") {
          const newSectors = value as number;
          const currentSectors = prev.sectorData.length;

          if (newSectors > currentSectors) {
            const newSectorData = [...prev.sectorData];
            for (let i = currentSectors; i < newSectors; i++) {
              const sectorId = String.fromCharCode(65 + i);
              newSectorData.push({
                id: sectorId,
                azimuth: 0,
                mTilt: 0,
                eTilt: 0,
                antennas: [],
                cableRoute: 0,
              });
            }
            updated.sectorData = newSectorData;
          } else if (newSectors < currentSectors) {
            updated.sectorData = prev.sectorData.slice(0, newSectors);
          }
        }

        // Log change
        const logEntry: ChangeLogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString("nb-NO", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          description: `${field}: ${prev[field as keyof TSSRData]} \u2192 ${value}`,
          itemsChanged: 0,
        };
        setChangeLog((prevLog) => [logEntry, ...prevLog]);

        return updated;
      });

      // Sync to backend (debounced)
      syncTSSRToBackend();
    },
    [syncTSSRToBackend],
  );

  const updateSectorData = useCallback(
    (index: number, field: string, value: any) => {
      setTssrData((prev) => {
        const updated = { ...prev };
        updated.sectorData = [...prev.sectorData];
        updated.sectorData[index] = {
          ...updated.sectorData[index],
          [field]: value,
        };
        return updated;
      });

      // Sync to backend (debounced)
      syncTSSRToBackend();
    },
    [syncTSSRToBackend],
  );

  // ── Photo operations ──────────────────────────────────────────────

  const addPhotos = useCallback(
    (files: File[], phase?: string) => {
      if (backendConnected && projectId) {
        // Upload to backend, use server URLs
        apiUploadPhotos(projectId, files, phase || "planning")
          .then((apiPhotos) => {
            const photos = apiPhotos.map(apiPhotoToPhoto);
            setPhotos((prev) => [...prev, ...photos]);
            toast.success(`${files.length} photo(s) uploaded`);
          })
          .catch((err) => {
            console.error("Failed to upload photos:", err);
            // Fallback to blob URLs
            const newPhotos: Photo[] = files.map((file, index) => ({
              id: `photo-${Date.now()}-${index}`,
              fileName: file.name,
              fileUrl: URL.createObjectURL(file),
              section: "unsorted",
              annotations: [],
              timestamp: Date.now() + index,
            }));
            setPhotos((prev) => [...prev, ...newPhotos]);
            toast.error("Upload failed — photos stored locally only");
          });
      } else {
        // Fallback: client-side blob URLs
        const newPhotos: Photo[] = files.map((file, index) => ({
          id: `photo-${Date.now()}-${index}`,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          section: "unsorted",
          annotations: [],
          timestamp: Date.now() + index,
        }));
        setPhotos((prev) => [...prev, ...newPhotos]);
        toast.success(`${files.length} photo(s) uploaded`);
      }
    },
    [backendConnected, projectId],
  );

  const updatePhoto = useCallback(
    (photoId: string, updates: Partial<Photo>) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, ...updates } : photo,
        ),
      );
    },
    [],
  );

  const deletePhoto = useCallback(
    (photoId: string) => {
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      if (backendConnected && projectId) {
        apiDeletePhoto(projectId, photoId).catch((err) => {
          console.error("Failed to delete photo from backend:", err);
        });
      }
    },
    [backendConnected, projectId],
  );

  const movePhotoToSection = useCallback(
    (photoId: string, section: TSSRPhotoCategory, sectorId?: string) => {
      let computedAutoFilename: string | undefined;

      setPhotos((prev) => {
        const existingInSection = prev.filter(
          (p) => p.id !== photoId && p.section === section,
        );
        const sequence = existingInSection.length + 1;
        const siteId = tssrDataRef.current.siteId;

        return prev.map((photo) => {
          if (photo.id !== photoId) return photo;
          const ext = photo.fileName.split(".").pop() || "jpg";
          computedAutoFilename =
            section !== "unsorted"
              ? getAutoFilename(siteId, section, sectorId, sequence, ext)
              : undefined;
          return {
            ...photo,
            section,
            sectorId,
            autoFilename: computedAutoFilename,
          };
        });
      });

      // Persist to backend
      if (backendConnected && projectId) {
        apiUpdatePhoto(projectId, photoId, {
          section,
          sectorId,
          autoFilename: computedAutoFilename,
        }).catch((err) => {
          console.error("Failed to update photo section:", err);
        });
      }
    },
    [backendConnected, projectId],
  );

  const addAnnotation = useCallback(
    (photoId: string, annotation: Annotation) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? { ...photo, annotations: [...photo.annotations, annotation] }
            : photo,
        ),
      );
    },
    [],
  );

  const updateAnnotation = useCallback(
    (photoId: string, annotationId: string, updates: Partial<Annotation>) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                annotations: photo.annotations.map((a) =>
                  a.id === annotationId ? { ...a, ...updates } : a,
                ),
              }
            : photo,
        ),
      );
    },
    [],
  );

  const deleteAnnotation = useCallback(
    (photoId: string, annotationId: string) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                annotations: photo.annotations.filter(
                  (a) => a.id !== annotationId,
                ),
              }
            : photo,
        ),
      );
    },
    [],
  );

  // ── Sketch operations ─────────────────────────────────────────────

  const addSketchElement = useCallback((element: SketchElement) => {
    setSketchData((prev) => ({
      ...prev,
      elements: [...prev.elements, element],
    }));
  }, []);

  const updateSketchElement = useCallback(
    (elementId: string, updates: Partial<SketchElement>) => {
      setSketchData((prev) => ({
        ...prev,
        elements: prev.elements.map((e) =>
          e.id === elementId ? { ...e, ...updates } : e,
        ),
      }));
    },
    [],
  );

  const deleteSketchElement = useCallback((elementId: string) => {
    setSketchData((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== elementId),
    }));
  }, []);

  const updateSketchSettings = useCallback((settings: Partial<SketchData>) => {
    setSketchData((prev) => ({ ...prev, ...settings }));
  }, []);

  return (
    <SiteContext.Provider
      value={{
        tssrData,
        parsedRadioPlan,
        setParsedRadioPlan,
        parsedPowerCalc,
        setParsedPowerCalc,
        plannedWorks,
        setPlannedWorks,
        boqItems,
        changeLog,
        recentChanges,
        photos,
        sketchData,
        projectId,
        backendConnected,
        projectLoading,
        onedriveFolderId,
        onedriveFolderPath,
        boqComputeStatus,
        boqComputeError,
        retryBOQCompute,
        kickstartPending,
        setKickstartPending,
        tssrExportVersion,
        boqExportVersion,
        exportHistory,
        setExportHistory,
        buildTasks,
        setBuildTasks,
        buildProgress,
        loadBuildTasks,
        persistBuildTasks,
        setOneDriveFolder,
        incrementExportVersion,
        updateTSSRField,
        updateSectorData,
        updateBOQItemQuantity,
        updateBOQItemActuals,
        addCatalogItemToProject,
        removeBOQItemFromProject,
        searchCatalogItems,
        loadProjectBOQ,
        loadProject,
        clearProject,
        setProjectId,
        reloadPhotos,
        addPhotos,
        updatePhoto,
        deletePhoto,
        movePhotoToSection,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        addSketchElement,
        updateSketchElement,
        deleteSketchElement,
        updateSketchSettings,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};
