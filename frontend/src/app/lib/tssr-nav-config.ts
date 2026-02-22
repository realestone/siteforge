import { TSSRData } from "../types/site";

// ── Section & Group IDs ─────────────────────────────────────────

export type SectionId =
  | "radio-plan"
  | "power-calculator"
  | "planned-works"
  | "overview"
  | "as-built-deviations";

export type GroupId =
  | "site-import"
  | "planned-works"
  | "site-identity-access"
  | "as-built";

// ── Navigation Tree Data ────────────────────────────────────────

export interface NavSection {
  id: SectionId;
  label: string;
  iconName: string; // lucide icon name, resolved in component
  description: string;
  requiredFields: (keyof TSSRData)[];
  optionalFields: (keyof TSSRData)[];
  iconBg: string; // Tailwind bg class for the content area icon badge
  iconColor: string; // Tailwind text class for the content area icon
}

export interface NavGroup {
  id: GroupId;
  label: string;
  sections: NavSection[];
}

export const NAV_TREE: NavGroup[] = [
  {
    id: "site-import",
    label: "Site Import",
    sections: [
      {
        id: "radio-plan",
        label: "Radio Plan",
        iconName: "FileSpreadsheet",
        description: "Upload Excel radio plan",
        requiredFields: [],
        optionalFields: [],
        iconBg: "bg-violet-100",
        iconColor: "text-violet-600",
      },
      {
        id: "power-calculator",
        label: "Effektkalkulator",
        iconName: "Zap",
        description: "Upload power calculator spreadsheet",
        requiredFields: [],
        optionalFields: [],
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
      },
    ],
  },
  {
    id: "planned-works",
    label: "Planned Works",
    sections: [
      {
        id: "planned-works",
        label: "Planned Works",
        iconName: "ClipboardList",
        description: "Auto-generated description of planned works (TSSR §1.1)",
        requiredFields: [],
        optionalFields: [],
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
      },
    ],
  },
  {
    id: "site-identity-access",
    label: "Site Identity & Access",
    sections: [
      {
        id: "overview",
        label: "Overview (Combined)",
        iconName: "LayoutDashboard",
        description: "Site identity, access, documents, and TSSR alignment",
        requiredFields: ["siteId", "siteName"],
        optionalFields: [
          "siteType",
          "siteOwner",
          "siteOwnerOffer",
          "montasjeunderlag",
          "sart",
          "veiviser",
          "rfsrRnp",
          "guidelineVersion",
          "veiviserComments",
          "tssrAlignment",
        ],
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
      },
    ],
  },
  {
    id: "as-built",
    label: "As-Built",
    sections: [
      {
        id: "as-built-deviations",
        label: "Deviation Report",
        iconName: "FileWarning",
        description: "As-built deviations from planned BOQ and build tasks",
        requiredFields: [],
        optionalFields: [],
        iconBg: "bg-orange-100",
        iconColor: "text-orange-600",
      },
    ],
  },
];

// ── Completion Logic ────────────────────────────────────────────

export type CompletionStatus = "complete" | "partial" | "empty";

export interface CompletionResult {
  status: CompletionStatus;
  percent: number;
}

const allSections = NAV_TREE.flatMap((g) => g.sections);

export function getSectionConfig(sectionId: SectionId): NavSection | undefined {
  return allSections.find((s) => s.id === sectionId);
}

export function computeSectionCompletion(
  sectionId: SectionId,
  tssrData: TSSRData,
): CompletionResult {
  const section = getSectionConfig(sectionId);
  if (!section) return { status: "empty", percent: 0 };

  const fields = [...section.requiredFields, ...section.optionalFields];

  if (fields.length === 0) return { status: "empty", percent: 0 };

  let filled = 0;
  for (const field of fields) {
    const value = tssrData[field as keyof TSSRData];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && value === 0) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    // Booleans always count as filled (even false is a deliberate choice)
    if (typeof value === "boolean") {
      filled++;
      continue;
    }
    filled++;
  }

  const percent = Math.round((filled / fields.length) * 100);
  if (percent === 0) return { status: "empty", percent: 0 };
  if (percent === 100) return { status: "complete", percent: 100 };
  return { status: "partial", percent };
}
