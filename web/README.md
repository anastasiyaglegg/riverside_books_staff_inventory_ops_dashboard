# Riverside Books Marketing Generator web MVP

This React + Vite interface sends catalog JSON to the existing FastAPI `POST /generate` endpoint and displays generated drafts, rejected records, and validation diagnostics.

## Run locally

From this directory:

```bash
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000` for the API. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` when the API is hosted elsewhere.

Start the backend from the project root with:

```bash
uvicorn riverside_marketing.api:app --app-dir src --reload
```
