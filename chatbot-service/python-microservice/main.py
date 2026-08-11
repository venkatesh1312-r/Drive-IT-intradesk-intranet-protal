from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from guardrails_service import validate_input
from langgraph_service import run_graph

app = FastAPI()


# ── Request Models ────────────────────────────────────────────────────────────

class InputValidationRequest(BaseModel):
    question: str

class GraphRequest(BaseModel):
    question: str
    context: str
    history: list
    full_response: Optional[str] = None


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Route 1: Input Validation ─────────────────────────────────────────────────

@app.post("/validate-input")
async def validate_input_route(req: InputValidationRequest):
    """
    Validates user question using Guardrails ToxicLanguage.
    Returns: { valid: bool, message: str }
    """
    try:
        result = await validate_input(req.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route 2: LangGraph Output Guard ──────────────────────────────────────────

@app.post("/run-graph")
async def run_graph_route(req: GraphRequest):
    """
    Post-stream output guard — checks completed streamed answer.
    Returns: { answer: str, blocked: bool }
    """
    try:
        result = await run_graph(
            question=req.question,
            context=req.context,
            history=req.history,
            full_response=req.full_response
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


