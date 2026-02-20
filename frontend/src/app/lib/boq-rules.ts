/**
 * BOQ dependency rules engine.
 *
 * Computes BOQ item quantities from parsed Radio Plan and Power Calculator data.
 * Each rule maps import data → a product code + quantity.
 *
 * Rules return null when they don't apply (e.g. no LTE cells found).
 */

import type { RadioPlanData } from "./radio-plan-parser";
import type { PowerCalcData } from "./power-calc-parser";
import type { BOQItem } from "../types/site";

export interface BOQRuleResult {
  productCode: string;
  description: string;
  quantity: number;
  section: "product" | "service" | "griptel" | "solar";
  productCategory: string;
  productSubcategory?: string;
  ruleApplied: string;
}

// ── Individual rules ────────────────────────────────────────────

/**
 * ice_PM_004 — Walk test, 2 frequency per sector
 * Quantity = total LTE cell count from radio plan
 */
function ruleWalkTest(rp: RadioPlanData): BOQRuleResult | null {
  const lteCount = rp.rawRows.filter((c) => c.technology === "LTE").length;
  if (lteCount === 0) return null;
  return {
    productCode: "ice_PM_004",
    description: "Walk test, 2 frequency per sector",
    quantity: lteCount,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Project Management",
    ruleApplied: `LTE cells: ${lteCount}`,
  };
}

// ── Config-driven site setup rules ──────────────────────────────

/**
 * Site setup items — fixed quantities based on config string.
 * These are hardware modules required for a new site deployment.
 */
interface ConfigItem {
  productCode: string;
  description: string;
  quantity: number;
  productSubcategory: string;
}

const NLLL_SETUP_ITEMS: ConfigItem[] = [
  {
    productCode: "475266B.102",
    description: "ABIO AirScale Capacity .102",
    quantity: 2,
    productSubcategory: "ABIO",
  },
  {
    productCode: "473764A.102",
    description: "ASIB AirScale Common .102",
    quantity: 1,
    productSubcategory: "ASIB",
  },
  {
    productCode: "473098A.205",
    description: "AMIA AirScale Subrack .205",
    quantity: 1,
    productSubcategory: "AMIA",
  },
  {
    productCode: "474090A.101",
    description: "AHEGB AIRSCALE DUAL RRH 4T4R B13 320W",
    quantity: 3,
    productSubcategory: "AHEGB",
  },
  {
    productCode: "475000A.101",
    description: "AHPMDB AirScale RRH 2T4R B82028 240W",
    quantity: 3,
    productSubcategory: "AHPMDB",
  },
  {
    productCode: "475573A.103",
    description: "AQQY AIRSCALE MAA 32T32R 128AE N78 240W .103",
    quantity: 3,
    productSubcategory: "AQQY",
  },
  {
    productCode: "475151A.102",
    description: "AOPC SFP Weatherproofing Boot Kit",
    quantity: 12,
    productSubcategory: "AOPC",
  },
  {
    productCode: "474283A.101",
    description: "APPC Airscale2 55A DC plug 10-16mm2",
    quantity: 9,
    productSubcategory: "APPC",
  },
];

const CONFIG_SETUP_MAP: Record<string, ConfigItem[]> = {
  NLLL_: NLLL_SETUP_ITEMS,
};

function rulesSiteSetup(rp: RadioPlanData): BOQRuleResult[] {
  const items = CONFIG_SETUP_MAP[rp.config];
  if (!items) return [];
  return items.map((item) => ({
    productCode: item.productCode,
    description: item.description,
    quantity: item.quantity,
    section: "product" as const,
    productCategory: "System module",
    productSubcategory: item.productSubcategory,
    ruleApplied: `Config: ${rp.config}`,
  }));
}

// ── Installation service rules (NLLL_ config) ──────────────────

/**
 * ice_RM_002 — System module installation (BBU)
 * Always 1 for NLLL_ config
 */
function ruleBbuInstall(rp: RadioPlanData): BOQRuleResult | null {
  if (rp.config !== "NLLL_") return null;
  return {
    productCode: "ice_RM_002",
    description: "System module installation (BBU)",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Radio Module",
    ruleApplied: `Config: ${rp.config}`,
  };
}

/**
 * ice_RM_003 — RRH/RRU installation
 * Count of RRH units in config (AHEGB 3 + AHPMDB 3 = 6 for NLLL_)
 */
