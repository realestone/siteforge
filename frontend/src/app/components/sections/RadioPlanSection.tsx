import React, { useRef, useState, useCallback } from "react";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";
import { RadioPlanFile } from "../../types/site";
import { parseRadioPlan } from "../../lib/radio-plan-parser";
import { DropZone, FileCard, Metric } from "./import-shared";
import { toast } from "sonner";

export const RadioPlanSection: React.FC = () => {
  const { tssrData, updateTSSRField, parsedRadioPlan, setParsedRadioPlan } =
    useSiteContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);

  const rpFile = tssrData.radioPlanFile;

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      setParsing(true);
      try {
        const buffer = await file.arrayBuffer();
        const data = await parseRadioPlan(buffer);

        const meta: RadioPlanFile = {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: Date.now(),
          parsed: true,
          siteId: data.siteId,
          project: data.project,
          config: data.config,
          sectorCount: data.sectors.length,
          totalCells: data.totalCells,
        };
        updateTSSRField("radioPlanFile", meta);
        updateTSSRField("siteId", data.siteId);
        updateTSSRField("sectors", data.sectors.length);
        updateTSSRField("config", data.config);
        updateTSSRField(
          "sectorData",
          data.sectors.map((s) => ({
            id: s.id,
            azimuth: s.azimuth,
            mTilt: s.mTilt,
            eTilt: s.eTilt,
            antennas: s.antennas,
            cableRoute: s.feedLength ?? 0,
          })),
        );
        setParsedRadioPlan(data);
        toast.success("Radio plan parsed", {
          description: `${data.sectors.length} sectors, ${data.totalCells} cells extracted`,
        });
      } catch (err) {
        console.error("Failed to parse radio plan:", err);
        toast.error("Failed to parse file", {
          description: "Check that the file is a valid radio plan Excel",
        });
      } finally {
        setParsing(false);
      }
    },
    [updateTSSRField, setParsedRadioPlan],
  );

  const remove = useCallback(() => {
    setParsedRadioPlan(null);
    updateTSSRField("radioPlanFile", null);
    updateTSSRField("siteId", "");
    updateTSSRField("sectors", 0);
    updateTSSRField("config", "");
    updateTSSRField("sectorData", []);
    toast.info("Radio plan removed — TSSR fields cleared");
  }, [updateTSSRField, setParsedRadioPlan]);

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
          className="hidden"
        />

        {!rpFile ? (
          <DropZone
            inputRef={fileInputRef}
            dragOver={dragOver}
            setDragOver={setDragOver}
            parsing={parsing}
            onFile={processFile}
            label="Drop Radio Plan .xlsx here or click to browse"
            color="blue"
          />
        ) : (
          <div className="space-y-6">
            <FileCard
              icon={<FileSpreadsheet className="h-6 w-6 text-green-600" />}
              iconBg="bg-green-100"
              fileName={rpFile.fileName}
              fileSize={rpFile.fileSize}
              uploadedAt={rpFile.uploadedAt}
              onReplace={() => fileInputRef.current?.click()}
              onRemove={remove}
            />

            {rpFile.parsed && (
              <div className="space-y-6">
                <div className="grid grid-cols-5 gap-4">
                  <Metric label="Site ID" value={rpFile.siteId || "—"} mono />
                  <Metric label="Project" value={rpFile.project || "—"} />
                  <Metric label="Config" value={rpFile.config || "—"} mono blue />
                  <Metric label="Sectors" value={String(rpFile.sectorCount ?? "—")} />
                  <Metric label="Total Cells" value={String(rpFile.totalCells ?? "—")} />
                </div>

                {parsedRadioPlan && parsedRadioPlan.sectors.length > 0 && (
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Sector", "Azimuth", "M.Tilt", "E.Tilt", "Antennas", "Technologies", "Cells"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-700">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRadioPlan.sectors.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-900">{s.id}</td>
                            <td className="px-3 py-2 font-mono text-sm">{s.azimuth}&deg;</td>
                            <td className="px-3 py-2 font-mono text-sm">{s.mTilt}</td>
                            <td className="px-3 py-2 font-mono text-sm">{s.eTilt}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{s.antennas.map((a) => a.split("-")[0]).join(", ")}</td>
                            <td className="px-3 py-2 text-sm">{s.technologies.join(" + ")}</td>
                            <td className="px-3 py-2 text-sm font-mono">{s.cells.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {parsedRadioPlan && parsedRadioPlan.rawRows.length > 0 && (() => {
                  const techGroups = new Map<string, typeof parsedRadioPlan.rawRows>();
                  for (const cell of parsedRadioPlan.rawRows) {
                    const tech = cell.technology || "Other";
                    if (!techGroups.has(tech)) techGroups.set(tech, []);
                    techGroups.get(tech)!.push(cell);
                  }
                  const order = ["LTE", "NR"];
                  const sorted = [...techGroups.entries()].sort(([a], [b]) => {
                    const ai = order.indexOf(a);
                    const bi = order.indexOf(b);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  });

                  return sorted.map(([tech, cells]) => (
                    <div key={tech} className="space-y-2">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${
                        tech === "NR" ? "text-purple-700" : tech === "LTE" ? "text-blue-700" : "text-slate-700"
                      }`}>
                        {tech} CELLS ({cells.length})
                      </h3>
                      <div className="border border-slate-300 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              {["CellId", "Antenna", "Height", "Azim", "MT", "ET", "Cable", "Jumpers"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-700">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cells.map((cell, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-3 py-1.5 font-mono text-xs">{cell.cellId}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-700">{cell.antennaType}</td>
                                <td className="px-3 py-1.5 font-mono text-xs">{cell.height ?? "—"}</td>
                                <td className="px-3 py-1.5 font-mono text-xs">{cell.azimuth ?? "—"}&deg;</td>
                                <td className="px-3 py-1.5 font-mono text-xs">{cell.mTilt ?? "—"}</td>
                                <td className="px-3 py-1.5 font-mono text-xs">{cell.eTilt ?? "—"}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-600">{cell.cableType}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-600">{cell.jumpers}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ));
                })()}

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Applied to TSSR — Site ID, sectors, and config populated
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
