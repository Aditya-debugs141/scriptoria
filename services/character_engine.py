import json
import os
from services import groq_request_with_retry


def _truncate_script(script, max_chars=8000):
    """Smart truncation: keeps beginning + end of script for context."""
    if not script or len(script) <= max_chars:
        return script
    head = max_chars * 3 // 4
    tail = max_chars - head
    return script[:head] + "\n\n[... MIDDLE SECTION OMITTED FOR BREVITY ...]\n\n" + script[-tail:]


def generate_characters(idea, script, tone, intensity, metadata):
    """Generates a structured JSON string of character profiles dynamically based on the screenplay."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    truncated = _truncate_script(script)
    
    prompt = f"""You are a psychological character architect for a film.
Analyze the following MASTER SCREENPLAY and extract the Protagonist, Antagonist (if applicable), and key Supporting Roles.

IDEA: {idea}
TONE: {tone} (This must influence their personality depth)
INTENSITY: {intensity}% (Higher intensity means greater emotional volatility/trauma)

EXTRACTED SCRIPT METADATA:
{json.dumps(metadata, indent=2)}

MASTER SCREENPLAY TO ANALYZE:
{truncated}

Return the data STRICTLY as a raw JSON array. DO NOT wrap in markdown code blocks. DO NOT add any other text.
Character names and events MUST perfectly match the Master Screenplay.
Relationships must reflect specific events from the script.

Format Example:
[
  {{
    "name": "Character Name from Script",
    "role": "Protagonist / Antagonist / Support",
    "backstory": "Deep history explaining their current state.",
    "motivation": "What drives them in this specific story.",
    "arc": "How they change from Scene 1 to the end.",
    "relationships": ["Character B: A tense alliance formed during the vault breach."]
  }}
]
"""
    try:
        raw = groq_request_with_retry({
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You output only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.8,
            "max_tokens": 2048
        }, groq_api_key)
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print("Character Gen Error:", e)
        return []