function ruleRrhInstall(rp: RadioPlanData): BOQRuleResult | null {
  if (rp.config !== "NLLL_") return null;
  const rrhCount = NLLL_SETUP_ITEMS.filter((i) =>
    ["AHEGB", "AHPMDB"].includes(i.productSubcategory || ""),
  ).reduce((sum, i) => sum + i.quantity, 0);
  if (rrhCount === 0) return null;
  return {
    productCode: "ice_RM_003",
    description: "RRH/RRU installation",
    quantity: rrhCount,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Radio Module",
    ruleApplied: `RRH units: ${rrhCount}`,
  };
}

// ── Antenna & downtilt rules (from radio plan) ─────────────────

/**
 * Antenna — read from radio plan sectors.
 * All sectors share the same antenna type → qty = sector count.
 * Product code comes from the radio plan antennaType field.
 */
function rulesAntenna(rp: RadioPlanData): BOQRuleResult[] {
  // Collect unique antenna types across sectors with their counts
  const antennaCount = new Map<string, number>();
  for (const sector of rp.sectors) {
    for (const ant of sector.antennas) {
      if (!ant) continue;
      antennaCount.set(ant, (antennaCount.get(ant) || 0) + 1);
    }
  }
  return Array.from(antennaCount.entries()).map(([antenna, qty]) => ({
    productCode: antenna,
    description: `ANTENNA ${antenna}`,
    quantity: qty,
    section: "product" as const,
    productCategory: "System module",
    productSubcategory: "Antenna",
    ruleApplied: `Radio plan antenna: ${qty} sectors`,
  }));
}

/**
 * BSA-DT-34 — Downtilt Kit (Andrew)
 * Needed when at least one sector has mechanical tilt > 0.
 * Quantity = number of sectors with mTilt > 0.
 */
function ruleDowntiltKit(rp: RadioPlanData): BOQRuleResult | null {
  const sectorsWithMTilt = rp.sectors.filter(
    (s) => s.mTilt !== null && s.mTilt > 0,
  ).length;
  if (sectorsWithMTilt === 0) return null;
  return {
    productCode: "BSA-DT-34",
    description:
      "Downtilt Kit_Andrew — Wide Profile Antenna Downtilt Mounting Kit",
    quantity: sectorsWithMTilt,
    section: "product",
    productCategory: "System module",
    productSubcategory: "Antenna",
    ruleApplied: `Sectors with mech tilt > 0: ${sectorsWithMTilt}`,
  };
}

// ── New site rules (config starts with "N") ─────────────────────

/**
 * ice_TSS_001 — TSS report on new RT site
 * Always quantity 1 for any new site (config starts with "N")
 */
function ruleTssReport(rp: RadioPlanData): BOQRuleResult | null {
  if (!rp.config.startsWith("N")) return null;
  return {
    productCode: "ice_TSS_001",
    description: "TSS report on new RT site",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "TSS",
    ruleApplied: `New site: ${rp.config}`,
  };
}

// ── Travel rules (derived from site ID region) ──────────────────

/**
 * Site ID prefix → region code mapping.
 * MOR = region 04, etc. Extend as needed.
 */
const SITE_PREFIX_TO_REGION: Record<string, string> = {
  MOR: "04",
};

function getRegion(siteId: string): string | null {
  const prefix = siteId.slice(0, 3).toUpperCase();
  return SITE_PREFIX_TO_REGION[prefix] || null;
}

/**
 * ice_T&T_004 — Travel (1 man) within region
 * ice_T&T_009 — Travel (team) within region
 */
function rulesTravel(rp: RadioPlanData): BOQRuleResult[] {
  const region = getRegion(rp.siteId);
  if (!region) return [];
  return [
    {
      productCode: "ice_T&T_004",
      description: `Travel (1 man) within region ${region}`,
      quantity: 1,
      section: "service",
      productCategory: "Service items",
      productSubcategory: "Travel & Transport",
      ruleApplied: `Region ${region} (${rp.siteId.slice(0, 3)})`,
    },
    {
      productCode: "ice_T&T_009",
      description: `Travel (team) within region ${region}`,
      quantity: 11,
      section: "service",
      productCategory: "Service items",
      productSubcategory: "Travel & Transport",
      ruleApplied: `Region ${region} (${rp.siteId.slice(0, 3)})`,
    },
  ];
}

// ── Large config rules (GPS kit) ─────────────────────────────────

