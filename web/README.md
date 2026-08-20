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

## Deployment preparation

For Vercel, set the project root to `web`, keep the build command as `npm run build`, keep the output directory as `dist`, and define `VITE_API_BASE_URL` as the hosted FastAPI URL. Production builds fail clearly at request time if that variable is missing; the localhost fallback is development-only.

The repository root contains `render.yaml` for a low-cost Render FastAPI web service. Set `RIVERSIDE_ALLOWED_ORIGINS` in the Render dashboard to the deployed frontend origin, then use the service's HTTPS `onrender.com` URL as `VITE_API_BASE_URL` in Vercel.
