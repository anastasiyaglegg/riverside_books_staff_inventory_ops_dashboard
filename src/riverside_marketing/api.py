"""FastAPI v0.1 HTTP adapter for the Product D workflow."""

from __future__ import annotations

from typing import Any

from fastapi import Body, FastAPI, HTTPException

from .data import DataContractError
from .orchestration import run_catalog_generation


app = FastAPI(
    title="Riverside Marketing",
    version="0.1.0",
    description="HTTP adapter for the Riverside Books Product D workflow.",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Return a minimal service health response."""

    return {"status": "ok", "service": "riverside-marketing"}


@app.post("/generate")
def generate(
    catalog: list[dict[str, Any]] = Body(
        ...,
        description="A JSON array of Riverside Books catalog records",
    ),
) -> dict[str, Any]:
    """Run the existing validation-to-generation workflow for a JSON catalog."""

    try:
        return run_catalog_generation(catalog).as_dict()
    except DataContractError as exc:
        # A missing or unreadable server-side contract is not a client data
        # rejection and should not expose an internal traceback.
        raise HTTPException(
            status_code=500,
            detail="Product D data contract is unavailable",
        ) from exc
