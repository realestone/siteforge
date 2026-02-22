import React, { useRef, useState, useCallback } from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";
import { PowerCalcFile } from "../../types/site";
import { parsePowerCalc } from "../../lib/power-calc-parser";
import { DropZone, FileCard, Metric, SmallStat } from "./import-shared";
import { toast } from "sonner";

export const PowerCalcSection: React.FC = () => {
  const { tssrData, updateTSSRField, parsedPowerCalc, setParsedPowerCalc } =
    useSiteContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);

  const pcFile = tssrData.powerCalcFile;

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls" && ext !== "xlsm") {
        toast.error("Please upload an Excel file (.xlsx, .xls, or .xlsm)");
        return;
      }
      setParsing(true);
      try {
        const buffer = await file.arrayBuffer();
        const data = await parsePowerCalc(buffer);

        const meta: PowerCalcFile = {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: Date.now(),
          parsed: true,
          siteId: data.siteInfo.siteId,
          siteName: data.siteInfo.siteName,
          stationOwner: data.siteInfo.stationOwner,
          engineer: data.siteInfo.engineer,
          totalNormalPowerW: data.results.totalNormalPowerW,
          maxPower80W: data.results.maxPowerNormal80W,
          rectifierModules: data.results.rectifierModules,
          batteryStrings2h: data.results.batteryStrings2h,
          rectifierOk: data.rectifierTest.normalOk,
        };
        updateTSSRField("powerCalcFile", meta);
        if (data.siteInfo.siteName) {
          updateTSSRField("siteName", data.siteInfo.siteName);
        }
        if (data.siteInfo.stationOwner) {
          updateTSSRField("siteOwner", data.siteInfo.stationOwner);
        }
        setParsedPowerCalc(data);
        toast.success("Power calculator parsed", {
          description: `${data.results.totalNormalPowerW}W normal, ${data.results.rectifierModules} rectifier modules`,
        });
      } catch (err) {
        console.error("Failed to parse power calculator:", err);
        toast.error("Failed to parse file", {
          description: "Check that the file is a valid Effektkalkulator Excel",
        });
      } finally {
        setParsing(false);
      }
    },
    [updateTSSRField, setParsedPowerCalc],
  );

  const remove = useCallback(() => {
    setParsedPowerCalc(null);
    updateTSSRField("powerCalcFile", null);
    updateTSSRField("siteOwner", "");
    toast.info("Power calculator removed — TSSR fields cleared");
  }, [updateTSSRField, setParsedPowerCalc]);

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
          className="hidden"
        />

        {!pcFile ? (
          <DropZone
            inputRef={fileInputRef}
            dragOver={dragOver}
            setDragOver={setDragOver}
            parsing={parsing}
            onFile={processFile}
            label="Drop Effektkalkulator .xlsx here or click to browse"
            color="amber"
          />
        ) : (
          <div className="space-y-6">
            <FileCard
              icon={<Zap className="h-6 w-6 text-amber-600" />}
              iconBg="bg-amber-100"
              fileName={pcFile.fileName}
              fileSize={pcFile.fileSize}
              uploadedAt={pcFile.uploadedAt}
              onReplace={() => fileInputRef.current?.click()}
              onRemove={remove}
            />

            {pcFile.parsed && parsedPowerCalc && (
              <div className="space-y-6">
                {/* Site info */}
                <div className="grid grid-cols-4 gap-4">
                  <Metric
                    label="Site ID"
                    value={parsedPowerCalc.siteInfo.siteId || "—"}
                    mono
                  />
                  <Metric
                    label="Site Name"
                    value={parsedPowerCalc.siteInfo.siteName || "—"}
                  />
                  <Metric
                    label="Station Owner"
                    value={parsedPowerCalc.siteInfo.stationOwner || "—"}
                  />
                  <Metric
                    label="Engineer"
                    value={parsedPowerCalc.siteInfo.engineer || "—"}
                  />
                </div>

                {/* Input data — only populated quantities */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Input Data — Sector Model Configuration
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Model",
                          "Qty",
                          "Normal (W)",
                          "Avg Normal (W)",
                          "80% Max (W)",
                          "Battery (W)",
                        ].map((h, i) => (
                          <th
                            key={h}
                            className={`px-3 py-2 text-xs font-semibold text-slate-700 ${i === 0 ? "text-left" : "text-right"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPowerCalc.inputs
                        .filter((input) => input.quantity > 0)
                        .map((input, i) => (
                          <tr key={i} className="bg-white hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-xs font-medium">
                              {input.name}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">
                              {input.quantity}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">
                              {input.normalPowerW || "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">
                              {input.avgPowerW || "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">
                              {input.maxPower80W || "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">
                              {input.batteryPowerW || "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* DC Cables */}
                {parsedPowerCalc.dcCables.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      DC Cable Lengths
                    </h3>
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {[
                              "Sector",
                              "Band",
                              "Length (m)",
                              "Cross-section (mm2)",
                            ].map((h, i) => (
                              <th
                                key={h}
                                className={`px-3 py-2 text-xs font-semibold text-slate-700 ${i >= 2 ? "text-right" : "text-left"}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedPowerCalc.dcCables.map((cable, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-semibold text-xs">
                                {cable.sector}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-700">
                                {cable.band}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-xs">
                                {cable.lengthM}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-xs">
                                {cable.crossSection}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Rectifier & Energy */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Rectifier & Energy
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <SmallStat
                    label="Rectifier"
                    value={parsedPowerCalc.rectifierSetup.model || "—"}
                  />
                  <SmallStat
                    label="Modules needed"
                    value={String(
                      parsedPowerCalc.rectifierSetup.minModules ||
                        parsedPowerCalc.results.rectifierModules,
                    )}
                  />
                  <SmallStat
                    label="Setup"
                    value={
                      parsedPowerCalc.rectifierSetup.isNew
                        ? "New rectifier"
                        : "Reuse existing"
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <SmallStat
                    label="Daily"
                    value={`${parsedPowerCalc.energy.dailyKwh.toFixed(1)} kWh`}
                  />
                  <SmallStat
                    label="Monthly"
                    value={`${parsedPowerCalc.energy.monthlyKwh.toFixed(1)} kWh`}
                  />
                  <SmallStat
                    label="Yearly"
                    value={`${parsedPowerCalc.energy.yearlyKwh.toFixed(1)} kWh`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Applied to TSSR — Power data extracted
                  </span>
                </div>
              </div>
            )}

            {/* Fallback: show persisted summary when full parsed data is not in memory */}
            {pcFile.parsed && !parsedPowerCalc && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <Metric label="Site ID" value={pcFile.siteId || "—"} mono />
                  <Metric label="Site Name" value={pcFile.siteName || "—"} />
                  <Metric
                    label="Station Owner"
                    value={pcFile.stationOwner || "—"}
                  />
                  <Metric label="Engineer" value={pcFile.engineer || "—"} />
                </div>

                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Power Summary
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <SmallStat
                    label="Total Normal Power"
                    value={
                      pcFile.totalNormalPowerW
                        ? `${pcFile.totalNormalPowerW} W`
                        : "—"
                    }
                  />
                  <SmallStat
                    label="80% Max Power"
                    value={pcFile.maxPower80W ? `${pcFile.maxPower80W} W` : "—"}
                  />
                  <SmallStat
                    label="Rectifier Modules"
                    value={String(pcFile.rectifierModules ?? "—")}
                  />
                  <SmallStat
                    label="Battery Strings (2h)"
                    value={String(pcFile.batteryStrings2h ?? "—")}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">
                    Applied to TSSR
                  </span>
                  <span className="text-slate-400">
                    — Re-upload file for full detail tables
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
