/**
 * Planned Works Generator — produces TSSR §1.1 "Description of Planned Works"
 * from parsed Radio Plan + Effektkalkulator data.
 *
 * Pure functions, no side effects. All text generation is deterministic.
 */

import type { RadioPlanData } from "./radio-plan-parser";
import type { PowerCalcData } from "./power-calc-parser";
import type {
  WorkItem,
  PlannedWorksSection,
  PlannedWorksState,
  ManualField,
} from "../types/planned-works";

// ── Helpers ─────────────────────────────────────────────────────

let _itemCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_itemCounter}`;
}

function genItem(
  prefix: string,
  text: string,
  source: WorkItem["source"],
  opts?: Partial<WorkItem>,
): WorkItem {
  return {
    id: nextId(prefix),
    text,
    source,
    locked: source !== "manual",
    overridden: false,
    order: 0,
    ...opts,
  };
}

function section(
  id: string,
  title: string,
  type: PlannedWorksSection["type"],
  items: WorkItem[],
): PlannedWorksSection {
  items.forEach((item, i) => (item.order = i));
  return { id, title, type, items, collapsed: false };
}

// ── Section 1: Safety ───────────────────────────────────────────

const SAFETY_TEXTS = [
  "SJA to be filled out for all jobs before work is conducted. If conditions on site change, a new SJA must be filled out.",
  "The risk assessment shall be carried out even if the work is of short duration.",
  "Working area for crane/lift must be marked and secured.",
  "Keep the rooftop surface clean and free of trip hazards, or slippery materials.",
  "Consider additional safety measures for rooftop work in extreme weather conditions.",
  "Conduct regular inspections of rooftop safety measures and equipment to identify and address potential hazards.",
  "Required PPE (harness, helmet, gloves, ear protection, protective glasses) must be easily accessible at any given moment while working on site. Same goes for First aid kit and fire extinguisher (6 kg min).",
  "See chapter 1.2 for more details.",
];

function generateSafety(): PlannedWorksSection {
  const items = SAFETY_TEXTS.map((text) => genItem("safety", text, "template"));
  return section("safety", "Safety on roof/mast", "template", items);
}

// ── Section 2: Site room ────────────────────────────────────────

function generateSiteRoom(
  rp: RadioPlanData | null,
  pc: PowerCalcData | null,
): PlannedWorksSection {
  const items: WorkItem[] = [];

  items.push(
    genItem(
      "room",
      "Install the GR129-03 frame for the Eltek OD cabinet and ACDB.",
      "generated",
      { derivation: "Standard OD frame for outdoor cabinet", boqItems: ["GR129-03"] },
    ),
  );

  items.push(
    genItem(
      "room",
      "Install a JR115 04 ground rail on the frame and terminate it with a 50 mm² grounding cable connected directly to the main grounding point.",
      "generated",
      { boqItems: ["JR115-04"] },
    ),
  );

  const cabinetName = pc
    ? `Eltek FP2 48V ${pc.cabinetType} 2x3p230V T3 Outdoor 2m`
    : "Eltek FP2 48V cabinet";
  items.push(
    genItem("room", `Install the ${cabinetName} on the frame.`, "generated", {
      derivation: pc
        ? `Cabinet from rectifier model: ${pc.rectifierSetup.model}`
        : "Cabinet type unknown — upload Effektkalkulator",
    }),
  );

  const modules = pc?.results.rectifierModules ?? "?";
  const strings = pc?.results.batteryStrings2h ?? "?";
  items.push(
    genItem(
      "room",
      `Equip rectifier with ${modules} power modules and ${strings}×190Ah battery sets.`,
      "generated",
      {
        derivation: pc
          ? `B31=${modules} modules, B39=${strings} strings`
          : "Upload Effektkalkulator for values",
      },
    ),
  );

  items.push(
    genItem(
      "room",
      "Install the OD ACDB with DCDU on the frame using HUP mounts.",
      "generated",
      { boqItems: ["ACDB-OD", "DCDU", "GR120-13-P31-EL"] },
    ),
  );

  // ABIO count: Large config (≥3 large sectors) → 2, else 1
  const largeSectors = pc
    ? pc.inputs.find((i) => i.name === "Large")?.quantity ?? 0
    : rp
      ? rp.sectors.filter((s) => s.aqqyCount > 0).length
      : 0;
  const abioCount = largeSectors >= 3 ? 2 : 1;
  const asibCount = 1;
  items.push(
    genItem(
      "room",
      `Install Airscale with ${asibCount} ASIB, ${abioCount} ABIO, to be powered from Eltek PDU.`,
      "generated",
      {
        derivation: `Large sectors=${largeSectors} → ABIO=${abioCount}`,
      },
    ),
  );

  items.push(
    genItem("room", "Install ILOQ.", "generated", { boqItems: ["ILOQ"] }),
  );

  return section("site-room", "Site room", "auto", items);
}

// ── Section 3: Transmission ─────────────────────────────────────

function generateTransmission(): PlannedWorksSection {
  const manualFields: ManualField[] = [
    {
      id: "tx_description",
      label: "Transmission solution",
      value: "",
      placeholder:
        "e.g., EHS 260625: Telenor OTC, 2G Løpe nr 4013",
      type: "text",
    },
  ];
  const items = [
    genItem("tx", "", "manual", { locked: false, manualFields }),
  ];
  return section("transmission", "Transmission", "manual", items);
}

// ── Section 4: AC Distribution ──────────────────────────────────

function generateACDistribution(
  pc: PowerCalcData | null,
): PlannedWorksSection {
  const items: WorkItem[] = [];

  const gridInfo = pc
    ? `Grid: ${pc.gridSystem} | Standard breaker: ${pc.acBreaker}`
    : "Upload Effektkalkulator for AC specs";

  const manualFields: ManualField[] = [
    {
      id: "electrician_scope",
      label: "Third-party electrician scope",
      value: "",
      placeholder:
        "At the request of the site owner, the electrical power supply scope will be carried out by [company name]...",
      type: "text",
    },
  ];

  items.push(
    genItem("ac", "", "manual", {
      locked: false,
      warning: gridInfo,
      manualFields,
    }),
  );

  items.push(
    genItem(
      "ac",
      "Install ACDB with DCDU on the left side besides the cabinet on ordered beams.",
      "generated",
    ),
  );

  items.push(
    genItem("ac", "Install smart meter inside the ACDB.", "generated", {
      boqItems: ["SMART-METER"],
    }),
  );

  items.push(
    genItem(
      "ac",
      "Install 2 pcs AC Cables from ACDB to Rectifier.",
      "generated",
      { derivation: "Standard 2x AC feed for 3-phase rectifier" },
    ),
  );

  return section("ac-distribution", "AC Distribution", "hybrid", items);
}

// ── Section 5: Cables and cable route ───────────────────────────

function generateCables(
  rp: RadioPlanData | null,
  pc: PowerCalcData | null,
): PlannedWorksSection {
  const items: WorkItem[] = [];

  const sectorCount = rp?.sectors.length ?? 0;
  const totalRrh = rp
    ? rp.sectors.reduce((s, sec) => s + sec.totalRrh, 0)
    : 0;
  const totalAqqy = rp?.totalAqqy ?? 0;
  const totalAntennas = rp?.totalAntennas ?? 0;
  const totalLbRrh = rp?.totalLbRrh ?? 0;

  const dcCount = pc?.dcCables.length ?? sectorCount * 3;
  const trunkFiber = Math.ceil(sectorCount / 2);
  const patchFiber = (totalRrh + totalAqqy) * 2;
  const jumperCount = totalAntennas * 4 + totalAqqy * 4;
  const retCount = totalLbRrh;

  // Cable ladder — manual measurements needed
  const cableLadderFields: ManualField[] = [
    {
      id: "cable_total_m",
      label: "Total length (m)",
      value: "",
      placeholder: "52",
      type: "number",
    },
    {
      id: "cable_wall_m",
      label: "Wall section (m)",
      value: "",
      placeholder: "7",
      type: "number",
    },
    {
      id: "cable_roof_m",
      label: "Roof section (m)",
      value: "",
      placeholder: "45",
      type: "number",
    },
  ];
  items.push(
    genItem(
      "cable",
      "Install the cable ladder path from the outdoor cabinet to the RRHs.",
      "generated",
      { locked: false, manualFields: cableLadderFields },
    ),
  );

  items.push(
    genItem(
      "cable",
      `Install ${dcCount} pcs of DC cables (Table 3.5).`,
      "generated",
      {
        derivation: `${sectorCount} sectors × 3 RRH types = ${dcCount} DC cables`,
      },
    ),
  );

  items.push(
    genItem(
      "cable",
      `Install ${trunkFiber} pcs of main fiber cables (Table 4.3).`,
      "generated",
      {
        derivation: `ceil(${sectorCount} sectors / 2) = ${trunkFiber} ATOA trunk fibers`,
      },
    ),
  );

  items.push(
    genItem(
      "cable",
      `Install ${patchFiber} pcs of fiber cables from ATOA to RRHs and AQQYs (Table 4.3).`,
      "generated",
      {
        derivation: `(${totalRrh} RRHs + ${totalAqqy} AQQYs) × 2 = ${patchFiber}`,
      },
    ),
  );

  items.push(
    genItem(
      "cable",
      `Install ${jumperCount} pcs of jumper cables (Table 4.3).`,
      "generated",
      {
        derivation: `(${totalAntennas} antennas × 4) + (${totalAqqy} AQQYs × 4) = ${jumperCount}`,
      },
    ),
  );

  if (retCount > 0) {
    items.push(
      genItem(
        "cable",
        `Install ${retCount} pcs of RET cables (Table 3.4).`,
        "generated",
        {
          derivation: `${totalLbRrh} LB RRHs × 1 RET each = ${retCount}`,
        },
      ),
    );
  }

  items.push(
    genItem(
      "cable",
      "Install a grounding cable to ground all sectors, including the cable ladder.",
      "generated",
      { boqItems: ["RQ-PURE-25MM2"] },
    ),
  );

  return section("cables", "Cables and cable route", "auto", items);
}

// ── Section 6: Antenna mounts (one per mount group) ─────────────

function generateAntennaMounts(
  rp: RadioPlanData,
): PlannedWorksSection[] {
  const isLargeConfig = rp.totalAqqy > 0 && rp.sectors.length >= 3;

  return rp.mountGroups.map((group, gi) => {
    const items: WorkItem[] = [];
    const sectorLabels = group.sectorIds.join("/");
    const prefix = `mount-${gi}`;

    // Collect all heights across sectors in this group
    const allHeights = new Set<number>();
    for (const sId of group.sectorIds) {
      const sec = rp.sectors.find((s) => s.id === sId);
      if (sec) sec.heights.forEach((h) => allHeights.add(h));
    }

    // Height warning if multiple distinct heights
    if (allHeights.size > 1) {
      const sorted = [...allHeights].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const estimatedMoA = (max + 1.6).toFixed(1);
      items.push(
        genItem(
          prefix,
          `Check the height of the roof. It should be about ${min} meters. In this case, MoA will be about ${estimatedMoA} meters, not ${min} meters as indicated in the radio plan grid.`,
          "generated",
          {
            warning: `Height discrepancy: passive=${min}m, AQQY=${max}m`,
            derivation: `Height mismatch between passive antenna and AQQY rows: ${sorted.join(", ")}`,
          },
        ),
      );
    }

    // Mount frame
    const mountLabel =
      group.sectorIds.length >= 2 ? "985300" : "980300";
    items.push(
      genItem(
        prefix,
        `Install ${mountLabel} FS for ${group.sectorIds.length} large sector${group.sectorIds.length > 1 ? "s" : ""}.`,
        "generated",
        { boqItems: [mountLabel] },
      ),
    );

    // Per-sector antenna details
    for (const sId of group.sectorIds) {
      const sec = rp.sectors.find((s) => s.id === sId);
      if (!sec) continue;

      if (sec.antennaModel && sec.aqqyCount > 0) {
        const tiltNote =
          sec.mTilt !== 0
            ? ` (Mech. tilt is ${sec.mTilt} deg)`
            : "";
        items.push(
          genItem(
            prefix,
            `Install 1 pcs AQQY and 1 pcs ${sec.antennaModel} antenna${tiltNote} (${sId} sector).`,
            "generated",
            {
              derivation: `Sector ${sId}: passive=${sec.antennaModel}, AQQY present, MT=${sec.mTilt}`,
            },
          ),
        );
      } else if (sec.antennaModel) {
        items.push(
          genItem(
            prefix,
            `Install 1 pcs ${sec.antennaModel} antenna (${sId} sector).`,
            "generated",
          ),
        );
      }
    }

    // RRHs + ATOA
    const groupRrh = group.rrhCount;
    const amrcPrefix =
      group.sectorIds.length >= 2 ? `${group.sectorIds.length}x ` : "";
    items.push(
      genItem(
        prefix,
        `Install ${groupRrh} RRHs and ATOA on the pipe using ${amrcPrefix}AMRC rails and FPKA.`,
        "generated",
        { boqItems: ["FPKA", "AMRC", "ATOA"] },
      ),
    );

    // Jumpers for this group
    const groupJumpers = group.sectorIds.reduce((sum, sId) => {
      const sec = rp.sectors.find((s) => s.id === sId);
      if (!sec) return sum;
      return sum + (sec.antennaModel ? 4 : 0) + sec.aqqyCount * 4;
    }, 0);
    items.push(
      genItem(
        prefix,
        `Install ${groupJumpers} pcs jumpers.`,
        "generated",
      ),
    );

    // RET cables
    const groupRet = group.sectorIds.reduce((sum, sId) => {
      const sec = rp.sectors.find((s) => s.id === sId);
      return sum + (sec?.lbRrh ?? 0);
    }, 0);
    if (groupRet > 0) {
      items.push(
        genItem(
          prefix,
          `Install ${groupRet} RET cable${groupRet > 1 ? "s" : ""} for LB radio${groupRet > 1 ? "s" : ""}.`,
          "generated",
        ),
      );
    }

    // GPS on first/largest mount group (Large config only)
    if (isLargeConfig && gi === 0) {
      items.push(
        genItem(
          prefix,
          "Install new GPS (Antenna to be installed with clear sky facing south).",
          "generated",
          { boqItems: ["FYMA", "FTSH", "AYGE"] },
        ),
      );
    }

    // Fiber coil
    items.push(
      genItem(
        prefix,
        "Install fiber coil for excess fiber cable.",
        "generated",
      ),
    );

    return section(
      `antenna-mount-${gi}`,
      `Antenna mounts — Sector ${sectorLabels}`,
      "auto",
      items,
    );
  });
}

// ── Section 7: Other tasks ──────────────────────────────────────

const OTHER_TASKS_TEXTS = [
  "Do cleanup and ASBUILT.",
  "Do walk test after site is integrated.",
  "Update group chart for ACDB make new group chart for DCDU.",
  "Take pictures inside/open connector, of every DC connector for As Built Documentation.",
  "Provide pictures of antenna mounts and all reinforcements made to the wall mounts in the ABD documentation.",
  "When installing or modifying an ICE rectifier: make sure to deliver filled in and signed off document, ICE Rectifier Alarm testing Rev 4.1, as part of the asbuilt documentation.",
];

function generateOtherTasks(isRooftop: boolean): PlannedWorksSection {
  const texts = [...OTHER_TASKS_TEXTS];
  if (isRooftop) {
    texts.push(
      "Mark the rooftop entrance with an EMF warning sticker.",
    );
  }
  const items = texts.map((text) =>
    genItem("other", text, "template"),
  );
  return section("other-tasks", "Other tasks", "template", items);
}

// ── Main generator ──────────────────────────────────────────────

export function generatePlannedWorks(
  radioPlan: RadioPlanData | null,
  powerCalc: PowerCalcData | null,
  existingState?: PlannedWorksState | null,
): PlannedWorksState {
  // Reset counter for deterministic IDs within a generation run
  _itemCounter = 0;

  const sections: PlannedWorksSection[] = [];

  // 1. Safety
  sections.push(generateSafety());

  // 2. Site room
  sections.push(generateSiteRoom(radioPlan, powerCalc));

  // 3. Transmission
  sections.push(generateTransmission());

  // 4. AC Distribution
  sections.push(generateACDistribution(powerCalc));

  // 5. Cables
  sections.push(generateCables(radioPlan, powerCalc));

  // 6. Antenna mounts (one section per mount group)
  if (radioPlan && radioPlan.mountGroups.length > 0) {
    sections.push(...generateAntennaMounts(radioPlan));
  }

  // 7. Other tasks (assume rooftop for now — could use siteCategory from TSSR)
  sections.push(generateOtherTasks(true));

  // Preserve user edits from existing state
  if (existingState) {
    preserveEdits(sections, existingState.sections);
  }

  return {
    sections,
    generatedAt: Date.now(),
    sourceVersions: {
      radioPlanHash: radioPlan ? String(radioPlan.totalCells) : undefined,
      powerCalcHash: powerCalc
        ? String(powerCalc.results.rectifierModules)
        : undefined,
    },
  };
}

/**
 * Preserve user edits: if an existing item was overridden (user changed text),
 * carry that override into the regenerated state. Manual items added by user
 * are appended at the end of their section.
 */
function preserveEdits(
  newSections: PlannedWorksSection[],
  oldSections: PlannedWorksSection[],
): void {
  for (const newSec of newSections) {
    const oldSec = oldSections.find((s) => s.id === newSec.id);
    if (!oldSec) continue;

    // Match items by ID and preserve overrides
    for (const newItem of newSec.items) {
      const oldItem = oldSec.items.find((i) => i.id === newItem.id);
      if (oldItem?.overridden) {
        newItem.text = oldItem.text;
        newItem.overridden = true;
        newItem.originalText = newItem.text;
        newItem.locked = false;
      }
      // Preserve manual field values
      if (oldItem?.manualFields && newItem.manualFields) {
        for (const newField of newItem.manualFields) {
          const oldField = oldItem.manualFields.find(
            (f) => f.id === newField.id,
          );
          if (oldField?.value) {
            newField.value = oldField.value;
          }
        }
      }
    }

    // Append user-added manual items
    const userItems = oldSec.items.filter(
      (i) => i.source === "manual" && !newSec.items.some((n) => n.id === i.id),
    );
    for (const ui of userItems) {
      ui.order = newSec.items.length;
      newSec.items.push(ui);
    }
  }
}
