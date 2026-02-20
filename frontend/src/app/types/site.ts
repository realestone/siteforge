export interface Site {
  id: string;
  name: string;
  config: string;
  sectors: number;
  size: "Small" | "Medium" | "Large";
  category: "Rooftop" | "Tower" | "Indoor" | "Barn";
  status: "New" | "Draft" | "Complete" | "Warning";
  warningCount?: number;
  lastModified: string;
}

export interface SectorData {
  id: string;
  azimuth: number;
  mTilt: number;
  eTilt: number;
  antennas: string[];
  cableRoute?: number;
}

export type CatalogSection = "product" | "service" | "griptel" | "solar";

export interface BOQItem {
  id: string;
  catalogItemId?: string | null;
  section?: CatalogSection | null;

  // Catalog fields (from backend join)
  productCode: string;
  description: string;
  comments?: string | null;
  orderingHints?: string | null;
  productCategory: string;
  productSubcategory?: string | null;
  vendor?: string | null;

  // Per-project fields
  quantity: number;
  ruleApplied?: string | null;
  isManualOverride?: boolean;
  overrideNote?: string | null;

  // Excel anchor (for export)
  rowIndex?: number | null;
  sheetName?: string | null;

  // UI-only transient state
  previousQuantity?: number;
  isNew?: boolean;
  timestamp?: number;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  description: string;
  itemsChanged: number;
}

export interface RevisionEntry {
  id: string;
  rev: string;
  nr: number;
  name: string;
  company: string;
  type: string;
  date: string;
}

export interface RadioPlanFile {
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  parsed: boolean;
  siteId?: string;
  project?: string;
  config?: string;
  sectorCount?: number;
  totalCells?: number;
}

export interface PowerCalcFile {
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  parsed: boolean;
  siteId?: string;
  siteName?: string;
  stationOwner?: string;
  engineer?: string;
  totalNormalPowerW?: number;
  maxPower80W?: number;
  rectifierModules?: number;
  batteryStrings2h?: number;
  rectifierOk?: boolean;
}

export interface TSSRData {
  // Radio Plan
  radioPlanFile: RadioPlanFile | null;

  // Power Calculator
  powerCalcFile: PowerCalcFile | null;

  // Site Identity
  siteId: string;
  siteName: string;
  operator: string;
  siteModel: string;
  siteType: string;
  customer: string;
  siteOwner: string;

  // Supporting Documents
  siteOwnerOffer: string;
  montasjeunderlag: string;
  sart: string;
  veiviser: string;
  rfsrRnp: string;
  guidelineVersion: string;

  // Access Info
  veiviserComments: string;
  iloqRequired: boolean;
  iloqDetails: string;

  // TSSR Alignment
  tssrAlignment: string;
  tssrAlignmentComments: string;

  // Radio Configuration
  sectors: number;
  size: "Small" | "Medium" | "Large";
  config: string;
  sectorData: SectorData[];

  // Access & Logistics
  siteCategory: "Rooftop" | "Tower" | "Indoor" | "Barn";
  landlordName: string;
  accessInstructions: string;
  craneNeeded: boolean;

  // Revision History
  revisionHistory: RevisionEntry[];

  // Other
  additionalNotes: string;
}

// Photo and Drawing Types

export interface Annotation {
  id: string;
  type: "arrow" | "circle" | "rectangle" | "text" | "line" | "measure";
  color: "red" | "yellow" | "blue" | "white" | "black";
  points: { x: number; y: number }[]; // Start/end for arrows/lines, corners for shapes
  label?: string;
  measureDistance?: number; // For measure tool
}

export interface Photo {
  id: string;
  fileName: string;
  fileUrl: string;
  section?: PhotoSection; // Which TSSR section it belongs to
  sectorId?: string; // For antenna direction photos
  caption?: string;
  annotations: Annotation[];
  exifCompass?: number; // Compass bearing from EXIF
  timestamp: number;
}

export type PhotoSection =
  | "unsorted"
  | "site-overview"
  | "antenna-direction"
  | "equipment-room"
  | "cable-route"
  | "roof-mounting"
  | "power-meter"
  | "grounding"
  | "crane-area"
  | "other";

export interface PhotoSectionBucket {
  id: PhotoSection;
  title: string;
  required: boolean;
  maxPhotos?: number;
  sectorSpecific?: boolean; // For antenna direction photos
}

export interface SketchElement {
  id: string;
  type: "equipment" | "cable" | "building" | "label" | "dimension";
  equipmentType?:
    | "cabinet"
    | "antenna"
    | "rrh"
    | "atoa"
    | "rack"
    | "power"
    | "meter"
    | "ground"
    | "gps";
  cableType?: "tray" | "dc" | "fiber";
  position: { x: number; y: number };
  rotation?: number; // For antennas
  label?: string;
  color?: string;
  points?: { x: number; y: number }[]; // For cables and lines
  width?: number;
  height?: number;
}

export interface SketchData {
  elements: SketchElement[];
  canvasSize: { width: number; height: number };
  gridEnabled: boolean;
  snapEnabled: boolean;
  zoom: number;
  mapView: boolean; // Canvas or Map overlay
  mapCenter?: { lat: number; lng: number };
}

// Workflow and Role Types

export type UserRole =
  | "maker"
  | "checker"
  | "spl"
  | "electrician"
  | "builder"
  | "manager";

export type WorkflowStatus =
  | "draft"
  | "internal-review"
  | "changes-requested"
  | "submitted"
  | "rejected"
  | "approved"
  | "building"
  | "as-built-complete";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  fieldPath?: string; // e.g., "sectorData.0.azimuth" or "boqItems.AHEGB"
  sectionId?: string; // e.g., "site-identity", "radio-config"
  message: string;
  timestamp: number;
  resolved: boolean;
  replies?: Comment[];
}

export interface SectionReview {
  sectionId: string;
  status: "approved" | "needs-changes" | "rejected" | "pending";
  reviewerId?: string;
  reviewerName?: string;
  timestamp?: number;
  comments?: string[];
}

export interface WorkflowTransition {
  id: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  userId: string;
  userName: string;
  timestamp: number;
  note?: string;
}

export interface ElectricalSignOff {
  signedOff: boolean;
  electricianName?: string;
  availableCapacity?: number;
  fuseConfirmed?: boolean;
  comments?: string;
  capacityCheckDocument?: string;
  timestamp?: number;
}

export interface BuilderTask {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: number;
}

export interface AsBuiltPhoto {
  id: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: number;
  category: string;
  notes?: string;
}

export interface ProjectWorkflow {
  status: WorkflowStatus;
  assignedTo?: User;
  assignedAt?: number;
  history: WorkflowTransition[];
  comments: Comment[];
  sectionReviews: SectionReview[];
  electricalSignOff?: ElectricalSignOff;
  builderTasks?: BuilderTask[];
  asBuiltPhotos?: AsBuiltPhoto[];
}
