const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return import.meta.env.DEV ? LOCAL_API_BASE_URL : "";
}

export async function generateMarketingDrafts(catalog) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("The marketing service URL is not configured for this deployment.");
  }

  const response = await fetch(`${apiBaseUrl}/generate`, {
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
