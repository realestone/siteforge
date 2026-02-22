// TSSR-aligned photo categories for site documentation
// Maps to real TSSR document sections (§1–§5 + Appendix)

export type TSSRPhotoCategory =
  | "unsorted"
  | "site_overview" // §1 — aerial/overview with planned work marked
  | "delivery_access" // §1.1 — crane position, parking, delivery route
  | "hse_illustration" // §1.2 — safety zones, PPE requirements
  | "cable_route" // §3.5 — cable path from entry to equipment
  | "power_diagram" // §3.6 — DCDU/PDU/fuse panel
  | "radio_plan_screenshot" // §4.3 — radio plan screenshot
  | "effekt_screenshot" // §4.3 — power calculator screenshot
  | "antenna_azimuth" // §5.1 — per-sector azimuth photos
  | "antenna_placement" // §5.2 — antenna height/distance
  | "equipment_room" // §5.3 — cabinet area, rack space
  | "site_plan" // §5.4 — full site layout
  | "structural_calc" // §5.5 — MAFI/ESICS structural
  | "building_photos" // Appendix — exterior building photos
  | "detail_photos" // Appendix — close-up detail shots
  | "other";

export interface PhotoCategoryConfig {
  id: TSSRPhotoCategory;
  label: string;
  tssrSection: string;
  required: boolean;
  sectorSpecific: boolean;
  minPhotos: number;
  maxPhotos: number;
  needsAnnotation: boolean;
  description: string;
  icon: string;
}

export const PHOTO_CATEGORIES: PhotoCategoryConfig[] = [
  {
    id: "site_overview",
    label: "Site Overview",
    tssrSection: "§1",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 4,
    needsAnnotation: true,
    description: "Aerial or wide-angle photo with planned work areas marked",
    icon: "Map",
  },
  {
    id: "delivery_access",
    label: "Delivery & Access",
    tssrSection: "§1.1",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 6,
    needsAnnotation: false,
    description: "Crane position, parking area, delivery route, access path",
    icon: "Truck",
  },
  {
    id: "hse_illustration",
    label: "HSE Illustration",
    tssrSection: "§1.2",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 4,
    needsAnnotation: true,
    description: "Safety zones, fall protection, PPE requirements",
    icon: "ShieldAlert",
  },
  {
    id: "cable_route",
    label: "Cable Route",
    tssrSection: "§3.5",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 8,
    needsAnnotation: true,
    description: "Cable path from building entry to equipment room and up to antennas",
    icon: "Cable",
  },
  {
    id: "power_diagram",
    label: "Power Diagram",
    tssrSection: "§3.6",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 4,
    needsAnnotation: false,
    description: "DCDU, PDU, fuse panel, power distribution",
    icon: "Zap",
  },
  {
    id: "radio_plan_screenshot",
    label: "Radio Plan Screenshot",
    tssrSection: "§4.3",
    required: false,
    sectorSpecific: false,
    minPhotos: 0,
    maxPhotos: 2,
    needsAnnotation: false,
    description: "Screenshot from radio planning tool (auto-imported)",
    icon: "Radio",
  },
  {
    id: "effekt_screenshot",
    label: "Effekt Screenshot",
    tssrSection: "§4.3",
    required: false,
    sectorSpecific: false,
    minPhotos: 0,
    maxPhotos: 2,
    needsAnnotation: false,
    description: "Screenshot from power calculator (auto-imported)",
    icon: "Calculator",
  },
  {
    id: "antenna_azimuth",
    label: "Antenna Azimuth",
    tssrSection: "§5.1",
    required: true,
    sectorSpecific: true,
    minPhotos: 1,
    maxPhotos: 12,
    needsAnnotation: true,
    description: "Per-sector azimuth direction photos with compass bearing",
    icon: "Compass",
  },
  {
    id: "antenna_placement",
    label: "Antenna Placement",
    tssrSection: "§5.2",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 8,
    needsAnnotation: true,
    description: "Antenna mounting height, distance between antennas, bracket details",
    icon: "Antenna",
  },
  {
    id: "equipment_room",
    label: "Equipment Room",
    tssrSection: "§5.3",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 8,
    needsAnnotation: false,
    description: "Cabinet area, rack space, floor plan with equipment positions",
    icon: "Server",
  },
  {
    id: "site_plan",
    label: "Site Plan",
    tssrSection: "§5.4",
    required: true,
    sectorSpecific: false,
    minPhotos: 1,
    maxPhotos: 4,
    needsAnnotation: true,
    description: "Full site layout showing all equipment and cable routes",
    icon: "LayoutDashboard",
  },
  {
    id: "structural_calc",
    label: "Structural Calculation",
    tssrSection: "§5.5",
    required: false,
    sectorSpecific: false,
    minPhotos: 0,
    maxPhotos: 4,
    needsAnnotation: false,
    description: "MAFI or ESICS structural analysis screenshots",
    icon: "Calculator",
  },
  {
    id: "building_photos",
    label: "Building Photos",
    tssrSection: "Appendix",
    required: true,
    sectorSpecific: false,
    minPhotos: 2,
    maxPhotos: 12,
    needsAnnotation: false,
    description: "Exterior building views from multiple angles",
    icon: "Building2",
  },
  {
    id: "detail_photos",
    label: "Detail Photos",
    tssrSection: "Appendix",
    required: false,
    sectorSpecific: false,
    minPhotos: 0,
    maxPhotos: 20,
    needsAnnotation: false,
    description: "Close-up shots of connections, labels, damage, existing equipment",
    icon: "Focus",
  },
  {
    id: "other",
    label: "Other",
    tssrSection: "",
    required: false,
    sectorSpecific: false,
    minPhotos: 0,
    maxPhotos: 50,
    needsAnnotation: false,
    description: "Miscellaneous photos not fitting other categories",
    icon: "Image",
  },
];

export const REQUIRED_CATEGORIES = PHOTO_CATEGORIES.filter((c) => c.required);

/**
 * Generate a standardized filename for a photo based on its category and position.
 * Format: {siteId}_{category}_{sector?}_{sequence}.{ext}
 * Example: OSL0042_antenna_azimuth_A_01.jpg
 */
export function getAutoFilename(
  siteId: string,
  category: TSSRPhotoCategory,
  sectorId: string | undefined,
  sequence: number,
  ext: string,
): string {
  const prefix = siteId || "SITE";
  const seq = String(sequence).padStart(2, "0");
  const sectorPart = sectorId ? `_${sectorId}` : "";
  const cleanExt = ext.startsWith(".") ? ext.slice(1) : ext;
  return `${prefix}_${category}${sectorPart}_${seq}.${cleanExt}`;
}

/**
 * Get the category config for a given category ID.
 */
export function getCategoryConfig(
  id: TSSRPhotoCategory,
): PhotoCategoryConfig | undefined {
  return PHOTO_CATEGORIES.find((c) => c.id === id);
}
