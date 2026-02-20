import type * as XLSXType from "xlsx";

// ── Types ───────────────────────────────────────────────────────

export interface PowerCalcSiteInfo {
  siteId: string;
  siteName: string;
  stationOwner: string;
  stationOwnerId: string;
  stationOwnerName: string;
  date: string;
  engineer: string;
}

export interface PowerCalcInput {
  name: string; // "Small", "Medium", "Large", "450MHz", etc.
  quantity: number;
  normalPowerW: number; // busy hour
  avgPowerW: number; // normal average
  maxPower80W: number; // 80% of max
  batteryPowerW: number; // battery mode
}

export interface PowerCalcResults {
  rectifierModules: number;
  maxPowerNormal80W: number; // dimensioning for rectifier
  totalNormalPowerW: number; // average normal operation
  totalNormalPowerKW: number;
  totalBatteryPower10minW: number;
  totalBatteryPowerAfter10minW: number;
  avgBatteryPower2hW: number; // dimensioning for battery
  avgBatteryPower4hW: number;
  batteryStrings2h: number;
  batteryStrings4h: number;
}

export interface PowerCalcEnergy {
  dailyKwh: number;
  monthlyKwh: number;
  yearlyKwh: number;
}

export interface PowerCalcRectifierTest {
  availablePowerNormal: number;
  normalOk: boolean;
  availablePowerBattery: number;
  batteryOk: boolean;
}

export interface PowerCalcDcCable {
  sector: number;
  band: string; // "Lavband RRH", "Mid-band RRH", "High-band (N35)"
  lengthM: number;
  crossSection: number; // mm2
}

export interface PowerCalcData {
  siteInfo: PowerCalcSiteInfo;
  inputs: PowerCalcInput[];
  results: PowerCalcResults;
  energy: PowerCalcEnergy;
  rectifierTest: PowerCalcRectifierTest;
  dcCables: PowerCalcDcCable[];
}

// ── Parser ──────────────────────────────────────────────────────

type WorkSheet = XLSXType.WorkSheet;

function cellVal(ws: WorkSheet, addr: string): any {
  const cell = ws[addr];
  return cell ? cell.v : undefined;
}

function cellNum(ws: WorkSheet, addr: string): number {
  const v = cellVal(ws, addr);
  return typeof v === "number" ? v : 0;
}

function cellStr(ws: WorkSheet, addr: string): string {
  const v = cellVal(ws, addr);
  if (v == null) return "";
  if (v instanceof Date) {
    return v.toLocaleDateString("nb-NO");
  }
  return String(v).trim();
}

export async function parsePowerCalc(
  buffer: ArrayBuffer,
): Promise<PowerCalcData> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  // Main sheet
  const wsName = wb.SheetNames.find(
    (n) =>
      n.toLowerCase().includes("effektkalkulator") ||
      n.toLowerCase().includes("effektberegning"),
  );
  if (!wsName) {
    throw new Error("Could not find Effektkalkulator sheet");
  }
  const ws = wb.Sheets[wsName];

  // ── Site info (rows 4-11) ─────────────────────────────────────
  const siteInfo: PowerCalcSiteInfo = {
    siteId: cellStr(ws, "B4"),
    siteName: cellStr(ws, "B5"),
    stationOwner: cellStr(ws, "B6"),
    stationOwnerId: cellStr(ws, "B7"),
    stationOwnerName: cellStr(ws, "B8"),
    date: cellStr(ws, "B10"),
    engineer: cellStr(ws, "B11"),
  };

  // ── Input data (rows 22-29) ───────────────────────────────────
  // Row 21 is header row
  // Columns: A=name, B=qty, C=normal busy hour W, D=avg normal W, E=80% max W, F=battery W
  const inputRows: { name: string; row: number }[] = [
    { name: "Small", row: 22 },
    { name: "Medium", row: 23 },
    { name: "Large", row: 24 },
    { name: "450MHz", row: 25 },
    { name: "Baseband 1", row: 26 },
    { name: "Baseband 2 (N35)", row: 27 },
    { name: "CSR", row: 28 },
    { name: "Radio Link", row: 29 },
  ];

  const inputs: PowerCalcInput[] = inputRows.map(({ name, row }) => ({
    name,
    quantity: cellNum(ws, `B${row}`),
    normalPowerW: cellNum(ws, `C${row}`),
    avgPowerW: cellNum(ws, `D${row}`),
    maxPower80W: cellNum(ws, `E${row}`),
    batteryPowerW: cellNum(ws, `F${row}`),
  }));

  // ── Calculated results (rows 31-39) ───────────────────────────
  const results: PowerCalcResults = {
    rectifierModules: cellNum(ws, "B31"),
    maxPowerNormal80W: cellNum(ws, "B32"),
    totalNormalPowerW: cellNum(ws, "B33"),
    totalNormalPowerKW: cellNum(ws, "B34"),
    totalBatteryPower10minW: cellNum(ws, "B35"),
    totalBatteryPowerAfter10minW: cellNum(ws, "B36"),
    avgBatteryPower2hW: cellNum(ws, "B37"),
    avgBatteryPower4hW: cellNum(ws, "B38"),
    batteryStrings2h: cellNum(ws, "B39"),
    batteryStrings4h: cellNum(ws, "E39"),
  };

  // ── Energy (rows 41-43) ───────────────────────────────────────
  const energy: PowerCalcEnergy = {
    dailyKwh: cellNum(ws, "B41"),
    monthlyKwh: cellNum(ws, "B42"),
    yearlyKwh: cellNum(ws, "B43"),
  };

  // ── Rectifier test (rows 49-51) ───────────────────────────────
  const rectifierTest: PowerCalcRectifierTest = {
    availablePowerNormal: cellNum(ws, "B50"),
    normalOk: cellStr(ws, "C50") === "JA",
    availablePowerBattery: cellNum(ws, "B51"),
    batteryOk: cellStr(ws, "C51") === "JA",
  };

  // ── DC cables (rows 70-78) ────────────────────────────────────
  const dcCables: PowerCalcDcCable[] = [];
  const cableRows = [
    { sector: 1, band: "Lavband RRH (7/8/9)", row: 70 },
    { sector: 1, band: "Mid-band RRH (18/21)", row: 71 },
    { sector: 1, band: "High-band (N35)", row: 72 },
    { sector: 2, band: "Lavband RRH (7/8/9)", row: 73 },
    { sector: 2, band: "Mid-band RRH (18/21)", row: 74 },
    { sector: 2, band: "High-band (N35)", row: 75 },
    { sector: 3, band: "Lavband RRH (7/8/9)", row: 76 },
    { sector: 3, band: "Mid-band RRH (18/21)", row: 77 },
    { sector: 3, band: "High-band (N35)", row: 78 },
  ];

  for (const { sector, band, row } of cableRows) {
    const length = cellNum(ws, `B${row}`);
    const crossSection = cellNum(ws, `C${row}`);
    if (length > 0) {
      dcCables.push({ sector, band, lengthM: length, crossSection });
    }
  }

  return {
    siteInfo,
    inputs,
    results,
    energy,
    rectifierTest,
    dcCables,
  };
}
