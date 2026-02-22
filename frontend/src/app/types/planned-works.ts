export interface ManualField {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  type: "text" | "number" | "select";
  options?: string[];
}

export interface WorkItem {
  id: string;
  text: string;
  source: "generated" | "template" | "manual";
  locked: boolean;
  overridden: boolean;
  originalText?: string;
  derivation?: string;
  warning?: string;
  manualFields?: ManualField[];
  boqItems?: string[];
  order: number;
}

export interface PlannedWorksSection {
  id: string;
  title: string;
  type: "template" | "auto" | "manual" | "hybrid";
  items: WorkItem[];
  collapsed: boolean;
}

export interface PlannedWorksState {
  sections: PlannedWorksSection[];
  generatedAt: number;
  sourceVersions: { radioPlanHash?: string; powerCalcHash?: string };
}
