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
}

export interface RadioPlanData {
  siteId: string;
  project: string;
  sectors: RadioPlanSector[];
  config: string;
  totalCells: number;
  rawRows: RadioPlanCell[];
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
    });
  }

  // Build config string: N prefix (if any sector has NR) + one L per sector + "_"
  // Convention: 3 sectors with NR+LTE → "NLLL_", 2 sectors → "NLL_", 1 sector → "NM_"
  const hasNR = sectors.some((s) => s.technologies.includes("NR"));
  const sectorCount = sectors.length;
  let config: string;
  if (sectorCount === 1) {
    config = hasNR ? "NM_" : "M_";
  } else {
    config = (hasNR ? "N" : "") + "L".repeat(sectorCount) + "_";
  }

  return {
    siteId,
    project,
    sectors,
    config,
    totalCells: cells.length,
    rawRows: cells,
  };
}
