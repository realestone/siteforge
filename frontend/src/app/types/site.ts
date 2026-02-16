export interface Site {
  id: string;
  name: string;
  config: string;
  sectors: number;
  size: 'Small' | 'Medium' | 'Large';
  category: 'Rooftop' | 'Tower' | 'Indoor' | 'Barn';
  status: 'New' | 'Draft' | 'Complete' | 'Warning';
  warningCount?: number;
  lastModified: string;
}

export interface SectorData {
  id: string;
  azimuth: number;
  mTilt: number;
  eTilt: number;
  antenna: string;
  cableRoute?: number;
}

export interface BOQItem {
  id: string;
  category: string;
  name: string;
  productCode: string;
  quantity: number;
  unit: string;
  rule?: string;
  source?: string;
  comment?: string;
  isManualOverride?: boolean;
  previousQuantity?: number;
  isNew?: boolean;
  timestamp?: number;
}

export interface ValidationResult {
  id: string;
  type: 'error' | 'warning' | 'success';
  code: string;
  message: string;
  fields?: string[];
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  description: string;
  itemsChanged: number;
}

export interface TSSRData {
  // Site Identity
  siteId: string;
  siteName: string;
  operator: string;
  
  // Radio Configuration
  sectors: number;
  size: 'Small' | 'Medium' | 'Large';
  config: string;
  sectorData: SectorData[];
  
  // Access & Logistics
  siteCategory: 'Rooftop' | 'Tower' | 'Indoor' | 'Barn';
  landlordName: string;
  accessInstructions: string;
  craneNeeded: boolean;
  
  // Cabinet & Power
  cabinetType: 'Indoor' | 'Outdoor';
  acdb: string;
  rectifier: string;
  earthing: string;
  
  // HSE
  hseHazards: string[];
  
  // Building Info
  roofType?: string;
  roofMaterial?: string;
  roofLoad?: number;
  towerHeight?: number;
  
  // Cable Routing
  cableLadderLength?: number;
  verticalCableRoute?: number;
  
  // Antenna Mounting
  mountType: string;
  
  // Services
  paintingRequired: boolean;
  paintingColor?: string;
  
  // Other
  additionalNotes: string;
}

// Photo and Drawing Types

export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text' | 'line' | 'measure';
  color: 'red' | 'yellow' | 'blue' | 'white' | 'black';
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
  | 'unsorted'
  | 'site-overview'
  | 'antenna-direction'
  | 'equipment-room'
  | 'cable-route'
  | 'roof-mounting'
  | 'power-meter'
  | 'grounding'
  | 'crane-area'
  | 'other';

export interface PhotoSectionBucket {
  id: PhotoSection;
  title: string;
  required: boolean;
  maxPhotos?: number;
  sectorSpecific?: boolean; // For antenna direction photos
}

export interface SketchElement {
  id: string;
  type: 'equipment' | 'cable' | 'building' | 'label' | 'dimension';
  equipmentType?: 'cabinet' | 'antenna' | 'rrh' | 'atoa' | 'rack' | 'power' | 'meter' | 'ground' | 'gps';
  cableType?: 'tray' | 'dc' | 'fiber';
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

export type UserRole = 'maker' | 'checker' | 'spl' | 'electrician' | 'builder' | 'manager';

export type WorkflowStatus = 
  | 'draft'
  | 'internal-review'
  | 'changes-requested'
  | 'submitted'
  | 'rejected'
  | 'approved'
  | 'building'
  | 'as-built-complete';

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
  status: 'approved' | 'needs-changes' | 'rejected' | 'pending';
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