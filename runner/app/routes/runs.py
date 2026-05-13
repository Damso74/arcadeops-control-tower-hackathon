from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/runs/{run_id}")
def get_run(run_id: str) -> JSONResponse:
    _ = run_id
    return JSONResponse(
        status_code=404,
        content={
            "error": "not_found",
            "note": "Lot 1 — runs are not persisted yet, see Lot 5",
        },
    )
