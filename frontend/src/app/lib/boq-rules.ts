/**
 * BOQ dependency rules engine.
 *
 * Computes BOQ item quantities from parsed Radio Plan and Power Calculator data.
 * Each rule maps import data → a product code + quantity.
 *
 * Rules return null when they don't apply (e.g. no LTE cells found).
 *
 * Config string format: [N]<sector_sizes>_
 *   N = New site (optional prefix — fresh install, not upgrade/swap)
 *   L = Large sector (NR + LTE + mMIMO AQQY)
 *   M = Medium sector (LTE + NR, no mMIMO)
 *   S = Small sector (LTE only)
 *   _ = terminator
 *
 * Examples:
 *   NLLL_ = New site, 3 Large sectors
 *   NLL_  = New site, 2 Large sectors
 *   NM_   = New site, 1 Medium sector
 *   LLL_  = Existing site upgrade, 3 Large sectors
 */

import type { RadioPlanData } from "./radio-plan-parser";
import type { PowerCalcData } from "./power-calc-parser";
import type { BOQItem } from "../types/site";
import { parseConfig } from "./config-utils";

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
 * Site setup items — computed from config string sector sizes.
 *
 * Per-site (fixed):
 *   ABIO ×2, ASIB ×1, AMIA ×1 — BBU modules for any new site
 *
 * Per-sector by size:
 *   L (Large):  AHEGB ×1, AHPMDB ×1, AQQY ×1, AOPC ×4
 *   M (Medium): AHEGB ×1, AHPMDB ×1, AOPC ×2 (no AQQY)
 *   S (Small):  AHEGB ×1, AOPC ×1 (LTE only, single RRH)
 */
interface ConfigItem {
  productCode: string;
  description: string;
  quantity: number;
  productSubcategory: string;
}

function computeSetupItems(config: string): ConfigItem[] {
  const parsed = parseConfig(config);
  if (!parsed.isNew) return [];

  const items: ConfigItem[] = [
    // Per-site BBU modules
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
  ];

  // AHEGB: 1 per L or M or S sector (all sectors get at least the LB RRH)
  const ahegbCount = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
  if (ahegbCount > 0) {
    items.push({
      productCode: "474090A.101",
      description: "AHEGB AIRSCALE DUAL RRH 4T4R B13 320W",
      quantity: ahegbCount,
      productSubcategory: "AHEGB",
    });
  }

  // AHPMDB: 1 per L or M sector (HB RRH, not needed for S)
  const ahpmdbCount = parsed.largeCount + parsed.mediumCount;
  if (ahpmdbCount > 0) {
    items.push({
      productCode: "475000A.101",
      description: "AHPMDB AirScale RRH 2T4R B82028 240W",
      quantity: ahpmdbCount,
      productSubcategory: "AHPMDB",
    });
  }

  // AQQY: 1 per L sector only (mMIMO)
  if (parsed.largeCount > 0) {
    items.push({
      productCode: "475573A.103",
      description: "AQQY AIRSCALE MAA 32T32R 128AE N78 240W .103",
      quantity: parsed.largeCount,
      productSubcategory: "AQQY",
    });
  }

  // AOPC: 4 per L, 2 per M, 1 per S (SFP weatherproofing boot kits)
  const aopcCount =
    parsed.largeCount * 4 + parsed.mediumCount * 2 + parsed.smallCount * 1;
  if (aopcCount > 0) {
    items.push({
      productCode: "475151A.102",
      description: "AOPC SFP Weatherproofing Boot Kit",
      quantity: aopcCount,
      productSubcategory: "AOPC",
    });
  }

  return items;
}

