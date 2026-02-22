import { PublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "../lib/msalConfig";

// Helper to get access token silently
async function getToken(
  msalInstance: PublicClientApplication,
): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error("No accounts found. User must sign in first.");
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: graphScopes.files,
      account: accounts[0],
    });
    return response.accessToken;
  } catch (err) {
    console.warn("[MSAL] Silent token acquisition failed:", err);
    throw new Error("Token acquisition failed. Please sign in again.");
  }
}

// Generic Graph API call (JSON responses)
async function callGraph(
  msalInstance: PublicClientApplication,
  endpoint: string,
  options?: RequestInit,
) {
  const token = await getToken(msalInstance);
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Graph API error ${response.status}: ${JSON.stringify(error)}`,
    );
  }

  return response.json();
}

// ── File Browsing ───────────────────────────────────────────────────

export async function listFiles(
  msalInstance: PublicClientApplication,
  folderId?: string,
) {
  const path = folderId
    ? `/me/drive/items/${folderId}/children`
    : `/me/drive/root/children`;
  return callGraph(msalInstance, `${path}?$orderby=name&$top=100`);
}

export async function searchFiles(
  msalInstance: PublicClientApplication,
  query: string,
) {
  return callGraph(
    msalInstance,
    `/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=25`,
  );
}

export async function getFileMetadata(
  msalInstance: PublicClientApplication,
  fileId: string,
) {
  return callGraph(msalInstance, `/me/drive/items/${fileId}`);
}

// ── File Download ───────────────────────────────────────────────────

export async function downloadFile(
  msalInstance: PublicClientApplication,
  fileId: string,
): Promise<Blob> {
  const token = await getToken(msalInstance);
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return response.blob();
}

// ── File Upload ─────────────────────────────────────────────────────

// Upload a file (up to 4MB) to a OneDrive folder by path.
// If the file is locked (423), retries with a timestamped filename.
export async function uploadFile(
  msalInstance: PublicClientApplication,
  folderPath: string,
  fileName: string,
  content: ArrayBuffer | Blob,
) {
  const token = await getToken(msalInstance);
  const uploadUrl = (name: string) =>
    `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}/${encodeURIComponent(name)}:/content`;

  let response = await fetch(uploadUrl(fileName), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: content,
  });

  // 423 = file locked (open in Excel Online). Upload with a new name instead.
  if (response.status === 423) {
    const ts = new Date().toISOString().slice(11, 19).replace(/:/g, "");
    const ext =
      fileName.lastIndexOf(".") >= 0
        ? fileName.slice(fileName.lastIndexOf("."))
        : "";
    const base =
      fileName.lastIndexOf(".") >= 0
        ? fileName.slice(0, fileName.lastIndexOf("."))
        : fileName;
    const newName = `${base}_${ts}${ext}`;
    console.warn(`[Upload] File locked, retrying as ${newName}`);

    response = await fetch(uploadUrl(newName), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    });
  }

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return response.json();
}

// Upload and return metadata including webUrl for editing
export async function uploadAndGetEditUrl(
  msalInstance: PublicClientApplication,
  folderPath: string,
  fileName: string,
  content: ArrayBuffer | Blob,
): Promise<{ fileId: string; webUrl: string; name: string }> {
  const result = await uploadFile(msalInstance, folderPath, fileName, content);
  return {
    fileId: result.id,
    webUrl: result.webUrl,
    name: result.name,
  };
}

// ── Edit URL ────────────────────────────────────────────────────────

// Get the webUrl for opening in Word/Excel Online (full editing in new tab)
export async function getEditUrl(
  msalInstance: PublicClientApplication,
  fileId: string,
): Promise<string> {
  const metadata = await getFileMetadata(msalInstance, fileId);
  return metadata.webUrl;
}

// ── Folder Management ───────────────────────────────────────────────

export async function createFolder(
  msalInstance: PublicClientApplication,
  parentFolderId: string,
  folderName: string,
) {
  return callGraph(msalInstance, `/me/drive/items/${parentFolderId}/children`, {
    method: "POST",
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });
}

// ── Excel REST API ──────────────────────────────────────────────────

export async function writeExcelCell(
  msalInstance: PublicClientApplication,
  fileId: string,
  sheetName: string,
  cellAddress: string,
  value: string | number,
) {
  return callGraph(
    msalInstance,
    `/me/drive/items/${fileId}/workbook/worksheets('${encodeURIComponent(sheetName)}')/range(address='${cellAddress}')`,
    {
      method: "PATCH",
      body: JSON.stringify({ values: [[value]] }),
    },
  );
}

export async function writeExcelRange(
  msalInstance: PublicClientApplication,
  fileId: string,
  sheetName: string,
  rangeAddress: string,
  values: (string | number)[][],
) {
  return callGraph(
    msalInstance,
    `/me/drive/items/${fileId}/workbook/worksheets('${encodeURIComponent(sheetName)}')/range(address='${rangeAddress}')`,
    {
      method: "PATCH",
      body: JSON.stringify({ values }),
    },
  );
}

export async function readExcelRange(
  msalInstance: PublicClientApplication,
  fileId: string,
  sheetName: string,
  rangeAddress: string,
) {
  return callGraph(
    msalInstance,
    `/me/drive/items/${fileId}/workbook/worksheets('${encodeURIComponent(sheetName)}')/range(address='${rangeAddress}')`,
  );
}

// ── Site-Specific Helpers ───────────────────────────────────────────

export async function findSiteDocuments(
  msalInstance: PublicClientApplication,
  siteId: string,
) {
  const results = await searchFiles(msalInstance, siteId);
  return results.value || [];
}

export async function findDocumentsByType(
  msalInstance: PublicClientApplication,
  siteId: string,
  docType:
    | "TSSR"
    | "BOQ"
    | "Effektkalkulator"
    | "RadioPlan"
    | "SART"
    | "Veiviser",
) {
  const query = `${docType} ${siteId}`;
  const results = await searchFiles(msalInstance, query);
  return (results.value || []).filter((f: any) => {
    const name = f.name?.toLowerCase() || "";
    switch (docType) {
      case "TSSR":
        return name.includes("tssr") && name.endsWith(".docx");
      case "BOQ":
        return (
          (name.includes("boq") || name.includes("bill")) &&
          (name.endsWith(".xlsx") || name.endsWith(".xlsm"))
        );
      case "Effektkalkulator":
        return name.includes("effekt") && name.endsWith(".xlsx");
      case "RadioPlan":
        return (
          (name.includes("radio") || name.includes("flow")) &&
          name.endsWith(".xlsx")
        );
      case "SART":
        return name.includes("sart");
      case "Veiviser":
        return name.includes("veiviser");
      default:
        return true;
    }
  });
}
