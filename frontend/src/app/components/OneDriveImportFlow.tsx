import React, { useState, useCallback, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { graphScopes } from "../lib/msalConfig";
import { listFiles, downloadFile, getFileMetadata } from "../api/graphService";
import {
  createProject,
  importPhotosFromOneDrive,
  type OneDrivePhotoImportItem,
} from "../api/client";
import { useSiteContext } from "../context/SiteContext";
import { parseRadioPlan, type RadioPlanData } from "../lib/radio-plan-parser";
import { parsePowerCalc, type PowerCalcData } from "../lib/power-calc-parser";
import { toast } from "sonner";
import {
  Cloud,
  CloudOff,
  LogIn,
  Folder,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Zap,
  FolderOpen,
  Camera,
} from "lucide-react";
import { KickstartDialog, type KickstartAnswers } from "./KickstartDialog";

// ── Types ───────────────────────────────────────────────────────────

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl?: string;
  parentReference?: { path: string; id: string };
  "@microsoft.graph.downloadUrl"?: string;
}

type DetectedType = "radioplan" | "effekt" | "tssr" | "boq" | "photo" | null;

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

type FlowStep = "browse" | "confirm" | "importing" | "kickstart";

interface ImportSelection {
  radioPlan: { item: DriveItem; path: string } | null;
  effekt: { item: DriveItem; path: string } | null;
  photosFolder: { item: DriveItem; path: string; imageCount: number } | null;
  siteFolder: { id: string | null; path: string } | null;
}

const emptySelection: ImportSelection = {
  radioPlan: null,
  effekt: null,
  photosFolder: null,
  siteFolder: null,
};

// ── Detection logic ─────────────────────────────────────────────────

function detectFileType(name: string): DetectedType {
  const lower = name.toLowerCase();
  if (
    (lower.includes("radioplan") ||
      lower.includes("flow_radioplan") ||
      lower.includes("grid")) &&
    lower.endsWith(".xlsx")
  )
    return "radioplan";
  if (
    (lower.includes("effektkalkulator") || lower.includes("effektkalk")) &&
    lower.endsWith(".xlsx")
  )
    return "effekt";
  if (lower.includes("tssr") && lower.endsWith(".docx")) return "tssr";
  if (
    (lower.includes("boq") || lower.includes("bill")) &&
    (lower.endsWith(".xlsx") || lower.endsWith(".xlsm"))
  )
    return "boq";
  if (/\.(jpg|jpeg|png|heic|webp)$/i.test(lower)) return "photo";
  return null;
}

function typeLabel(type: DetectedType): string {
  switch (type) {
    case "radioplan":
      return "Radio Plan";
    case "effekt":
      return "Effektkalkulator";
    case "tssr":
      return "Existing TSSR";
    case "boq":
      return "Existing BOQ";
    case "photo":
      return "Photo";
    default:
      return "Other";
  }
}

