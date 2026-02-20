import React from "react";
import { Upload, RefreshCw, X, CheckCircle2, AlertTriangle } from "lucide-react";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString("nb-NO");
}

export function DropZone({
  inputRef,
  dragOver,
  setDragOver,
  parsing,
  onFile,
  label,
  color,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  parsing: boolean;
  onFile: (f: File) => void;
  label: string;
  color: "blue" | "amber";
}) {
  const borderActive = color === "blue" ? "border-blue-400 bg-blue-50" : "border-amber-400 bg-amber-50";
  const iconActive = color === "blue" ? "text-blue-500" : "text-amber-500";

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      disabled={parsing}
      className={`w-full rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
        dragOver ? borderActive : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
      } ${parsing ? "opacity-50 cursor-wait" : ""}`}
    >
      <Upload className={`mx-auto mb-3 h-8 w-8 ${dragOver ? iconActive : "text-slate-400"}`} />
      <p className="text-sm font-medium text-slate-700">
        {parsing ? "Parsing..." : label}
      </p>
      <p className="mt-1 text-xs text-slate-500">Accepts Excel files (.xlsx, .xls)</p>
    </button>
  );
}

export function FileCard({
  icon,
  iconBg,
  fileName,
  fileSize,
  uploadedAt,
  onReplace,
  onRemove,
}: {
  icon: React.ReactNode;
  iconBg: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-900 truncate">{fileName}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatFileSize(fileSize)} &middot; Uploaded {formatTimeAgo(uploadedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReplace}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Replace
          </button>
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function Metric({ label, value, mono, blue }: { label: string; value: string; mono?: boolean; blue?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${blue ? "text-blue-700" : "text-slate-900"} ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}

export function RectifierCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold font-mono">{value}</p>
        </div>
        {ok ? (
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-red-600" />
        )}
      </div>
    </div>
  );
}
