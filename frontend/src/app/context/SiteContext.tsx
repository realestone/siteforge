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
  PhotoSection,
} from "../types/site";
import {
  searchCatalog,
  getProjectBOQ,
  getProjectTSSR,
  updateProjectTSSR,
  addBOQItem as apiAddBOQItem,
  updateBOQItem as apiUpdateBOQItem,
  removeBOQItem as apiRemoveBOQItem,
  computeBOQ as apiComputeBOQ,
  type CatalogItem,
  type BOQItemFromAPI,
  type ComputedBOQItem,
} from "../api/client";
import { type RadioPlanData } from "../lib/radio-plan-parser";
import { type PowerCalcData } from "../lib/power-calc-parser";
import { computeBOQFromImports } from "../lib/boq-rules";
import { toast } from "sonner";

interface SiteContextType {
  tssrData: TSSRData;
  parsedRadioPlan: RadioPlanData | null;
  setParsedRadioPlan: (data: RadioPlanData | null) => void;
  parsedPowerCalc: PowerCalcData | null;
  setParsedPowerCalc: (data: PowerCalcData | null) => void;
  boqItems: BOQItem[];
  changeLog: ChangeLogEntry[];
  recentChanges: Set<string>;
  photos: Photo[];
  sketchData: SketchData;
  projectId: string | null;
  backendConnected: boolean;
  updateTSSRField: (field: string, value: any) => void;
  updateSectorData: (index: number, field: string, value: any) => void;
  updateBOQItemQuantity: (
    id: string,
    quantity: number,
    isManual?: boolean,
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
  setProjectId: (id: string | null) => void;
  addPhotos: (files: File[]) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  deletePhoto: (photoId: string) => void;
  movePhotoToSection: (
    photoId: string,
    section: PhotoSection,
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
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [sketchData, setSketchData] = useState<SketchData>({
    elements: [],
    canvasSize: { width: 1000, height: 800 },
    gridEnabled: true,
    snapEnabled: true,
    zoom: 1,
    mapView: false,
  });

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
    } catch (err) {
      console.error("Failed to load TSSR data:", err);
    }
  }, []);

  // Debounced sync of TSSR data to backend
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tssrDataRef = useRef(tssrData);
  tssrDataRef.current = tssrData;

  const syncTSSRToBackend = useCallback(() => {
    if (!projectId || !backendConnected) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        await updateProjectTSSR(projectId, tssrDataRef.current);
      } catch (err) {
        console.error("Failed to sync TSSR to backend:", err);
      }
    }, 800); // 800ms debounce
  }, [projectId, backendConnected]);

  // TODO: Load project from URL param or project selection

  // Recompute BOQ items when import data changes
  // Backend path: POST parsed radio plan → dependency engine → catalog resolution
  // Fallback: frontend-only rules (no catalog descriptions/row positions)
  useEffect(() => {
    if (!parsedRadioPlan && !parsedPowerCalc) return;

    let cancelled = false;

    const computeViaBackend = async () => {
      if (!projectId || !backendConnected || !parsedRadioPlan) return false;
      try {
        const response = await apiComputeBOQ(projectId, parsedRadioPlan);
        if (cancelled) return true;
        const items: BOQItem[] = response.items.map(
          (item: ComputedBOQItem) => ({
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
          }),
        );
        setBoqItems((prev) => {
          const manualItems = prev.filter((i) => i.isManualOverride);
          return [...items, ...manualItems];
        });
        return true;
      } catch (err) {
        console.warn(
          "Backend BOQ compute failed, falling back to frontend rules:",
          err,
        );
        return false;
      }
    };

    computeViaBackend().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        // Fallback: frontend-only computation (no catalog resolution)
        const ruleItems = computeBOQFromImports(
          parsedRadioPlan,
          parsedPowerCalc,
        );
        setBoqItems((prev) => {
          const manualItems = prev.filter((item) => item.isManualOverride);
          return [...ruleItems, ...manualItems];
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [parsedRadioPlan, parsedPowerCalc, projectId, backendConnected]);

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

  const addPhotos = useCallback((files: File[]) => {
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
  }, []);

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

  const deletePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  }, []);

  const movePhotoToSection = useCallback(
    (photoId: string, section: PhotoSection, sectorId?: string) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, section, sectorId } : photo,
        ),
      );
    },
    [],
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
        boqItems,
        changeLog,
        recentChanges,
        photos,
        sketchData,
        projectId,
        backendConnected,
        updateTSSRField,
        updateSectorData,
        updateBOQItemQuantity,
        addCatalogItemToProject,
        removeBOQItemFromProject,
        searchCatalogItems,
        loadProjectBOQ,
        setProjectId,
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