function rulesSiteSetup(rp: RadioPlanData): BOQRuleResult[] {
  const items = computeSetupItems(rp.config);
  if (items.length === 0) return [];
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
 * Always 1 for any new site (config starts with N)
 */
function ruleBbuInstall(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  if (!parsed.isNew) return null;
  return {
    productCode: "ice_RM_002",
    description: "System module installation (BBU)",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Radio Module",
    ruleApplied: `New site config: ${rp.config}`,
  };
}

/**
 * ice_RM_003 — RRH/RRU installation
 * AHEGB: 1 per sector (L+M+S), AHPMDB: 1 per M/L sector
 */
function ruleRrhInstall(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  if (!parsed.isNew) return null;
  // AHEGB count = all sectors, AHPMDB count = L+M sectors
  const rrhCount =
    parsed.largeCount +
    parsed.mediumCount +
    parsed.smallCount + // AHEGB
    parsed.largeCount +
    parsed.mediumCount; // AHPMDB
  if (rrhCount === 0) return null;
  return {
    productCode: "ice_RM_003",
    description: "RRH/RRU installation",
    quantity: rrhCount,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Radio Module",
    ruleApplied: `RRH units: ${rrhCount} (new site)`,
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
 * SLJ12SP jumper cables — product code from jumper length in radio plan.
 * Each sector specifies a jumper length (e.g. "6 m") → SLJ12SP-64M64M-6.0m
 */
function rulesJumpers(rp: RadioPlanData): BOQRuleResult[] {
  const jumperCount = new Map<string, number>();
  for (const cell of rp.rawRows) {
    if (!cell.jumpers) continue;
    const match = cell.jumpers.trim().match(/^(\d+(?:\.\d+)?)\s*m/);
    if (!match) continue;
    let length = match[1];
    if (!length.includes(".")) length = `${length}.0`;
    const code = `SLJ12SP-64M64M-${length}m`;
    jumperCount.set(code, (jumperCount.get(code) || 0) + 2); // pair per row
  }
  return Array.from(jumperCount.entries()).map(([code, qty]) => ({
    productCode: code,
    description: `Jumper ${code}`,
    quantity: qty,
    section: "product" as const,
    productCategory: "System module",
    productSubcategory: "Jumper",
    ruleApplied: `Radio plan jumper: ${qty} pcs (${qty / 2} rows x 2)`,
  }));
}

/**
 * BSA-DT-34 — Downtilt Kit (Andrew)
 * For sectors with RRZZ antenna and non-zero mTilt.
 */
const DOWNTILT_ANTENNAS = new Set(["RRZZ-65B-R4N39-V1", "RRZZ-65B-R4N39"]);

function ruleDowntiltKit(rp: RadioPlanData): BOQRuleResult | null {
  const count = rp.sectors.filter((s) => {
    if (s.mTilt === null || s.mTilt === 0) return false;
    return s.antennas.some((ant) => DOWNTILT_ANTENNAS.has(ant));
  }).length;
  if (count === 0) return null;
  return {
    productCode: "BSA-DT-34",
    description:
      "Downtilt Kit_Andrew — Wide Profile Antenna Downtilt Mounting Kit",
    quantity: count,
    section: "product",
    productCategory: "System module",
    productSubcategory: "Antenna",
    ruleApplied: `RRZZ antenna + mech tilt != 0: ${count} sectors`,
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
  const results: BOQRuleResult[] = GPS_KIT_ITEMS.map((item) => ({
    productCode: item.productCode,
    description: item.description,
    quantity: item.quantity,
    section: "product" as const,
    productCategory: "System module",
    productSubcategory: item.productSubcategory,
    ruleApplied: `Large config: ${rp.config}`,
  }));
  // GPS antenna installation service — only for Large configs
  results.push({
    productCode: "ice_ant_010",
    description: "Installation of GPS antenna including bracket",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Antenna",
    ruleApplied: `Large config: ${rp.config}`,
  });
  return results;
}

// ── SFP module rules ────────────────────────────────────────────

/**
 * 475336A.101 — AOME 10G SFP+ 850nm 300m MM I-temp
 * 2 SFPs per radio, 2 radios per M/L sector (AHEGB + AHPMDB).
 * Qty = (M + L sector count) × 2 radios × 2 SFPs.
 * S sectors don't need SFPs. Always ordered regardless of new/existing.
 */
function ruleSfpModules(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  const mlCount = parsed.largeCount + parsed.mediumCount;
  if (mlCount === 0) return null;
  const qty = mlCount * 2 * 2; // 2 radios × 2 SFPs per sector
  return {
    productCode: "475336A.101",
    description: "AOME 10G SFP+ 850nm 300m MM I-temp",
    quantity: qty,
    section: "product",
    productCategory: "System module",
    productSubcategory: "AOME",
    ruleApplied: `${mlCount} M/L sectors × 2 radios × 2 SFPs = ${qty}`,
  };
}

/**
 * 474900A.101 — AOMC SFP28 70m MM I-temp RS
 * 4 SFPs per AQQY (mMIMO), 1 AQQY per Large sector only.
 * Qty = L sector count × 4. Medium/Small sectors have no AQQY.
 */
function ruleSfp28Modules(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  if (parsed.largeCount === 0) return null;
  const qty = parsed.largeCount * 4;
  return {
    productCode: "474900A.101",
    description: "AOMC SFP28 70m MM I-temp RS",
    quantity: qty,
    section: "product",
    productCategory: "System module",
    productSubcategory: "AOMC",
    ruleApplied: `${parsed.largeCount} Large sectors × 4 SFPs per AQQY = ${qty}`,
  };
}

/**
 * 474283A.101 — APPC Airscale2 55A DC plug 10-16mm2
 * 1 per radio/AQQY: L sector = 3 (2 RRHs + AQQY), M sector = 2 (2 RRHs), S = 0.
 */
function ruleAppcDcPlug(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  const qty = parsed.largeCount * 3 + parsed.mediumCount * 2;
  if (qty === 0) return null;
  return {
    productCode: "474283A.101",
    description: "APPC Airscale2 55A DC plug 10-16mm2",
    quantity: qty,
    section: "product",
    productCategory: "System module",
    productSubcategory: "APPC",
    ruleApplied: `${parsed.largeCount}L×3 + ${parsed.mediumCount}M×2 = ${qty}`,
  };
}

// ── ATOA / FTTA set (rooftop sites) ─────────────────────────────

/**
 * ATOA optical distribution unit set — for rooftop sites.
 * Includes ATOA unit, AMRA/AMRB clip brackets, and FTTA box installation.
 * Default qty 2 each — may need manual adjustment per site.
 * NOTE: Currently fires for all sites; site category filtering requires
 * TSSR data which isn't available in radio plan rules yet.
 */
function rulesAtoaSet(rp: RadioPlanData): BOQRuleResult[] {
  return [
    {
      productCode: "475163A.101",
      description: "ATOA Airscale Optical Distribution Unit",
      quantity: 2,
      section: "product",
      productCategory: "System module",
      productSubcategory: "ATOA",
      ruleApplied: "Rooftop default: 2 pcs (adjust per site)",
    },
    {
      productCode: "474580A.101",
      description: "AMRA AIRSCALE ONE CLIP BRACKET 51-125",
      quantity: 2,
      section: "product",
      productCategory: "System module",
      productSubcategory: "AMRA",
      ruleApplied: "ATOA clip rail bracket: 2 pcs",
    },
    {
      productCode: "ice_RM_014",
      description: "FTTA box installation",
      quantity: 2,
      section: "service",
      productCategory: "Service items",
      productSubcategory: "Radio Module",
      ruleApplied: "ATOA installation: 2 pcs",
    },
  ];
}

/**
 * 474581A.102 — AMRB AirScale one clip bracket
 * 1 per RRH: L sector = 2 (AHEGB + AHPMDB), M sector = 2, S = 0.
 */
function ruleAmrbBracket(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  const qty = (parsed.largeCount + parsed.mediumCount) * 2;
  if (qty === 0) return null;
  return {
    productCode: "474581A.102",
    description: "AMRB AirScale one clip bracket",
    quantity: qty,
    section: "product",
    productCategory: "System module",
    productSubcategory: "AMRB",
    ruleApplied: `${parsed.largeCount + parsed.mediumCount} M/L sectors × 2 RRHs = ${qty}`,
  };
}

/**
 * 475188A.102 — AMPF bracket 20 degree tilt
 * 1 per AQQY (mMIMO), Large sectors only. Always ordered even if mech tilt is zero.
 */
function ruleAmpfBracket(rp: RadioPlanData): BOQRuleResult | null {
  const parsed = parseConfig(rp.config);
  if (parsed.largeCount === 0) return null;
  return {
    productCode: "475188A.102",
    description: "AMPF bracket 20 degree tilt",
    quantity: parsed.largeCount,
    section: "product",
    productCategory: "System module",
    productSubcategory: "AMPF",
    ruleApplied: `${parsed.largeCount} Large sectors × 1 per AQQY = ${parsed.largeCount}`,
  };
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

function ruleStickers(rp: RadioPlanData): BOQRuleResult | null {
  return {
    productCode: "ice_stickers_small",
    description: "ICE equipment stickers",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Basic Materials",
    ruleApplied: "Default: all sites",
  };
}

function ruleCommissioning(rp: RadioPlanData): BOQRuleResult | null {
  return {
    productCode: "ice_RM_016",
    description: "Commissioning eNB/gNB",
    quantity: 1,
    section: "service",
    productCategory: "Service items",
    productSubcategory: "Radio Module",
    ruleApplied: "Default: all sites",
  };
}

// ── Power calc rules ────────────────────────────────────────────

/**
 * Rectifier modules + installation for new rectifier.
 * New rectifier comes with 3 modules pre-installed.
 * If more than 3 needed, order extra modules (241115.106 FLATPACK2)
 * and their installation service (ice_DC_Service_005).
 */
function rulesRectifierModules(pc: PowerCalcData): BOQRuleResult[] {
  if (!pc.rectifierSetup.isNew) return [];
  const modules = pc.rectifierSetup.minModules || pc.results.rectifierModules;
  const extra = modules - 3;
  if (extra <= 0) return [];
  return [
    {
      productCode: "241115.106",
      description: "FLATPACK2 482000 SHE",
      quantity: extra,
      section: "product",
      productCategory: "System module",
      productSubcategory: "Rectifier",
      ruleApplied: `Effektkalkulator: ${modules} modules - 3 pre-installed = ${extra} (${pc.rectifierSetup.model})`,
    },
    {
      productCode: "ice_DC_Service_005",
      description: "Rectifier module unit installation 1 pc",
      quantity: extra,
      section: "service",
      productCategory: "Service items",
      productSubcategory: "Rectifier and DC -48",
      ruleApplied: `Effektkalkulator: ${extra} extra module installations (${pc.rectifierSetup.model})`,
    },
  ];
}

/**
 * DC cable products + installation services from Effektkalkulator cable table.
 * Cable product = raw length + overhead per run.
 * Installation service = raw length (exact).
 */
const CABLE_OVERHEAD: Record<number, number> = {
  10: 3,
  16: 5,
  25: 5,
  35: 5,
  50: 5,
};
const CABLE_PRODUCT: Record<number, string> = {
  10: "SL2C10MM2FRNC-S-BK-N",
  16: "SL2C16MM2FRNC-S-BK-N",
};
const CABLE_INSTALL: Record<number, string> = {
  10: "ice_cable_007",
  16: "ice_cable_008",
};

function rulesDcCables(pc: PowerCalcData): BOQRuleResult[] {
  if (!pc.dcCables.length) return [];

  const runsByCs = new Map<number, number[]>();
  for (const cable of pc.dcCables) {
    const cs = Math.round(cable.crossSection);
    if (!runsByCs.has(cs)) runsByCs.set(cs, []);
    runsByCs.get(cs)!.push(cable.lengthM);
  }

  const results: BOQRuleResult[] = [];
  for (const [cs, lengths] of Array.from(runsByCs.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    const overhead = CABLE_OVERHEAD[cs] ?? 3;
    const rawTotal = lengths.reduce((s, l) => s + l, 0);
    const orderTotal = lengths.reduce((s, l) => s + l + overhead, 0);
    const runCount = lengths.length;

    const productCode = CABLE_PRODUCT[cs];
    if (productCode) {
      results.push({
        productCode,
        description: `Power Cable 2x${cs}mm²`,
        quantity: orderTotal,
        section: "product",
        productCategory: "System module",
        productSubcategory: "DC Cable",
        ruleApplied: `DC cables ${cs}mm²: ${runCount} runs, ${rawTotal}m + ${overhead}m/run = ${orderTotal}m`,
      });
    }

    const installCode = CABLE_INSTALL[cs];
    if (installCode) {
      results.push({
        productCode: installCode,
        description: `DC cable installation, ${cs} mm² per meter`,
        quantity: rawTotal,
        section: "service",
        productCategory: "Service items",
        productSubcategory: "Cables",
        ruleApplied: `DC cable install ${cs}mm²: ${runCount} runs, ${rawTotal}m total`,
      });
    }
  }

  return results;
}

// ── Rule registry ───────────────────────────────────────────────

type RuleFromRadioPlan = (rp: RadioPlanData) => BOQRuleResult | null;
type MultiRuleFromRadioPlan = (rp: RadioPlanData) => BOQRuleResult[];
type MultiRuleFromPowerCalc = (pc: PowerCalcData) => BOQRuleResult[];

const RADIO_PLAN_RULES: RuleFromRadioPlan[] = [
  ruleWalkTest,
  ruleBbuInstall,
  ruleRrhInstall,
  ruleDowntiltKit,
  ruleTssReport,
  ruleLabeling,
  ruleStickers,
  ruleCommissioning,
  ruleCableFeeder,
  ruleSfpModules,
  ruleSfp28Modules,
  ruleAppcDcPlug,
  ruleAmrbBracket,
  ruleAmpfBracket,
];
const RADIO_PLAN_MULTI_RULES: MultiRuleFromRadioPlan[] = [
  rulesSiteSetup,
  rulesAtoaSet,
  rulesAntenna,
  rulesJumpers,
  rulesTravel,
  rulesGpsKit,
];

/**
 * M12V190FT — MARATHON 12V 190AH batteries.
 * 1 string = 4 battery blocks. Qty = batteryStrings × 4.
 * Only when new rectifier (new battery setup).
 */
function rulesBatteries(pc: PowerCalcData): BOQRuleResult[] {
  if (!pc.rectifierSetup.isNew || pc.results.batteryStrings2h <= 0) return [];
  const strings = pc.results.batteryStrings2h;
  const qty = strings * 4;
  return [
    {
      productCode: "M12V190FT",
      description: "MARATHON 12V 190AH",
      quantity: qty,
      section: "product",
      productCategory: "System module",
      productSubcategory: "Battery",
      ruleApplied: `${strings} strings × 4 batteries = ${qty}`,
    },
  ];
}

/**
 * MT_BATT_CONNECT_SET — Battery connection set MARATHON.
 * 1 per battery string, only when new rectifier.
 */
function rulesBatteryConnectSet(pc: PowerCalcData): BOQRuleResult[] {
  if (!pc.rectifierSetup.isNew || pc.results.batteryStrings2h <= 0) return [];
  const strings = pc.results.batteryStrings2h;
  return [
    {
      productCode: "MT_BATT_CONNECT_SET",
      description: "Battery connection set MARATHON",
      quantity: strings,
      section: "product",
      productCategory: "System module",
      productSubcategory: "Battery",
      ruleApplied: `${strings} battery strings, 1 connection set each`,
    },
  ];
}

/**
 * 476359A.101 — ASAL EAC cable 19PIN - peeled end 10m
 * Always 1 when new rectifier is being installed.
 */
function rulesAsalCable(pc: PowerCalcData): BOQRuleResult[] {
  if (!pc.rectifierSetup.isNew) return [];
  return [
    {
      productCode: "476359A.101",
      description: "ASAL EAC cable 19PIN - peeled end 10m",
      quantity: 1,
      section: "product",
      productCategory: "System module",
      productSubcategory: "ASAL",
      ruleApplied: "New rectifier: 1 EAC cable",
    },
  ];
}

const POWER_CALC_MULTI_RULES: MultiRuleFromPowerCalc[] = [
  rulesRectifierModules,
  rulesDcCables,
  rulesBatteries,
  rulesBatteryConnectSet,
  rulesAsalCable,
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

  if (powerCalc) {
    for (const rule of POWER_CALC_MULTI_RULES) {
      results.push(...rule(powerCalc));
    }
  }

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