function typeBadgeColor(type: DetectedType): string {
  switch (type) {
    case "radioplan":
      return "bg-purple-100 text-purple-700";
    case "effekt":
      return "bg-orange-100 text-orange-700";
    case "tssr":
      return "bg-blue-100 text-blue-700";
    case "boq":
      return "bg-green-100 text-green-700";
    case "photo":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

// ── Component ───────────────────────────────────────────────────────

interface OneDriveImportFlowProps {
  onComplete: (projectId: string) => void;
  onCancel: () => void;
}

export const OneDriveImportFlow: React.FC<OneDriveImportFlowProps> = ({
  onComplete,
  onCancel,
}) => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const {
    setParsedRadioPlan,
    setParsedPowerCalc,
    updateTSSRField,
    setOneDriveFolder,
    setProjectId,
    setKickstartPending,
    retryBOQCompute,
  } = useSiteContext();

  const [step, setStep] = useState<FlowStep>("browse");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "OneDrive" },
  ]);

  // Persistent selection across folder navigation
  const [selection, setSelection] = useState<ImportSelection>(emptySelection);
  const [countingPhotos, setCountingPhotos] = useState<string | null>(null); // item id being counted

  const [importProgress, setImportProgress] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [parsedRpData, setParsedRpData] = useState<RadioPlanData | null>(null);

  // ── Browse ──────────────────────────────────────────────────────

  const currentPath = breadcrumbs.map((b) => b.name).join("/");

  const loadFolder = useCallback(
    async (folderId?: string | null, folderName?: string) => {
      setLoading(true);
      try {
        const result = await listFiles(instance, folderId || undefined);
        setItems(result.value || []);
        if (folderId && folderName) {
          setBreadcrumbs((prev) => [
            ...prev,
            { id: folderId, name: folderName },
          ]);
        } else if (!folderId) {
          setBreadcrumbs([{ id: null, name: "OneDrive" }]);
        }
      } catch (err) {
        console.error("Failed to list files:", err);
        toast.error("Failed to load OneDrive folder");
      } finally {
        setLoading(false);
      }
    },
    [instance],
  );

  const navigateTo = useCallback(
    async (index: number) => {
      const target = breadcrumbs[index];
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setLoading(true);
      try {
        const result = await listFiles(instance, target.id || undefined);
        setItems(result.value || []);
      } catch (err) {
        console.error("Navigation failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [instance, breadcrumbs],
  );

  // Auto-load root on mount
  useEffect(() => {
    if (isAuthenticated && items.length === 0 && !loading) {
      loadFolder();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection helpers ─────────────────────────────────────────

  const assignRadioPlan = useCallback(
    (item: DriveItem) => {
      setSelection((prev) => ({
        ...prev,
        radioPlan: { item, path: currentPath + "/" + item.name },
      }));
    },
    [currentPath],
  );

  const assignEffekt = useCallback(
    (item: DriveItem) => {
      setSelection((prev) => ({
        ...prev,
        effekt: { item, path: currentPath + "/" + item.name },
      }));
    },
    [currentPath],
  );

  const assignPhotosFolder = useCallback(
    async (item: DriveItem) => {
      setCountingPhotos(item.id);
      try {
        const result = await listFiles(instance, item.id);
        const files = (result.value || []) as DriveItem[];
        const imageCount = files.filter(
          (f: DriveItem) =>
            f.file && /\.(jpg|jpeg|png|heic|webp)$/i.test(f.name),
        ).length;
        setSelection((prev) => ({
          ...prev,
          photosFolder: {
            item,
            path: currentPath + "/" + item.name,
            imageCount,
          },
        }));
      } catch {
        toast.error("Failed to count photos in folder");
      } finally {
        setCountingPhotos(null);
      }
    },
    [instance, currentPath],
  );

  const assignSiteFolder = useCallback(() => {
    const current = breadcrumbs[breadcrumbs.length - 1];
    setSelection((prev) => ({
      ...prev,
      siteFolder: { id: current.id, path: currentPath },
    }));
  }, [breadcrumbs, currentPath]);

  const clearSelection = useCallback((key: keyof ImportSelection) => {
    setSelection((prev) => ({ ...prev, [key]: null }));
  }, []);

  // ── Import ────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!selection.radioPlan) {
      toast.error("No Radio Plan file assigned");
      return;
    }

    setStep("importing");
    try {
      // 1. Download Radio Plan
      setImportProgress("Downloading Radio Plan...");
      const rpBlob = await downloadFile(instance, selection.radioPlan.item.id);
      const rpBuffer = await rpBlob.arrayBuffer();

      // 2. Parse Radio Plan
      setImportProgress("Parsing Radio Plan...");
      const rpData: RadioPlanData = await parseRadioPlan(rpBuffer);

      // 3. Download & parse Effektkalkulator (optional)
      let pcData: PowerCalcData | null = null;
      if (selection.effekt) {
        setImportProgress("Downloading Effektkalkulator...");
        const ekBlob = await downloadFile(instance, selection.effekt.item.id);
        const ekBuffer = await ekBlob.arrayBuffer();
        setImportProgress("Parsing Effektkalkulator...");
        pcData = await parsePowerCalc(ekBuffer);
      }

      // 4. Create project with OneDrive binding
      setImportProgress("Creating project...");
      const folderId = selection.siteFolder?.id || null;
      const folderPath = selection.siteFolder?.path || "";
      const siteName =
        pcData?.siteInfo.siteName || rpData.project || rpData.siteId;
      const proj = await createProject({
        siteId: rpData.siteId,
        siteName,
        operator: "ICE",
        onedriveFolderId: folderId || undefined,
        onedriveFolderPath: folderPath || undefined,
      });

      // 5. Set up context — set projectId FIRST so TSSR debounce sync has a target
      setProjectId(proj.id);
      setOneDriveFolder(folderId || "", folderPath);

      // 6. Update TSSR fields from parsed data
      updateTSSRField("siteId", rpData.siteId);
      updateTSSRField("siteName", siteName);
      updateTSSRField("sectors", rpData.sectors.length);
      updateTSSRField("config", rpData.config);
      updateTSSRField("radioPlanFile", {
        fileName: selection.radioPlan.item.name,
        fileSize: selection.radioPlan.item.size || 0,
        uploadedAt: Date.now(),
        parsed: true,
        siteId: rpData.siteId,
        project: rpData.project,
        config: rpData.config,
        sectorCount: rpData.sectors.length,
        totalCells: rpData.totalCells,
      });
      updateTSSRField(
        "sectorData",
        rpData.sectors.map((s) => ({
          id: s.id,
          azimuth: s.azimuth,
          mTilt: s.mTilt,
          eTilt: s.eTilt,
          antennas: s.antennas,
          cableRoute: s.feedLength ?? 0,
        })),
      );

      if (pcData && selection.effekt) {
        updateTSSRField("powerCalcFile", {
          fileName: selection.effekt.item.name,
          fileSize: selection.effekt.item.size || 0,
          uploadedAt: Date.now(),
          parsed: true,
          siteId: pcData.siteInfo.siteId,
          siteName: pcData.siteInfo.siteName,
          stationOwner: pcData.siteInfo.stationOwner,
          engineer: pcData.siteInfo.engineer,
          totalNormalPowerW: pcData.results.totalNormalPowerW,
          maxPower80W: pcData.results.maxPower80percentW,
          rectifierModules: pcData.results.rectifierModules,
          batteryStrings2h: pcData.results.batteryStrings2h,
          rectifierOk: pcData.results.rectifierOk,
        });
      }

      // 7. Import photos from selected folder
      if (selection.photosFolder) {
        setImportProgress("Importing photos...");
        try {
          const result = await listFiles(
            instance,
            selection.photosFolder.item.id,
          );
          const imageFiles = ((result.value || []) as DriveItem[]).filter(
            (f: DriveItem) =>
              f.file && /\.(jpg|jpeg|png|heic|webp)$/i.test(f.name),
          );

          if (imageFiles.length > 0) {
            // Get download URLs in parallel (batches of 6 to avoid throttling)
            const photoItems: OneDrivePhotoImportItem[] = [];
            const batchSize = 6;
            for (let i = 0; i < imageFiles.length; i += batchSize) {
              const batch = imageFiles.slice(i, i + batchSize);
              setImportProgress(
                `Importing photos... (${Math.min(i + batchSize, imageFiles.length)}/${imageFiles.length})`,
              );
              const results = await Promise.all(
                batch.map(async (img) => {
                  const meta = await getFileMetadata(instance, img.id);
                  const downloadUrl =
                    meta["@microsoft.graph.downloadUrl"] || meta.webUrl;
                  if (!downloadUrl) return null;
                  return {
                    onedrive_item_id: img.id,
                    filename: img.name,
                    mime_type: img.file?.mimeType || "image/jpeg",
                    download_url: downloadUrl,
                    file_size: img.size || 0,
                  } as OneDrivePhotoImportItem;
                }),
              );
              photoItems.push(
                ...results.filter((r): r is OneDrivePhotoImportItem => !!r),
              );
            }

            if (photoItems.length > 0) {
              await importPhotosFromOneDrive(proj.id, photoItems);
              toast.success(`Imported ${photoItems.length} photos`);
            }
          }
        } catch (err) {
          console.error("Photo import failed:", err);
          toast.warning("Photos could not be imported", {
            description: "You can import them later from the Photos tab.",
          });
        }
      }

      // Hold BOQ compute until kickstart answers are applied
      setKickstartPending(true);

      // Set parsed data (BOQ compute will be skipped because kickstartPending is true)
      setParsedRadioPlan(rpData);
      if (pcData) setParsedPowerCalc(pcData);

      setImportProgress("Done!");
      toast.success("Project created from OneDrive", {
        description: `${rpData.siteId} — ${rpData.sectors.length} sectors`,
      });

      // Store for kickstart and go to kickstart step
      setCreatedProjectId(proj.id);
      setParsedRpData(rpData);
      setStep("kickstart");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Import failed:", err);
      toast.error("Import failed", { description: message });
      setStep("confirm");
    }
  }, [
    instance,
    selection,
    setOneDriveFolder,
    setProjectId,
    updateTSSRField,
    setParsedRadioPlan,
    setParsedPowerCalc,
    setKickstartPending,
  ]);

  // ── Sign in screen ────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8 text-center">
          <CloudOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect to OneDrive
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Sign in with your Microsoft account to browse project files.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onCancel}
              className="h-10 px-4 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                instance.loginRedirect({
                  scopes: [...graphScopes.files, ...graphScopes.user],
                  prompt: "select_account",
                })
              }
              className="h-10 px-6 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Kickstart questionnaire ─────────────────────────────────

  const applyKickstartAndFinish = useCallback(
    (answers: KickstartAnswers | null) => {
      if (answers) {
        updateTSSRField("siteCategory", answers.siteCategory);
        updateTSSRField("craneNeeded", answers.craneNeeded);
        updateTSSRField("roofType", answers.roofType);
        if (answers.deviations) {
          updateTSSRField("additionalNotes", answers.deviations);
        }
        // Cabinet type -> siteModel mapping
        const cabinetMap: Record<string, string> = {
          outdoor_2m: "Outdoor Cabinet 2m",
          "outdoor_1.2m": "Outdoor Cabinet 1.2m",
          indoor_rack: "Indoor Rack",
          coloc: "Colocation",
        };
        updateTSSRField(
          "cabinetType",
          cabinetMap[answers.cabinetType] || answers.cabinetType,
        );
        // Build type affects config prefix: N = new, E = existing
        if (
          answers.buildType === "existing" &&
          parsedRpData?.config.startsWith("N")
        ) {
          updateTSSRField("config", "E" + parsedRpData.config.slice(1));
        }
      }
      // Clear kickstart gate — this allows the BOQ compute useEffect to fire
      setKickstartPending(false);
      retryBOQCompute();
      if (createdProjectId) onComplete(createdProjectId);
    },
    [
      updateTSSRField,
      setKickstartPending,
      retryBOQCompute,
      createdProjectId,
      onComplete,
      parsedRpData,
    ],
  );

  if (step === "kickstart" && createdProjectId && parsedRpData) {
    return (
      <KickstartDialog
        radioPlan={parsedRpData}
        onComplete={(answers) => applyKickstartAndFinish(answers)}
        onSkip={() => applyKickstartAndFinish(null)}
      />
    );
  }

  // ── Importing progress ────────────────────────────────────────

  if (step === "importing") {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <Loader2 className="h-10 w-10 text-teal-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Importing from OneDrive
          </h3>
          <p className="text-sm text-gray-500">{importProgress}</p>
        </div>
      </div>
    );
  }

  // ── Confirm selection ─────────────────────────────────────────

  if (step === "confirm") {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Import
            </h3>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Summary */}
          <div className="px-6 py-5 space-y-3">
            <ConfirmRow
              icon={<Zap className="h-4 w-4 text-purple-600" />}
              label="Radio Plan"
              value={selection.radioPlan?.item.name || null}
              required
            />
            <ConfirmRow
              icon={<Zap className="h-4 w-4 text-orange-600" />}
              label="Effektkalkulator"
              value={selection.effekt?.item.name || null}
            />
            <ConfirmRow
              icon={<Camera className="h-4 w-4 text-pink-600" />}
              label="Photos"
              value={
                selection.photosFolder
                  ? `${selection.photosFolder.item.name}/ (${selection.photosFolder.imageCount} images)`
                  : null
              }
            />
            <ConfirmRow
              icon={<FolderOpen className="h-4 w-4 text-blue-600" />}
              label="Project Folder"
              value={selection.siteFolder?.path || null}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setStep("browse")}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={!selection.radioPlan}
              className="inline-flex items-center gap-2 h-9 px-6 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Import & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Browse folders ────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Browse OneDrive
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1 text-sm overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
              <button
                onClick={() => navigateTo(i)}
                className={`flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-gray-100 ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-gray-900"
                    : "text-gray-500"
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400">Empty folder</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <FileRow
                  key={item.id}
                  item={item}
                  selection={selection}
                  countingPhotos={countingPhotos}
                  onNavigate={loadFolder}
                  onAssignRadioPlan={assignRadioPlan}
                  onAssignEffekt={assignEffekt}
                  onAssignPhotos={assignPhotosFolder}
                  onClearSelection={clearSelection}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selection summary bar */}
        <SelectionSummaryBar
          selection={selection}
          onClear={clearSelection}
          onSetSiteFolder={assignSiteFolder}
          onContinue={() => setStep("confirm")}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

// ── FileRow ─────────────────────────────────────────────────────────

const FileRow: React.FC<{
  item: DriveItem;
  selection: ImportSelection;
  countingPhotos: string | null;
  onNavigate: (folderId: string, folderName: string) => void;
  onAssignRadioPlan: (item: DriveItem) => void;
  onAssignEffekt: (item: DriveItem) => void;
  onAssignPhotos: (item: DriveItem) => void;
  onClearSelection: (key: keyof ImportSelection) => void;
}> = ({
  item,
  selection,
  countingPhotos,
  onNavigate,
  onAssignRadioPlan,
  onAssignEffekt,
  onAssignPhotos,
  onClearSelection,
}) => {
  const isFolder = !!item.folder;
  const isXlsx = item.name.endsWith(".xlsx") || item.name.endsWith(".xlsm");
  const type = !isFolder ? detectFileType(item.name) : null;

  // Check if this item is already assigned
  const isRadioPlan = selection.radioPlan?.item.id === item.id;
  const isEffekt = selection.effekt?.item.id === item.id;
  const isPhotosFolder = selection.photosFolder?.item.id === item.id;
  const isCounting = countingPhotos === item.id;

  const icon = isFolder ? (
    <Folder className="h-5 w-5 text-yellow-500" />
  ) : isXlsx ? (
    <FileSpreadsheet className="h-5 w-5 text-green-600" />
  ) : item.name.endsWith(".docx") ? (
    <FileText className="h-5 w-5 text-blue-600" />
  ) : /\.(jpg|jpeg|png|heic|webp)$/i.test(item.name) ? (
    <ImageIcon className="h-5 w-5 text-pink-500" />
  ) : (
    <FileText className="h-5 w-5 text-gray-400" />
  );

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 ${
        isFolder ? "cursor-pointer" : ""
      }`}
      onClick={() => {
        if (isFolder) onNavigate(item.id, item.name);
      }}
    >
      {icon}
      <span
        className={`flex-1 text-sm truncate ${isFolder ? "font-medium" : ""}`}
      >
        {item.name}
      </span>

      {/* Assignment badges for assigned items */}
      {isRadioPlan && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearSelection("radioPlan");
          }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
        >
          <Check className="h-3 w-3" /> Radio Plan
        </button>
      )}
      {isEffekt && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearSelection("effekt");
          }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
        >
          <Check className="h-3 w-3" /> Effektkalk
        </button>
      )}
      {isPhotosFolder && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearSelection("photosFolder");
          }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-pink-100 text-pink-700 hover:bg-pink-200"
        >
          <Check className="h-3 w-3" /> Photos (
          {selection.photosFolder?.imageCount})
        </button>
      )}

      {/* Hover actions for unassigned xlsx files */}
      {isXlsx && !isRadioPlan && !isEffekt && (
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignRadioPlan(item);
            }}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-600 hover:bg-purple-100"
          >
            Radio Plan
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignEffekt(item);
            }}
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100"
          >
            Effektkalk
          </button>
        </div>
      )}

      {/* Hover action for folders — assign as photos source */}
      {isFolder && !isPhotosFolder && (
        <div className="hidden group-hover:flex items-center gap-1 mr-1">
          {isCounting ? (
            <Loader2 className="h-3.5 w-3.5 text-pink-400 animate-spin" />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssignPhotos(item);
              }}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-pink-50 text-pink-600 hover:bg-pink-100"
            >
              Photos
            </button>
          )}
        </div>
      )}

      {/* Auto-detect badge for non-xlsx files (info only) */}
      {type && !isXlsx && !isFolder && (
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeBadgeColor(type)}`}
        >
          {typeLabel(type)}
        </span>
      )}

      {/* Auto-detect badge for xlsx that are not yet assigned */}
      {type && isXlsx && !isRadioPlan && !isEffekt && (
        <span
          className={`group-hover:hidden text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeBadgeColor(type)}`}
        >
          {typeLabel(type)}
        </span>
      )}

      {isFolder && !isPhotosFolder && (
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:hidden" />
      )}
      {isFolder && !isPhotosFolder && (
        <ChevronRight className="hidden group-hover:block h-4 w-4 text-gray-300" />
      )}
    </div>
  );
};

// ── SelectionSummaryBar ─────────────────────────────────────────────

const SelectionSummaryBar: React.FC<{
  selection: ImportSelection;
  onClear: (key: keyof ImportSelection) => void;
  onSetSiteFolder: () => void;
  onContinue: () => void;
  onCancel: () => void;
}> = ({ selection, onClear, onSetSiteFolder, onContinue, onCancel }) => {
  const hasRadioPlan = !!selection.radioPlan;
  const hasAny = hasRadioPlan || !!selection.effekt || !!selection.photosFolder;

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Selection slots */}
      {hasAny && (
        <div className="px-4 py-2 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Selected for import
          </p>
          {selection.radioPlan && (
            <SelectionRow
              icon={<Zap className="h-3.5 w-3.5 text-purple-600" />}
              label="Radio Plan"
              value={selection.radioPlan.item.name}
              onClear={() => onClear("radioPlan")}
            />
          )}
          {selection.effekt && (
            <SelectionRow
              icon={<Zap className="h-3.5 w-3.5 text-orange-600" />}
              label="Effektkalk"
              value={selection.effekt.item.name}
              onClear={() => onClear("effekt")}
            />
          )}
          {selection.photosFolder && (
            <SelectionRow
              icon={<Camera className="h-3.5 w-3.5 text-pink-600" />}
              label="Photos"
              value={`${selection.photosFolder.item.name}/ (${selection.photosFolder.imageCount} images)`}
              onClear={() => onClear("photosFolder")}
            />
          )}
          {selection.siteFolder && (
            <SelectionRow
              icon={<FolderOpen className="h-3.5 w-3.5 text-blue-600" />}
              label="Project"
              value={selection.siteFolder.path}
              onClear={() => onClear("siteFolder")}
            />
          )}
          {!selection.siteFolder && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="w-16 text-gray-500">Project</span>
              <span className="flex-1">Not set</span>
              <button
                onClick={onSetSiteFolder}
                className="text-blue-600 hover:text-blue-800 text-[10px] font-medium"
              >
                Use current folder
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <button
          onClick={onCancel}
          className="h-9 px-4 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          disabled={!hasRadioPlan}
          className="inline-flex items-center gap-2 h-9 px-6 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ── SelectionRow ────────────────────────────────────────────────────

const SelectionRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  onClear: () => void;
}> = ({ icon, label, value, onClear }) => (
  <div className="flex items-center gap-2 text-xs">
    {icon}
    <span className="w-16 font-medium text-gray-600">{label}</span>
    <span className="flex-1 text-gray-700 truncate">{value}</span>
    <button onClick={onClear} className="p-0.5 hover:bg-gray-200 rounded">
      <X className="h-3 w-3 text-gray-400" />
    </button>
  </div>
);

// ── ConfirmRow ──────────────────────────────────────────────────────

const ConfirmRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | null;
  required?: boolean;
}> = ({ icon, label, value, required }) => (
  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
    {icon}
    <span className="text-sm font-medium text-gray-900 w-32">{label}</span>
    {value ? (
      <>
        <Check className="h-4 w-4 text-green-500" />
        <span className="text-sm text-gray-700 flex-1 truncate">{value}</span>
      </>
    ) : (
      <span className="text-sm text-gray-400 flex-1">
        {required ? "Required" : "Not selected"}
      </span>
    )}
  </div>
);
