import type { BOQItem } from "../types/site";

/**
 * Export BOQ items to .xlsx using SheetJS.
 * Dynamic import keeps the ~300KB bundle out of initial load.
 */
export async function downloadBOQExcel(
  items: BOQItem[],
  fileName = "boq-export.xlsx",
) {
  const XLSX = await import("xlsx");

  // Group items by sheet name, fallback to "BoQ"
  const sheets = new Map<string, BOQItem[]>();
  for (const item of items) {
    const sheet = item.sheetName || "BoQ";
    const list = sheets.get(sheet) || [];
    list.push(item);
    sheets.set(sheet, list);
  }

  const wb = XLSX.utils.book_new();

  for (const [sheetName, sheetItems] of sheets) {
    // Sort by rowIndex to match original Excel order
    const sorted = [...sheetItems].sort(
      (a, b) => (a.rowIndex ?? 0) - (b.rowIndex ?? 0),
    );

    const rows = sorted.map((item) => ({
      "Product Code": item.productCode,
      Description: item.description,
      Quantity: item.quantity,
      Comments: item.comments || "",
      "Ordering Hints": item.orderingHints || "",
      Category: item.productCategory,
      Subcategory: item.productSubcategory || "",
      Vendor: item.vendor || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, // Product Code
      { wch: 45 }, // Description
      { wch: 10 }, // Quantity
      { wch: 25 }, // Comments
      { wch: 25 }, // Ordering Hints
      { wch: 18 }, // Category
      { wch: 18 }, // Subcategory
      { wch: 15 }, // Vendor
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, fileName);
}

/**
 * Export BOQ items to CSV.
 */
export async function downloadBOQCsv(
  items: BOQItem[],
  fileName = "boq-export.csv",
) {
  const XLSX = await import("xlsx");

  const rows = items.map((item) => ({
    "Product Code": item.productCode,
    Description: item.description,
    Quantity: item.quantity,
    Comments: item.comments || "",
    Category: item.productCategory,
    Vendor: item.vendor || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
