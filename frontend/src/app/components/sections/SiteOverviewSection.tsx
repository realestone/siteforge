import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSiteContext } from "../../context/SiteContext";
import { RevisionEntry } from "../../types/site";

const VERSION_OPTIONS = [
  "NA",
  "v01",
  "v02",
  "v03",
  "v04",
  "v05",
  "v06",
  "v07",
  "v08",
  "v09",
  "v10",
];

const REVISION_TYPES = ["Visit", "TSSR Produced", "Review", "Power Review"];

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const selectClass = inputClass;
const tableInputClass =
  "w-full px-2 py-1 border border-slate-300 rounded text-sm";
const tableSelectClass = tableInputClass;

export const SiteOverviewSection: React.FC = () => {
  const { tssrData, updateTSSRField } = useSiteContext();

  // ── Revision history handlers ───────────────────────────────

  const addRevision = () => {
    const entries = [...(tssrData.revisionHistory || [])];
    const nextNr = entries.length + 1;
    const nextRev =
      nextNr <= 26 ? String.fromCharCode(64 + nextNr) : String(nextNr);
    const newEntry: RevisionEntry = {
      id: `rev-${Date.now()}`,
      rev: nextRev,
      nr: nextNr,
      name: "",
      company: "",
      type: "Visit",
      date: "",
    };
    updateTSSRField("revisionHistory", [...entries, newEntry]);
  };

  const removeRevision = (id: string) => {
    const entries = (tssrData.revisionHistory || []).filter((e) => e.id !== id);
    const renumbered = entries.map((e, i) => ({
      ...e,
      nr: i + 1,
      rev: i + 1 <= 26 ? String.fromCharCode(65 + i) : String(i + 1),
    }));
    updateTSSRField("revisionHistory", renumbered);
  };

  const updateRevision = (
    id: string,
    field: keyof RevisionEntry,
    value: string | number,
  ) => {
    const entries = (tssrData.revisionHistory || []).map((e) =>
      e.id === id ? { ...e, [field]: value } : e,
    );
    updateTSSRField("revisionHistory", entries);
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            1. SITE IDENTITY & ACCESS
          </h1>
          <p className="text-slate-600">
            Basic site information and documentation
          </p>
        </div>

        <div className="space-y-8">
          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left column — Site Identity */}
            <div className="space-y-6">
              <h2 className="font-semibold text-lg text-slate-900 border-b pb-2">
                Site Identity
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={tssrData.siteName}
                  onChange={(e) => updateTSSRField("siteName", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site ID
                </label>
                <input
                  type="text"
                  value={tssrData.siteId}
                  onChange={(e) => updateTSSRField("siteId", e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site Type
                </label>
                <select
                  value={tssrData.siteType}
                  onChange={(e) => updateTSSRField("siteType", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select...</option>
                  <option value="Private Site">Private Site</option>
                  <option value="Coloc">Coloc</option>
                  <option value="Greenfield">Greenfield</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer
                </label>
                <input
                  type="text"
                  value={tssrData.customer || "ice"}
                  disabled
                  className={`${inputClass} bg-slate-100 text-slate-600`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site Owner
                </label>
                <select
                  value={tssrData.siteOwner}
                  onChange={(e) => updateTSSRField("siteOwner", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select...</option>
                  <option value="ice">ice</option>
                  <option value="Telia Infra">Telia Infra</option>
                  <option value="Telenor Infra">Telenor Infra</option>
                  <option value="Norkring">Norkring</option>
                  <option value="Lyse Tele">Lyse Tele</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site Model/Config
                </label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-mono text-sm">
                  {tssrData.config || "\u2014"}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Auto-calculated from radio plan
                </p>
              </div>
            </div>

            {/* Right column — Supporting Documents */}
            <div className="space-y-6">
              <h2 className="font-semibold text-lg text-slate-900 border-b pb-2">
                Supporting Documents
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site Owner Offer
                </label>
                <select
                  value={tssrData.siteOwnerOffer}
                  onChange={(e) =>
                    updateTSSRField("siteOwnerOffer", e.target.value)
                  }
                  className={selectClass}
                >
                  {VERSION_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montasjeunderlag
                </label>
                <select
                  value={tssrData.montasjeunderlag}
                  onChange={(e) =>
                    updateTSSRField("montasjeunderlag", e.target.value)
                  }
                  className={selectClass}
                >
                  {VERSION_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SART
                </label>
                <select
                  value={tssrData.sart}
                  onChange={(e) => updateTSSRField("sart", e.target.value)}
                  className={selectClass}
                >
                  {VERSION_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Veiviser
                </label>
                <select
                  value={tssrData.veiviser}
                  onChange={(e) => updateTSSRField("veiviser", e.target.value)}
                  className={selectClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  RFSR/RNP
                </label>
                <select
                  value={tssrData.rfsrRnp}
                  onChange={(e) => updateTSSRField("rfsrRnp", e.target.value)}
                  className={selectClass}
                >
                  {VERSION_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Guideline Version
                </label>
                <input
                  type="text"
                  value={tssrData.guidelineVersion}
                  onChange={(e) =>
                    updateTSSRField("guidelineVersion", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Access Information */}
          <div className="space-y-6">
            <h2 className="font-semibold text-lg text-slate-900 border-b pb-2">
              Access Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Veiviser Comments
              </label>
              <textarea
                value={tssrData.veiviserComments}
                onChange={(e) =>
                  updateTSSRField("veiviserComments", e.target.value)
                }
                placeholder="Address, owner, contact person, phone, email, access instructions..."
                rows={4}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                iLOQ Info
              </label>
              <textarea
                value={tssrData.iloqDetails}
                onChange={(e) => updateTSSRField("iloqDetails", e.target.value)}
                placeholder="Specify where iLOQ is to be installed..."
                rows={3}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  TSSR Alignment with SART/MU/RNP
                </label>
                <select
                  value={tssrData.tssrAlignment}
                  onChange={(e) =>
                    updateTSSRField("tssrAlignment", e.target.value)
                  }
                  className={selectClass}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Comments
                </label>
                <input
                  type="text"
                  value={tssrData.tssrAlignmentComments}
                  onChange={(e) =>
                    updateTSSRField("tssrAlignmentComments", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Revision History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg text-slate-900">
                Revision History
              </h2>
              <button
                onClick={addRevision}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>

            {(tssrData.revisionHistory || []).length > 0 && (
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                        Rev
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                        Nr
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                        Company
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tssrData.revisionHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={entry.rev}
                            onChange={(e) =>
                              updateRevision(entry.id, "rev", e.target.value)
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={entry.nr}
                            onChange={(e) =>
                              updateRevision(entry.id, "nr", e.target.value)
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) =>
                              updateRevision(entry.id, "name", e.target.value)
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={entry.company}
                            onChange={(e) =>
                              updateRevision(
                                entry.id,
                                "company",
                                e.target.value,
                              )
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={entry.type}
                            onChange={(e) =>
                              updateRevision(entry.id, "type", e.target.value)
                            }
                            className={tableSelectClass}
                          >
                            {REVISION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={entry.date}
                            onChange={(e) =>
                              updateRevision(entry.id, "date", e.target.value)
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeRevision(entry.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
