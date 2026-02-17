import React, { createContext, useContext, useState, useCallback } from "react";
import {
  TSSRData,
  BOQItem,
  ValidationResult,
  ChangeLogEntry,
  SectorData,
  Photo,
  Annotation,
  SketchData,
  SketchElement,
  PhotoSection,
} from "../types/site";
import { toast } from "sonner";

interface SiteContextType {
  tssrData: TSSRData;
  boqItems: BOQItem[];
  validationResults: ValidationResult[];
  changeLog: ChangeLogEntry[];
  recentChanges: Set<string>;
  photos: Photo[];
  sketchData: SketchData;
  updateTSSRField: (field: string, value: any) => void;
  updateSectorData: (index: number, field: string, value: any) => void;
  updateBOQItem: (id: string, quantity: number, isManual?: boolean) => void;
  runValidation: () => void;
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
  siteId: "",
  siteName: "",
  operator: "",
  sectors: 0,
  size: "" as any,
  config: "",
  sectorData: [],
  siteCategory: "" as any,
  landlordName: "",
  accessInstructions: "",
  craneNeeded: false,
  cabinetType: "" as any,
  acdb: "",
  rectifier: "",
  earthing: "",
  hseHazards: [],
  roofType: undefined,
  roofMaterial: undefined,
  roofLoad: 0,
  cableLadderLength: 0,
  mountType: "",
  paintingRequired: false,
  additionalNotes: "",
});

