// Hosts Elliot's marketing content generator (Product D) inside the dashboard's Marketing
// tab by embedding his deployed frontend. His app stays independently live and unchanged --
// we only point an iframe at its public URL (integration by reference, no coupling to his code).
// Configurable via VITE_MARKETING_APP_URL; falls back to the known deployment so it works OOTB.
const MARKETING_APP_URL =
  import.meta.env.VITE_MARKETING_APP_URL ??
  "https://riverside-marketing-content-generat.vercel.app";

export function MarketingEmbedPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Marketing Content</h1>
        <a
          className="btn btn-secondary"
          href={MARKETING_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src={MARKETING_APP_URL}
        title="Riverside Marketing Content Generator"
        style={{
          width: "100%",
          height: "calc(100vh - 180px)",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      />
    </div>
  );
}
