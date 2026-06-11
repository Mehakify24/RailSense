from __future__ import annotations

from dataclasses import dataclass

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - optional dependency at runtime
    genai = None


@dataclass
class ToolCall:
    name: str
    arguments: dict
    result: str


class ShinkansenBrainAgent:
    """Modular agent facade with optional Gemini reasoning and local tool simulation."""

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        if genai and api_key:
            genai.configure(api_key=api_key)

    def simulate_tools(self, location: str, incident_type: str) -> list[ToolCall]:
        return [
            ToolCall("query_incident_memory", {"location": location}, "Found similar incidents in seasonal and load-stress windows."),
            ToolCall("compute_network_impact", {"location": location}, "Two active services may need rerouting within 180 seconds."),
            ToolCall("issue_operations_action", {"incident_type": incident_type}, "Fail-safe action queued for dispatcher approval simulation."),
        ]

    def reason(self, prompt: str) -> str:
        if not genai or not self.api_key:
            return "Gemini key not configured; using deterministic safety reasoning engine."
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text or "Gemini returned no reasoning text."