const generateBOQFromTSSR = (tssr: TSSRData): BOQItem[] => {
  const items: BOQItem[] = [];

  // System Modules - based on size and config
  if (tssr.size === "Large") {
    items.push(
      {
        id: "AMIA",
        category: "System Modules",
        name: "AMIA Subrack .205",
        productCode: "AMIA.205",
        quantity: 1,
        unit: "pcs",
        rule: "1 per large config",
      },
      {
        id: "ASIB",
        category: "System Modules",
        name: "ASIB Common .102",
        productCode: "ASIB.102",
        quantity: 1,
        unit: "pcs",
        rule: "1 per site",
      },
      {
        id: "ABIO",
        category: "System Modules",
        name: "ABIO Capacity .102",
        productCode: "ABIO.102",
        quantity: 2,
        unit: "pcs",
        rule: "2 for NLLL config",
      },
      {
        id: "EAC",
        category: "System Modules",
        name: "EAC alarm cable 10m",
        productCode: "EAC-10",
        quantity: 1,
        unit: "pcs",
      },
      {
        id: "ASAL",
        category: "System Modules",
        name: "ASAL EAC cable",
        productCode: "ASAL",
        quantity: 1,
        unit: "pcs",
      },
    );
  }

  // Radios & RRH - based on sectors
  const rrh = tssr.sectors;
  items.push(
    {
      id: "AHEGB",
      category: "Radios & RRH",
      name: "AHEGB HB RRH 320W",
      productCode: "474090A.101",
      quantity: rrh,
      unit: "pcs",
      rule: `1 per sector (${tssr.sectors} sectors)`,
      source: "Nokia",
    },
    {
      id: "AHPMDB",
      category: "Radios & RRH",
      name: "AHPMDB LB RRH 240W",
      productCode: "474091A.101",
      quantity: rrh,
      unit: "pcs",
      rule: `1 per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "AQQY",
      category: "Radios & RRH",
      name: "AQQY MAA n78 240W",
      productCode: "AQQY.240",
      quantity: rrh,
      unit: "pcs",
      rule: `1 per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "AMPF",
      category: "Radios & RRH",
      name: "AMPF downtilt bracket",
      productCode: "AMPF",
      quantity: rrh,
      unit: "pcs",
      rule: `1 per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "SFP10",
      category: "Radios & RRH",
      name: "SFP+ 10G",
      productCode: "SFP-10G",
      quantity: rrh * 4,
      unit: "pcs",
      rule: `4 per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "SFP28",
      category: "Radios & RRH",
      name: "SFP28",
      productCode: "SFP28",
      quantity: rrh * 4,
      unit: "pcs",
      rule: `4 per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "ATOA",
      category: "Radios & RRH",
      name: "ATOA fiber distribution",
      productCode: "ATOA",
      quantity: rrh,
      unit: "pcs",
      rule: `1 per sector (${tssr.sectors} sectors)`,
    },
  );

  // GPS kit for Large configs
  if (tssr.size === "Large") {
    items.push({
      id: "GPS",
      category: "Radios & RRH",
      name: "GPS Kit complete",
      productCode: "GPS-KIT",
      quantity: 1,
      unit: "pcs",
      rule: "Required for Large config",
    });
  }

  // Antennas
  items.push(
    {
      id: "ANT-RRZZ",
      category: "Antennas",
      name: "RRZZ-65B Antenna",
      productCode: "RRZZ-65B",
      quantity: rrh,
      unit: "pcs",
      rule: `1 per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "ANT-JUMPER",
      category: "Antennas",
      name: "Antenna jumper 7/16 3m",
      productCode: "JMP-716-3",
      quantity: rrh * 4,
      unit: "pcs",
      rule: `4 per antenna (${tssr.sectors} antennas)`,
    },
  );

  // Fiber & Optics
  const totalCableRoute = tssr.sectorData.reduce(
    (sum, s) => sum + (s.cableRoute || 0),
    0,
  );
  items.push(
    {
      id: "FIBER-SM",
      category: "Fiber & Optics",
      name: "Single-mode fiber 12-core",
      productCode: "FIB-SM-12",
      quantity: totalCableRoute,
      unit: "m",
      rule: `Total cable route: ${totalCableRoute}m`,
    },
    {
      id: "FIBER-TRUNK",
      category: "Fiber & Optics",
      name: "Fiber trunk connector",
      productCode: "FT-CONN",
      quantity: rrh,
      unit: "pcs",
    },
    {
      id: "FIBER-PATCH",
      category: "Fiber & Optics",
      name: "Fiber patch LC-LC 2m",
      productCode: "FP-LC2",
      quantity: rrh * 4,
      unit: "pcs",
    },
  );

  // Power Equipment - based on cabinet type
  if (tssr.cabinetType === "Indoor") {
    items.push(
      {
        id: "PWR-RECT",
        category: "Power Equipment",
        name: tssr.rectifier,
        productCode: "CTE31242",
        quantity: 1,
        unit: "pcs",
      },
      {
        id: "PWR-ACDB",
        category: "Power Equipment",
        name: tssr.acdb,
        productCode: "ACDB-TN400",
        quantity: 1,
        unit: "pcs",
      },
      {
        id: "PWR-BATT",
        category: "Power Equipment",
        name: "Battery 12V 100Ah",
        productCode: "BAT-12-100",
        quantity: 2,
        unit: "pcs",
        rule: "Standard 2-battery config",
      },
    );
  }

  // Cables
  const dcCableLength = totalCableRoute + 32;
  items.push(
    {
      id: "CABLE-DC6",
      category: "Cables",
      name: "DC cable 6mm\u00B2",
      productCode: "DC-6MM",
      quantity: dcCableLength,
      unit: "m",
      rule: `Cable routes + base: ${dcCableLength}m`,
    },
    {
      id: "CABLE-GND",
      category: "Cables",
      name: "Ground cable 16mm\u00B2",
      productCode: "GND-16MM",
      quantity: 45,
      unit: "m",
    },
  );

  if (tssr.cableLadderLength && tssr.cableLadderLength > 0) {
    items.push({
      id: "CABLE-LADDER",
      category: "Cables",
      name: "Cable ladder 300mm",
      productCode: "CL-300",
      quantity: tssr.cableLadderLength,
      unit: "m",
      rule: `Roof cable ladder: ${tssr.cableLadderLength}m`,
    });
  }

  // Mounting Hardware
  if (tssr.mountType === "Gravitation") {
    items.push(
      {
        id: "MNT-GRAV",
        category: "Mounting Hardware",
        name: "Gravitation mount base",
        productCode: "GM-BASE",
        quantity: rrh,
        unit: "pcs",
        rule: `1 per sector (${tssr.sectors} sectors)`,
      },
      {
        id: "MNT-BALLAST",
        category: "Mounting Hardware",
        name: "Ballast block 50kg",
        productCode: "BB-50",
        quantity: rrh * 4,
        unit: "pcs",
        rule: "4 per gravitation mount",
      },
    );
  }

  items.push(
    {
      id: "MNT-CLAMP",
      category: "Mounting Hardware",
      name: "Antenna clamp set",
      productCode: "AC-SET",
      quantity: rrh,
      unit: "sets",
    },
    {
      id: "MNT-BRACKET",
      category: "Mounting Hardware",
      name: "RRH mounting bracket",
      productCode: "RRH-BRK",
      quantity: rrh,
      unit: "pcs",
    },
  );

  // Services
  items.push(
    {
      id: "SVC-FIBER-INST",
      category: "Services",
      name: "Fiber installation",
      productCode: "SVC-FIB",
      quantity: totalCableRoute,
      unit: "m",
      rule: `Install ${totalCableRoute}m fiber`,
    },
    {
      id: "SVC-DC-INST",
      category: "Services",
      name: "DC cable installation",
      productCode: "SVC-DC",
      quantity: dcCableLength,
      unit: "m",
      rule: `Install ${dcCableLength}m DC cable`,
    },
    {
      id: "SVC-ANT-INST",
      category: "Services",
      name: "Antenna installation",
      productCode: "SVC-ANT",
      quantity: rrh,
      unit: "pcs",
    },
    {
      id: "SVC-RRH-INST",
      category: "Services",
      name: "RRH installation & config",
      productCode: "SVC-RRH",
      quantity: rrh,
      unit: "pcs",
    },
    {
      id: "SVC-COMMISSIONING",
      category: "Services",
      name: "Site commissioning",
      productCode: "SVC-COMM",
      quantity: 1,
      unit: "site",
    },
    {
      id: "SVC-TESTING",
      category: "Services",
      name: "Walk test & optimization",
      productCode: "SVC-TEST",
      quantity: tssr.sectors * 3,
      unit: "tests",
      rule: `3 tests per sector (${tssr.sectors} sectors)`,
    },
    {
      id: "SVC-TECH-HOURS",
      category: "Services",
      name: "Telecom technician hours",
      productCode: "SVC-TECH",
      quantity: 12,
      unit: "hours",
    },
  );

  // Painting if required
  if (tssr.paintingRequired && tssr.paintingColor) {
    items.push({
      id: "SVC-PAINT",
      category: "Additional Services",
      name: `Painting ${tssr.paintingColor}`,
      productCode: "SVC-PAINT",
      quantity: rrh,
      unit: "items",
      rule: `Paint ${rrh} sectors`,
    });
  }

  return items;
};

