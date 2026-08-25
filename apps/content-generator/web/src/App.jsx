import { useState } from "react";
import { generateMarketingDrafts } from "./api";
import { formatCatalog, parseCatalogText, SAMPLE_CATALOG } from "./catalog";

function Stat({ label, value, tone = "neutral" }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function DraftCard({ draft }) {
  return (
    <article className="draft-card">
      <div className="card-meta">
        <span className="type-badge">{draft.content_type.replaceAll("_", " ")}</span>
        <span className="book-id">{draft.book_id}</span>
      </div>
      <h3>{draft.headline}</h3>
      <p className="body-copy">{draft.body_copy}</p>
      <details>
        <summary>Why this draft was generated</summary>
        <p>{draft.reason}</p>
        <p className="source-fields">Source fields: {draft.source_fields.join(", ")}</p>
      </details>
    </article>
  );
}

function Diagnostics({ diagnostics }) {
  return (
    <section className="diagnostics-section" aria-labelledby="diagnostics-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Traceable review</p>
          <h2 id="diagnostics-title">Validation diagnostics</h2>
        </div>
        <span className="section-count">{diagnostics.length} records checked</span>
      </div>
      <div className="diagnostic-list">
        {diagnostics.map((diagnostic) => (
          <div className={`diagnostic-row ${diagnostic.valid ? "is-valid" : "is-rejected"}`} key={diagnostic.index}>
            <div className="diagnostic-status">
              <span className="status-dot" aria-hidden="true" />
              <strong>Record {diagnostic.index + 1}</strong>
              <span>{diagnostic.book_id || "No book ID"}</span>
            </div>
            {diagnostic.valid ? (
              <span className="diagnostic-message">Valid catalog record</span>
            ) : (
              <ul className="diagnostic-errors">
                {diagnostic.errors.map((error) => (
                  <li key={`${diagnostic.index}-${error.path}`}>
                    <code>{error.path}</code> {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function RejectedRecords({ records }) {
  return (
    <section className="rejected-section" aria-labelledby="rejected-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Needs attention</p>
          <h2 id="rejected-title">Rejected records</h2>
        </div>
        <span className="section-count">{records.length} rejected</span>
      </div>
      {records.length === 0 ? (
        <div className="empty-inline success-inline">All catalog records were accepted.</div>
      ) : (
        <div className="rejected-list">
          {records.map((item) => (
            <details className="rejected-card" key={item.index}>
              <summary>
                <span>Record {item.index + 1}</span>
                <span>{item.record.book_id || "Missing book ID"}</span>
              </summary>
              <pre>{JSON.stringify(item.record, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function App() {
  const [catalogText, setCatalogText] = useState("");
  const [result, setResult] = useState(null);
  const [inputError, setInputError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  function loadSample() {
    setCatalogText(formatCatalog(SAMPLE_CATALOG));
    setInputError("");
    setRequestError("");
    setNotice("Sample catalog loaded. Review it or generate drafts now.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setInputError("");
    setRequestError("");
    setNotice("");

    let catalog;
    try {
      catalog = parseCatalogText(catalogText);
    } catch (error) {
      setInputError(error.message);
      return;
    }

    setIsLoading(true);
    try {
      const nextResult = await generateMarketingDrafts(catalog);
      setResult(nextResult);
      setNotice("Draft review is ready. Rejected records remain available below.");
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const hasResults = Boolean(result);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Riverside Books home">
          <span className="brand-mark">R</span>
          <span>
            <strong>Riverside Books</strong>
            <small>Marketing studio</small>
          </span>
        </a>
        <span className="header-status"><span className="status-dot" /> Product D · v0.1</span>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Catalog to campaign</p>
          <h1>Make every book easier to discover.</h1>
          <p className="hero-copy">
            Turn approved Riverside Books catalog data into clear, reviewable marketing drafts—while keeping every rejected record visible for follow-up.
          </p>
        </section>

        <section className="workspace-grid" aria-label="Marketing draft workspace">
          <form className="input-panel panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">01 · Prepare</p>
                <h2>Catalog JSON</h2>
              </div>
              <button className="text-button" type="button" onClick={loadSample}>
                Load sample
              </button>
            </div>
            <label htmlFor="catalog-json">Paste a JSON array of book records</label>
            <textarea
              id="catalog-json"
              value={catalogText}
              onChange={(event) => {
                setCatalogText(event.target.value);
                setInputError("");
                setNotice("");
              }}
              placeholder={'[\n  {\n    "book_id": "RB-001",\n    "title": "..."\n  }\n]'}
              spellCheck="false"
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? "catalog-error" : "catalog-help"}
            />
            <p id="catalog-help" className="field-help">The backend validates the complete Product D nine-field contract.</p>
            {inputError && <p id="catalog-error" className="field-error" role="alert">{inputError}</p>}
            <button className="primary-button" type="submit" disabled={isLoading}>
              {isLoading ? "Generating drafts…" : "Generate marketing drafts"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <aside className="context-panel panel">
            <p className="eyebrow">02 · Review</p>
            <h2>Grounded, not mysterious.</h2>
            <p>Each draft is built from validated catalog fields. The review result shows the source context, record status, and any validation issue that needs attention.</p>
            <div className="context-rule" />
            <dl className="context-list">
              <div><dt>Outputs</dt><dd>Promotional, social, email</dd></div>
              <div><dt>Input</dt><dd>Riverside Books catalog JSON</dd></div>
              <div><dt>Workflow</dt><dd>Validate → generate → review</dd></div>
            </dl>
          </aside>
        </section>

        <div className="live-message" aria-live="polite">
          {isLoading && <span className="loading-message"><span className="spinner" /> Checking catalog and generating drafts…</span>}
          {!isLoading && notice && <span>{notice}</span>}
          {!isLoading && requestError && <span className="field-error" role="alert">{requestError}</span>}
        </div>

        {!hasResults ? (
          <section className="results-empty panel" aria-label="Draft results">
            <div className="empty-icon" aria-hidden="true">✦</div>
            <p className="eyebrow">03 · Results</p>
            <h2>Your drafts will appear here.</h2>
            <p>Load the sample catalog or paste your own records to begin a reviewable generation run.</p>
          </section>
        ) : (
          <section className="results-area" aria-label="Draft results">
            <div className="result-summary panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">03 · Results</p>
                  <h2>Generation summary</h2>
                </div>
                <span className="success-label"><span className="status-dot" /> Run complete</span>
              </div>
              <div className="stats-grid">
                <Stat label="Records reviewed" value={result.summary.total_records} />
                <Stat label="Drafts generated" value={result.summary.generated_drafts} tone="success" />
                <Stat label="Records accepted" value={result.summary.valid_records} tone="success" />
                <Stat label="Records rejected" value={result.summary.rejected_records} tone="warning" />
              </div>
            </div>

            <section className="drafts-section" aria-labelledby="drafts-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Customer-facing copy</p>
                  <h2 id="drafts-title">Generated drafts</h2>
                </div>
                <span className="section-count">{result.generated_drafts.length} drafts</span>
              </div>
              {result.generated_drafts.length === 0 ? (
                <div className="empty-inline">No drafts were generated because every record was rejected.</div>
              ) : (
                <div className="draft-grid">
                  {result.generated_drafts.map((draft) => <DraftCard draft={draft} key={`${draft.book_id}-${draft.content_type}`} />)}
                </div>
              )}
            </section>

            <RejectedRecords records={result.rejected_records} />
            <Diagnostics diagnostics={result.validation_diagnostics} />
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>Riverside Books · Product D</span>
        <span>Deterministic drafts for human review</span>
      </footer>
    </div>
  );
}

export default App;
