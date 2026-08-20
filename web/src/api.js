const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  return (configuredBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export async function generateMarketingDrafts(catalog) {
  const response = await fetch(`${getApiBaseUrl()}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(catalog),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The marketing service returned an unreadable response (${response.status}).`);
  }

  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : "The request could not be completed.";
    throw new Error(`${detail} (HTTP ${response.status})`);
  }

  return payload;
}
