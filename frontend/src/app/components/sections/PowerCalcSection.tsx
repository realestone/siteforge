import React, { useRef, useState, useCallback } from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";
import { PowerCalcFile } from "../../types/site";
import { parsePowerCalc } from "../../lib/power-calc-parser";
import { DropZone, FileCard, Metric, SmallStat, RectifierCard } from "./import-shared";
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
                  <Metric label="Site ID" value={parsedPowerCalc.siteInfo.siteId || "—"} mono />
                  <Metric label="Site Name" value={parsedPowerCalc.siteInfo.siteName || "—"} />
                  <Metric label="Station Owner" value={parsedPowerCalc.siteInfo.stationOwner || "—"} />
                  <Metric label="Engineer" value={parsedPowerCalc.siteInfo.engineer || "—"} />
                </div>

                {/* Input data — only populated quantities */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Input Data — Sector Model Configuration
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Model", "Qty", "Normal (W)", "Avg Normal (W)", "80% Max (W)", "Battery (W)"].map((h, i) => (
                          <th key={h} className={`px-3 py-2 text-xs font-semibold text-slate-700 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPowerCalc.inputs
                        .filter((input) => input.quantity > 0)
                        .map((input, i) => (
                          <tr key={i} className="bg-white hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-xs font-medium">{input.name}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">{input.quantity}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">{input.normalPowerW || "—"}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">{input.avgPowerW || "—"}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">{input.maxPower80W || "—"}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs">{input.batteryPowerW || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Power summary */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Power Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs text-amber-700 font-medium">Normal Operation (avg)</p>
                    <p className="text-2xl font-bold font-mono text-amber-900">
                      {parsedPowerCalc.results.totalNormalPowerW.toLocaleString()} W
                    </p>
                    <p className="text-xs text-amber-600 mt-1">{parsedPowerCalc.results.totalNormalPowerKW} kW</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-xs text-orange-700 font-medium">Max 80% (rectifier dimensioning)</p>
                    <p className="text-2xl font-bold font-mono text-orange-900">
                      {parsedPowerCalc.results.maxPowerNormal80W.toLocaleString()} W
                    </p>
                    <p className="text-xs text-orange-600 mt-1">{parsedPowerCalc.results.rectifierModules} rectifier modules</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs text-red-700 font-medium">Battery Mode (first 10 min)</p>
                    <p className="text-2xl font-bold font-mono text-red-900">
                      {parsedPowerCalc.results.totalBatteryPower10minW.toLocaleString()} W
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      After 10 min: {parsedPowerCalc.results.totalBatteryPowerAfter10minW.toLocaleString()} W
                    </p>
                  </div>
                </div>

                {/* Battery & Rectifier side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Battery Backup</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <SmallStat label="Strings needed (2h)" value={String(parsedPowerCalc.results.batteryStrings2h)} />
                      <SmallStat label="Strings needed (4h)" value={String(parsedPowerCalc.results.batteryStrings4h)} />
                      <SmallStat label="Avg 2h (W)" value={parsedPowerCalc.results.avgBatteryPower2hW.toLocaleString()} />
                      <SmallStat label="Avg 4h (W)" value={parsedPowerCalc.results.avgBatteryPower4hW.toLocaleString()} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Rectifier Test</h3>
                    <div className="space-y-3">
                      <RectifierCard
                        label="Normal Operation"
                        value={`${parsedPowerCalc.rectifierTest.availablePowerNormal.toLocaleString()} W available`}
                        ok={parsedPowerCalc.rectifierTest.normalOk}
                      />
                      <RectifierCard
                        label="Battery Mode (per hour)"
                        value={`${parsedPowerCalc.rectifierTest.availablePowerBattery.toLocaleString()} W available`}
                        ok={parsedPowerCalc.rectifierTest.batteryOk}
                      />
                    </div>
                  </div>
                </div>

                {/* DC Cables */}
                {parsedPowerCalc.dcCables.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">DC Cable Lengths</h3>
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {["Sector", "Band", "Length (m)", "Cross-section (mm2)"].map((h, i) => (
                              <th key={h} className={`px-3 py-2 text-xs font-semibold text-slate-700 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedPowerCalc.dcCables.map((cable, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-semibold text-xs">{cable.sector}</td>
                              <td className="px-3 py-1.5 text-xs text-slate-700">{cable.band}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-xs">{cable.lengthM}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-xs">{cable.crossSection}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Energy */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Energy Consumption</h3>
                <div className="grid grid-cols-3 gap-4">
                  <SmallStat label="Daily" value={`${parsedPowerCalc.energy.dailyKwh.toFixed(1)} kWh`} />
                  <SmallStat label="Monthly" value={`${parsedPowerCalc.energy.monthlyKwh.toFixed(1)} kWh`} />
                  <SmallStat label="Yearly" value={`${parsedPowerCalc.energy.yearlyKwh.toFixed(1)} kWh`} />
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Applied to TSSR — Power data extracted
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
