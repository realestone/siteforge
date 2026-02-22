/**
 * Config string parser for radio plan configuration.
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

export interface ParsedConfig {
  isNew: boolean;
  sectorSizes: string[];
  sectorCount: number;
  hasLarge: boolean;
  largeCount: number;
  hasMedium: boolean;
  mediumCount: number;
  hasSmall: boolean;
  smallCount: number;
  raw: string;
}

export function parseConfig(config: string): ParsedConfig {
  const raw = config;
  let rest = config.replace(/_$/, "");

  let isNew = false;
  if (rest.startsWith("N")) {
    isNew = true;
    rest = rest.slice(1);
  }

  const sectorSizes = rest.split("").filter((c) => "LMS".includes(c));
  const largeCount = sectorSizes.filter((c) => c === "L").length;
  const mediumCount = sectorSizes.filter((c) => c === "M").length;
  const smallCount = sectorSizes.filter((c) => c === "S").length;

  return {
    isNew,
    sectorSizes,
    sectorCount: sectorSizes.length,
    hasLarge: largeCount > 0,
    largeCount,
    hasMedium: mediumCount > 0,
    mediumCount,
    hasSmall: smallCount > 0,
    smallCount,
    raw,
  };
}
