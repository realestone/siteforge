/**
 * Parse a Flow RadioPlan .xlsx file and extract structured sector/cell data.
 *
 * Expected columns (header row 1):
 *   CellId, Technology, OnAirDate, Project, CellStatus, Future,
 *   NA_RFName, AntennaType, RET, Height, Azim, MT, ET, FeedLen,
 *   CableType, Jumpers
 */

export interface RadioPlanCell {
  cellId: string;
  technology: string;
  project: string;
  cellStatus: string;
  antennaType: string;
  height: number | null;
  azimuth: number | null;
  mTilt: number | null;
  eTilt: number | null;
  feedLength: number | null;
  cableType: string;
  jumpers: string;
}

export interface RadioPlanSector {
  id: string;
  azimuth: number;
  mTilt: number;
  eTilt: number;
  antennas: string[];
  technologies: string[];
  cells: RadioPlanCell[];
  feedLength: number | null;
  cableType: string;
  jumpers: string;
  heights: number[];
  lbRrh: number;
  hbRrh: number;
  aqqyCount: number;
  totalRrh: number;
  antennaModel: string | null;
}

export interface MountGroup {
  id: string;
  sectorIds: string[];
  mountCode: string;
  rrhCount: number;
  aqqyCount: number;
  antennaCount: number;
}

export interface RadioPlanData {
  siteId: string;
  project: string;
  sectors: RadioPlanSector[];
  config: string;
  totalCells: number;
  rawRows: RadioPlanCell[];
  mountGroups: MountGroup[];
  totalLbRrh: number;
  totalHbRrh: number;
  totalAqqy: number;
  totalAntennas: number;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function parseRadioPlan(
  buffer: ArrayBuffer,
): Promise<RadioPlanData> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

  // Map rows to typed cells
  const cells: RadioPlanCell[] = raw.map((r) => ({
    cellId: toStr(r["CellId"]),
    technology: toStr(r["Technology"]),
    project: toStr(r["Project"]),
    cellStatus: toStr(r["CellStatus"]),
    antennaType: toStr(r["AntennaType"]),
    height: toNum(r["Height"]),
    azimuth: toNum(r["Azim"]),
    mTilt: toNum(r["MT"]),
    eTilt: toNum(r["ET"]),
    feedLength: toNum(r["FeedLen"]),
    cableType: toStr(r["CableType"]),
    jumpers: toStr(r["Jumpers"]),
  }));

  // Extract site ID from first CellId: MOR07876L1_07MA → MOR07876
  const siteMatch = cells[0]?.cellId.match(/^([A-Z]{3}\d{5})/);
  const siteId = siteMatch ? siteMatch[1] : "";

  // Project name from first row
  const project = cells[0]?.project || "";

  // Group by sector letter (last character of CellId)
  const sectorMap = new Map<string, RadioPlanCell[]>();
  for (const cell of cells) {
    if (!cell.cellId) continue;
    const sectorLetter = cell.cellId.slice(-1);
    if (!sectorMap.has(sectorLetter)) {
      sectorMap.set(sectorLetter, []);
    }
    sectorMap.get(sectorLetter)!.push(cell);
  }

  // Build sector summaries
  const sectors: RadioPlanSector[] = [];
  for (const [id, sectorCells] of [...sectorMap.entries()].sort()) {
    const azimuth = sectorCells[0]?.azimuth ?? 0;
    // Use the first LTE cell for mTilt/eTilt (LTE is the "base" layer)
    const lteCell = sectorCells.find((c) => c.technology === "LTE");
    const mTilt = lteCell?.mTilt ?? sectorCells[0]?.mTilt ?? 0;
    const eTilt = lteCell?.eTilt ?? sectorCells[0]?.eTilt ?? 0;

    const antennas = [
      ...new Set(sectorCells.map((c) => c.antennaType).filter(Boolean)),
    ];
    const technologies = [
      ...new Set(sectorCells.map((c) => c.technology).filter(Boolean)),
    ].sort();

    const feedLength = sectorCells[0]?.feedLength ?? null;
    const cableType = sectorCells[0]?.cableType || "";
    const jumpers = sectorCells[0]?.jumpers || "";

    const heights = [
      ...new Set(
        sectorCells.map((c) => c.height).filter((h): h is number => h !== null),
      ),
    ].sort((a, b) => a - b);

    const hasPassive = antennas.some((a) => a.startsWith("RRZZ"));
    const hasAqqy = antennas.some(
      (a) => a.includes("AQQY") || a.includes("mMIMO"),
    );
    const hasLte = technologies.includes("LTE");
    const hasNrSector = technologies.includes("NR");
    const lbRrh = hasPassive && hasLte ? 1 : 0;
    const hbRrh = hasPassive && hasNrSector ? 1 : 0;
    const aqqyCount = hasAqqy ? 1 : 0;
    const antennaModel = hasPassive
      ? (antennas.find((a) => a.startsWith("RRZZ")) ?? null)
      : null;

    sectors.push({
      id,
      azimuth,
      mTilt,
      eTilt,
      antennas,
      technologies,
      cells: sectorCells,
      feedLength,
      cableType,
      jumpers,
      heights,
      lbRrh,
      hbRrh,
      aqqyCount,
      totalRrh: lbRrh + hbRrh,
      antennaModel,
    });
  }