const GPS_KIT_ITEMS: ConfigItem[] = [
  {
    productCode: "471605A.102",
    description: "FYMA GPS MOUNTING KIT",
    quantity: 1,
    productSubcategory: "FYMA",
  },
  {
    productCode: "472577A.103",
    description: "FTSH GPS cable assembly 100m",
    quantity: 1,
    productSubcategory: "FTSH",
  },
  {
    productCode: "475647A.101",
    description: "AYGE GNSS Dual Band Receiver w Antenna",
    quantity: 1,
    productSubcategory: "AYGE",
  },
  {
    productCode: "471812A.105",
    description: "FYEA GPS Surge Protector Kit",
    quantity: 1,
    productSubcategory: "FYEA",
  },
];

/**
 * GPS kit — only for Large configs (3 sectors = "L" count >= 3).
 */
function rulesGpsKit(rp: RadioPlanData): BOQRuleResult[] {
  const lCount = (rp.config.match(/L/g) || []).length;
  if (lCount < 3) return [];
  return GPS_KIT_ITEMS.map((item) => ({
    productCode: item.productCode,
    description: item.description,
    quantity: item.quantity,
    section: "product" as const,
    productCategory: "System module",
    productSubcategory: item.productSubcategory,
    ruleApplied: `Large config: ${rp.config}`,
  }));
}

// ── Cable rules (from jumper lengths) ────────────────────────────

/**
 * Parse jumper string like "6 m" → 6, returns null if unparseable.
 */
function parseJumperLength(jumper: string): number | null {
  if (!jumper) return null;
  const n = parseFloat(jumper.replace(/m/gi, "").trim());
  return isNaN(n) ? null : n;
}

/**
 * ice_cable_001 — 1/2" feeder installation per meter
 * 5m jumpers included with RRH install. For jumpers > 5m,
 * charge 2m per jumper (excess per end).
 */
function ruleCableFeeder(rp: RadioPlanData): BOQRuleResult | null {
  let totalMeters = 0;
  for (const cell of rp.rawRows) {
    const len = parseJumperLength(cell.jumpers);
    if (len !== null && len > 5) {
      totalMeters += (len - 5) * 2;
    }
  }
  if (totalMeters === 0) return null;
  return {
    productCode: "ice_cable_001",
    description: '1/2" feeder installation per meter',
    quantity: totalMeters,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Cables",
    ruleApplied: `Jumpers > 5m: ${totalMeters}m excess`,
  };
}

// ── Default rules (all sites) ───────────────────────────────────

/**
 * ice_Basic_M_001 — Labeling
 * Always quantity 1 for any site.
 */
function ruleLabeling(rp: RadioPlanData): BOQRuleResult | null {
  return {
    productCode: "ice_Basic_M_001",
    description: "Labeling New sites, Band Addition and Site upgrades",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Basic Materials",
    ruleApplied: "Default: all sites",
  };
}

// ── Rule registry ───────────────────────────────────────────────

type RuleFromRadioPlan = (rp: RadioPlanData) => BOQRuleResult | null;
type MultiRuleFromRadioPlan = (rp: RadioPlanData) => BOQRuleResult[];

const RADIO_PLAN_RULES: RuleFromRadioPlan[] = [
  ruleWalkTest,
  ruleBbuInstall,
  ruleRrhInstall,
  ruleDowntiltKit,
  ruleTssReport,
  ruleLabeling,
  ruleCableFeeder,
];
const RADIO_PLAN_MULTI_RULES: MultiRuleFromRadioPlan[] = [
  rulesSiteSetup,
  rulesAntenna,
  rulesTravel,
  rulesGpsKit,
];

// ── Public API ──────────────────────────────────────────────────

/**
 * Compute all BOQ items from the current import data.
 * Returns a fresh array of BOQItems — caller replaces state.
 */
export function computeBOQFromImports(
  radioPlan: RadioPlanData | null,
  powerCalc: PowerCalcData | null,
): BOQItem[] {
  const results: BOQRuleResult[] = [];

  if (radioPlan) {
    for (const rule of RADIO_PLAN_RULES) {
      const result = rule(radioPlan);
      if (result) results.push(result);
    }
    for (const rule of RADIO_PLAN_MULTI_RULES) {
      results.push(...rule(radioPlan));
    }
  }

  // Power calc rules will be added here

  return results.map((r, i) => ({
    id: `rule-${r.productCode}-${i}`,
    productCode: r.productCode,
    description: r.description,
    quantity: r.quantity,
    section: r.section,
    productCategory: r.productCategory,
    productSubcategory: r.productSubcategory,
    ruleApplied: r.ruleApplied,
    isManualOverride: false,
  }));
}