const validateTSSR = (tssr: TSSRData, boq: BOQItem[]): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // V001: Config string matches sector count
  const expectedConfig =
    tssr.sectors === 3 ? "NLLL_" : tssr.sectors === 2 ? "NLL_" : "NM_";
  if (tssr.config === expectedConfig) {
    results.push({
      id: "V001",
      type: "success",
      code: "V001",
      message: "Config string matches sector count",
    });
  } else {
    results.push({
      id: "V001",
      type: "error",
      code: "V001",
      message: `Config string mismatch: Expected ${expectedConfig} for ${tssr.sectors} sectors, got ${tssr.config}`,
      fields: ["config", "sectors"],
    });
  }

  // V002: RRH quantities match sector config
  const rrhItem = boq.find((item) => item.id === "AHEGB");
  if (rrhItem && rrhItem.quantity === tssr.sectors) {
    results.push({
      id: "V002",
      type: "success",
      code: "V002",
      message: "RRH quantities match sector config",
    });
  }

  // V003: GPS kit check for Large configs
  const gpsItem = boq.find((item) => item.id === "GPS");
  if (tssr.size === "Large") {
    if (gpsItem && gpsItem.quantity > 0) {
      results.push({
        id: "V003",
        type: "success",
        code: "V003",
        message: "GPS kit complete (Large config)",
      });
    } else {
      results.push({
        id: "V003",
        type: "error",
        code: "V003",
        message: "GPS kit required for Large configuration",
        fields: ["size"],
      });
    }
  }

  // V004: ACDB type matches earthing system
  if (tssr.acdb.includes("TN") && tssr.earthing.includes("TN")) {
    results.push({
      id: "V004",
      type: "success",
      code: "V004",
      message: "ACDB type matches earthing system",
    });
  }

  // V005: Jumper count matches antenna ports
  const jumperItem = boq.find((item) => item.id === "ANT-JUMPER");
  if (jumperItem && jumperItem.quantity === tssr.sectors * 4) {
    results.push({
      id: "V005",
      type: "success",
      code: "V005",
      message: "Jumper count matches antenna ports",
    });
  }

  // V012: DC cable material vs install service check
  const dcCableItem = boq.find((item) => item.id === "CABLE-DC6");
  const dcInstallItem = boq.find((item) => item.id === "SVC-DC-INST");
  if (dcCableItem && dcInstallItem) {
    const diff = Math.abs(dcCableItem.quantity - dcInstallItem.quantity);
    if (diff > 0 && diff < 5) {
      results.push({
        id: "V012",
        type: "warning",
        code: "V012",
        message: `DC cable 6mm\u00B2 material (${dcCableItem.quantity}m) \u2260 install service (${dcInstallItem.quantity}m). Difference: ${diff}m.`,
        fields: ["CABLE-DC6", "SVC-DC-INST"],
      });
    }
  }

  // V015: Walk test count check
  const testItem = boq.find((item) => item.id === "SVC-TESTING");
  if (testItem) {
    const expected = tssr.sectors * 3;
    const min = tssr.sectors * 2;
    const max = tssr.sectors * 3;
    if (testItem.quantity >= min && testItem.quantity <= max) {
      if (testItem.quantity > expected) {
        results.push({
          id: "V015",
          type: "warning",
          code: "V015",
          message: `Walk test count (${testItem.quantity}) seems high for ${tssr.sectors} sectors. Typical: ${min}-${max}. Current value is within range.`,
        });
      }
    }
  }

  return results;
};

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tssrData, setTssrData] = useState<TSSRData>(getDefaultTSSRData());
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sketchData, setSketchData] = useState<SketchData>({
    elements: [],
    canvasSize: { width: 1000, height: 800 },
    gridEnabled: true,
    snapEnabled: true,
    zoom: 1,
    mapView: false,
  });

  // BOQ starts empty — will be populated from backend

  const runValidation = useCallback(() => {
    const results = validateTSSR(tssrData, boqItems);
    setValidationResults(results);
  }, [tssrData, boqItems]);

  const updateTSSRField = useCallback(
    (field: string, value: any) => {
      setTssrData((prev) => {
        const updated = { ...prev, [field]: value };

        // Handle cascading updates
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
                antenna: "",
                cableRoute: 0,
              });
            }
            updated.sectorData = newSectorData;
          } else if (newSectors < currentSectors) {
            updated.sectorData = prev.sectorData.slice(0, newSectors);
          }

          // Update config string
          if (newSectors === 3) updated.config = "NLLL_";
          else if (newSectors === 2) updated.config = "NLL_";
          else updated.config = "NM_";
        }

        if (field === "siteCategory") {
          if (value === "Indoor") {
            updated.cabinetType = "Indoor";
            updated.acdb = "TN-400V-1B";
            updated.rectifier = "CTE31242 Indoor";
            updated.earthing = "400 TN";
            updated.hseHazards = ["Confined space", "Electrical hazard"];
            updated.roofType = undefined;
            updated.roofMaterial = undefined;
            updated.cableLadderLength = undefined;
          } else if (value === "Rooftop") {
            updated.hseHazards = ["Fall risk", "Slippery roof", "Roof access"];
            updated.roofType = "Flat";
            updated.roofMaterial = "Concrete";
            updated.cableLadderLength = 0;
            updated.towerHeight = undefined;
          } else if (value === "Tower") {
            updated.hseHazards = ["Fall risk", "Height work", "Climbing"];
            updated.towerHeight = 0;
            updated.roofType = undefined;
            updated.roofMaterial = undefined;
          }
        }

        if (field === "cabinetType") {
          if (value === "Indoor") {
            updated.acdb = "TN-400V-1B";
            updated.rectifier = "CTE31242 Indoor";
            updated.earthing = "400 TN";
          } else {
            updated.acdb = "TT-230V-1B";
            updated.rectifier = "CTE31242 Outdoor";
            updated.earthing = "230 TT";
          }
        }

        // Regenerate BOQ
        const newBOQ = generateBOQFromTSSR(updated);

        // Track changes
        const changedItems = newBOQ.filter((newItem) => {
          const oldItem = boqItems.find((b) => b.id === newItem.id);
          if (!oldItem) {
            newItem.isNew = true;
            newItem.timestamp = Date.now();
            return true;
          }
          if (oldItem.quantity !== newItem.quantity) {
            newItem.previousQuantity = oldItem.quantity;
            newItem.timestamp = Date.now();
            return true;
          }
          return false;
        });

        if (changedItems.length > 0) {
          setRecentChanges(new Set(changedItems.map((i) => i.id)));
          setTimeout(() => setRecentChanges(new Set()), 5000);

          if (changedItems.length > 5) {
            toast.success(`${changedItems.length} BOQ items updated`, {
              description: `${changedItems.filter((i) => i.isNew).length} new items added`,
            });
          }

          const logEntry: ChangeLogEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString("nb-NO", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            description: `${field}: ${prev[field as keyof TSSRData]} \u2192 ${value}`,
            itemsChanged: changedItems.length,
          };
          setChangeLog((prevLog) => [logEntry, ...prevLog]);
        }

        setBoqItems(newBOQ);

        setTimeout(() => {
          const results = validateTSSR(updated, newBOQ);
          setValidationResults(results);
        }, 100);

        return updated;
      });
    },
    [boqItems],
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

        const newBOQ = generateBOQFromTSSR(updated);
        setBoqItems(newBOQ);

        setTimeout(() => {
          const results = validateTSSR(updated, newBOQ);
          setValidationResults(results);
        }, 100);

        return updated;
      });
    },
    [],
  );

  const updateBOQItem = useCallback(
    (id: string, quantity: number, isManual = false) => {
      setBoqItems((prev) => {
        return prev.map((item) => {
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
        });
      });

      if (isManual) {
        toast.warning("Manual override applied", {
          description: `BOQ item ${id} quantity manually set to ${quantity}`,
        });
      }
    },
    [],
  );

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
        boqItems,
        validationResults,
        changeLog,
        recentChanges,
        photos,
        sketchData,
        updateTSSRField,
        updateSectorData,
        updateBOQItem,
        runValidation,
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
