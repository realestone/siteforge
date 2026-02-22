import React, { useState } from "react";
import { useSiteContext } from "../context/SiteContext";
import { Zap, X, Loader2 } from "lucide-react";
import type { RadioPlanData } from "../lib/radio-plan-parser";

// ── Types ───────────────────────────────────────────────────────────

type SiteCategory =
  | "Rooftop"
  | "Tower"
  | "Greenfield/Siteshare"
  | "Barn"
  | "Indoor/Tunnel";
type BuildType = "new" | "existing";
type CabinetType = "outdoor_2m" | "outdoor_1.2m" | "indoor_rack" | "coloc";
type BackupHours = "2" | "4";
type RoofType = "Flat" | "Sloped-Inside" | "Sloped-Outside";

export interface KickstartDialogProps {
  /** Full parsed radio plan data */
  radioPlan: RadioPlanData;
  /** Callback when user clicks Generate — receives the kickstart answers */
  onComplete: (answers: KickstartAnswers) => void;
  /** Callback when user skips */
  onSkip: () => void;
}

export interface KickstartAnswers {
  siteCategory: SiteCategory;
  buildType: BuildType;
  cabinetType: CabinetType;
  craneNeeded: boolean;
  externalElectrician: boolean;
  backupHours: BackupHours;
  roofType: RoofType | null;
  deviations: string;
}

// ── Component ───────────────────────────────────────────────────────