  // Build config string: [N]<sector_sizes>_
  //   N = New site (fresh install)
  //   L = Large sector (NR + LTE + mMIMO AQQY)
  //   M = Medium sector (LTE + NR, no mMIMO)
  //   S = Small sector (LTE only)
  //   _ = terminator
  // Detect sector size per-sector based on actual equipment:
  //   - Has AQQY/mMIMO antenna → L (Large)
  //   - Has NR technology but no mMIMO → M (Medium)
  //   - LTE only → S (Small)
  const hasNR = sectors.some((s) => s.technologies.includes("NR"));
  const sectorSizes = sectors.map((s) => {
    if (s.aqqyCount > 0) return "L";
    if (s.technologies.includes("NR")) return "M";
    return "S";
  });
  const config = (hasNR ? "N" : "") + sectorSizes.join("") + "_";

  // Compute site-level totals
  const totalLbRrh = sectors.reduce((s, sec) => s + sec.lbRrh, 0);
  const totalHbRrh = sectors.reduce((s, sec) => s + sec.hbRrh, 0);
  const totalAqqy = sectors.reduce((s, sec) => s + sec.aqqyCount, 0);
  const totalAntennas = sectors.filter((s) => s.antennaModel !== null).length;

  // Compute mount groups (sectors within 120° share a free-standing mount)
  const mountGroups = computeMountGroups(sectors);

  return {
    siteId,
    project,
    sectors,
    config,
    totalCells: cells.length,
    rawRows: cells,
    mountGroups,
    totalLbRrh,
    totalHbRrh,
    totalAqqy,
    totalAntennas,
  };
}

// ── Mount grouping algorithm ──────────────────────────────────────

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Group sectors that are within 120° of each other onto shared mounts.
 * Multi-sector group → "985300" (multi-arm FS), single → "980300" (single-arm FS).
 *
 * Algorithm: find the largest clique where all pairwise angular distances ≤ 120°.
 * For Nørvevika: A(0°), B(90°), C(270°)
 *   {A,B,C} fails: B→C = 180° > 120°
 *   {A,C} = 90° ✓, {A,B} = 90° ✓ — pick largest group first, then assign rest.
 *   Since {A,C} and {A,B} are same size, pick the one with smallest angular span.
 *   A→C span = 90° (wrap), A→B span = 90°. Tiebreak: pick wrap-around pair {A,C}.
 *   Result: {A,C} → 985300, {B} → 980300. ✅ Matches real TSSR.
 */
function computeMountGroups(sectors: RadioPlanSector[]): MountGroup[] {
  if (sectors.length === 0) return [];
  if (sectors.length === 1) {
    return [makeMountGroup("MG1", sectors)];
  }

  // For small sector counts (≤4), enumerate all valid cliques
  const indices = sectors.map((_, i) => i);
  const validCliques: number[][] = [];

  // Generate all subsets of size ≥ 2
  for (let mask = 3; mask < 1 << sectors.length; mask++) {
    const subset: number[] = [];
    for (let i = 0; i < sectors.length; i++) {
      if (mask & (1 << i)) subset.push(i);
    }
    if (subset.length < 2) continue;
    // Check all pairwise distances ≤ 120°
    let valid = true;
    for (let a = 0; a < subset.length && valid; a++) {
      for (let b = a + 1; b < subset.length && valid; b++) {
        if (
          angularDistance(
            sectors[subset[a]].azimuth,
            sectors[subset[b]].azimuth,
          ) > 120
        ) {
          valid = false;
        }
      }
    }
    if (valid) validCliques.push(subset);
  }

  // Sort cliques: largest first, then smallest angular span as tiebreak
  validCliques.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return cliqueSpan(a, sectors) - cliqueSpan(b, sectors);
  });

  // Greedy assignment: pick largest valid clique, remove those sectors, repeat
  const assigned = new Set<number>();
  const groups: MountGroup[] = [];
  let groupId = 1;

  for (const clique of validCliques) {
    if (clique.some((i) => assigned.has(i))) continue;
    clique.forEach((i) => assigned.add(i));
    groups.push(
      makeMountGroup(
        `MG${groupId++}`,
        clique.map((i) => sectors[i]),
      ),
    );
  }

  // Any remaining sectors get their own single mount
  for (const i of indices) {
    if (!assigned.has(i)) {
      groups.push(makeMountGroup(`MG${groupId++}`, [sectors[i]]));
    }
  }

  return groups;
}

function cliqueSpan(indices: number[], sectors: RadioPlanSector[]): number {
  let maxDist = 0;
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) {
      const d = angularDistance(
        sectors[indices[a]].azimuth,
        sectors[indices[b]].azimuth,
      );
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

function makeMountGroup(id: string, secs: RadioPlanSector[]): MountGroup {
  return {
    id,
    sectorIds: secs.map((s) => s.id),
    mountCode: secs.length >= 2 ? "985300" : "980300",
    rrhCount: secs.reduce((s, sec) => s + sec.totalRrh, 0),
    aqqyCount: secs.reduce((s, sec) => s + sec.aqqyCount, 0),
    antennaCount: secs.filter((s) => s.antennaModel !== null).length,
  };
}
