from langgraph.graph import StateGraph, END
from typing import TypedDict
from guardrails_service import validate_output


# ── State Schema ──────────────────────────────────────────────────────────────
class GraphState(TypedDict):
    question: str
    context: str
    history: list
    full_response: str | None
    answer: str
    blocked: bool


# ── Nodes ─────────────────────────────────────────────────────────────────────

def output_guard_node(state: GraphState) -> GraphState:
    """Runs output guard on the already-streamed full response."""
    full_response = state.get("full_response") or ""

    if not full_response.strip():
        return { **state, "answer": "", "blocked": False }

    result = validate_output(full_response)

    return {
        **state,
        "answer": full_response,
        "blocked": not result["valid"]
    }


# ── Build Graph ───────────────────────────────────────────────────────────────

def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("output_guard", output_guard_node)
    graph.set_entry_point("output_guard")
    graph.add_edge("output_guard", END)
    return graph.compile()


# Compile once at startup
compiled_graph = build_graph()


# ── Public function called from main.py ───────────────────────────────────────

async def run_graph(question: str, context: str, history: list, full_response: str | None = None) -> dict:
    result = compiled_graph.invoke({
        "question": question,
        "context": context,
        "history": history,
        "full_response": full_response,
        "answer": "",
        "blocked": False
    })
    return {
        "answer": result["answer"],
        "blocked": result["blocked"]
    }