export const KickstartDialog: React.FC<KickstartDialogProps> = ({
  radioPlan,
  onComplete,
  onSkip,
}) => {
  const { tssrData } = useSiteContext();
  const [siteCategory, setSiteCategory] = useState<SiteCategory>("Rooftop");
  const [buildType, setBuildType] = useState<BuildType>("new");
  const [cabinetType, setCabinetType] = useState<CabinetType>("outdoor_2m");
  const [craneNeeded, setCraneNeeded] = useState(false);
  const [externalElectrician, setExternalElectrician] = useState(false);
  const [backupHours, setBackupHours] = useState<BackupHours>("2");
  const [roofType, setRoofType] = useState<RoofType>("Flat");
  const [deviations, setDeviations] = useState("");
  const [generating, setGenerating] = useState(false);

  const showRoofType = siteCategory === "Rooftop" || siteCategory === "Barn";

  // Derive display values from parsed radio plan
  const sectorSummary = radioPlan.sectors
    .map((s) => `${s.id} (${s.azimuth}\u00B0)`)
    .join("  ");

  const allTechnologies = [
    ...new Set(radioPlan.sectors.flatMap((s) => s.technologies)),
  ];
  const techSummary = allTechnologies.join(", ");

  const handleGenerate = () => {
    setGenerating(true);
    onComplete({
      siteCategory,
      buildType,
      cabinetType,
      craneNeeded,
      externalElectrician,
      backupHours,
      roofType: showRoofType ? roofType : null,
      deviations: deviations.trim(),
    });
  };

  // Question numbering shifts when roof type is hidden
  const qNum = (base: number) => {
    if (base <= 6) return base;
    if (!showRoofType) return base - 1;
    return base;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Zap className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Kickstart</h3>
              <p className="text-xs text-gray-500">
                Answer a few questions to generate the TSSR/BOQ skeleton
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            disabled={generating}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Skip (fill manually later)"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Parsed info (read-only) */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="grid grid-cols-5 gap-4 mb-2">
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Site ID
              </span>
              <p className="text-sm font-mono font-semibold text-teal-700">
                {radioPlan.siteId}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Site Name
              </span>
              <p className="text-sm font-medium text-gray-900 truncate">
                {tssrData.siteName || "\u2014"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Project
              </span>
              <p className="text-sm font-medium text-gray-900 truncate">
                {radioPlan.project || "\u2014"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Config
              </span>
              <p className="text-sm font-mono font-semibold text-blue-700">
                {radioPlan.config}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Sectors
              </span>
              <p className="text-sm font-semibold text-gray-900">
                {radioPlan.sectors.length}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Sector Azimuths
              </span>
              <p className="text-xs text-gray-700">{sectorSummary}</p>
            </div>
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Technologies
              </span>
              <p className="text-xs text-gray-700">{techSummary || "\u2014"}</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
          {/* Q1: Site Category */}
          <Field label="1. Site category">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "Rooftop",
                  "Tower",
                  "Greenfield/Siteshare",
                  "Barn",
                  "Indoor/Tunnel",
                ] as const
              ).map((opt) => (
                <Chip
                  key={opt}
                  selected={siteCategory === opt}
                  onClick={() => setSiteCategory(opt)}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Q2: New or Upgrade */}
          <Field label="2. New build or upgrade?">
            <div className="flex gap-2">
              <Chip
                selected={buildType === "new"}
                onClick={() => setBuildType("new")}
              >
                New Installation
              </Chip>
              <Chip
                selected={buildType === "existing"}
                onClick={() => setBuildType("existing")}
              >
                Existing Site Upgrade
              </Chip>
            </div>
          </Field>

          {/* Q3: Cabinet Type */}
          <Field label="3. Cabinet type">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["outdoor_2m", "Outdoor (OD 2m)"],
                  ["outdoor_1.2m", "Outdoor (OD 1.2m)"],
                  ["indoor_rack", "Indoor Rack"],
                  ["coloc", "Colocation (no cabinet)"],
                ] as const
              ).map(([val, label]) => (
                <Chip
                  key={val}
                  selected={cabinetType === val}
                  onClick={() => setCabinetType(val as CabinetType)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Q4: Crane */}
          <Field label="4. Crane required?">
            <div className="flex gap-2">
              <Chip selected={craneNeeded} onClick={() => setCraneNeeded(true)}>
                Yes
              </Chip>
              <Chip
                selected={!craneNeeded}
                onClick={() => setCraneNeeded(false)}
              >
                No
              </Chip>
            </div>
          </Field>

          {/* Q5: Electrician */}
          <Field label="5. External electrician needed?">
            <div className="flex gap-2">
              <Chip
                selected={externalElectrician}
                onClick={() => setExternalElectrician(true)}
              >
                Yes
              </Chip>
              <Chip
                selected={!externalElectrician}
                onClick={() => setExternalElectrician(false)}
              >
                No
              </Chip>
            </div>
          </Field>

          {/* Q6: Backup */}
          <Field label="6. Battery backup requirement">
            <div className="flex gap-2">
              <Chip
                selected={backupHours === "2"}
                onClick={() => setBackupHours("2")}
              >
                2 hours
              </Chip>
              <Chip
                selected={backupHours === "4"}
                onClick={() => setBackupHours("4")}
              >
                4 hours
              </Chip>
            </div>
          </Field>

          {/* Q7: Roof Type (conditional on Rooftop or Barn) */}
          {showRoofType && (
            <Field label="7. Roof type">
              <div className="flex gap-2">
                {(
                  [
                    ["Flat", "Flat"],
                    ["Sloped-Inside", "Sloped-Inside"],
                    ["Sloped-Outside", "Sloped-Outside"],
                  ] as const
                ).map(([val, label]) => (
                  <Chip
                    key={val}
                    selected={roofType === val}
                    onClick={() => setRoofType(val as RoofType)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          {/* Q8: Known Deviations */}
          <Field
            label={`${qNum(8)}. Known deviations from Radio Plan? (optional)`}
          >
            <textarea
              value={deviations}
              onChange={(e) => setDeviations(e.target.value)}
              placeholder='Any known issues, special requirements, or deviations from standard... e.g. "Building height is 8.5m not 6.2m as in MoA"'
              className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            onClick={onSkip}
            disabled={generating}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 h-9 px-6 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Generate Project
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const Chip: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, onClick, children }) => (
  <button
    onClick={onClick}
    className={`h-8 px-3 text-sm rounded-lg border transition-colors ${
      selected
        ? "bg-teal-50 border-teal-500 text-teal-700 font-medium"
        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
    }`}
  >
    {children}
  </button>
);
