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


def generate_sound(idea, script, tone, intensity, metadata):
    """Generates a structured JSON string of a per-scene sound plan."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    truncated = _truncate_script(script)
    
    prompt = f"""You are the Lead Sound Designer for a new film.
Analyze the following MASTER SCREENPLAY and create a detailed Sound Plan specifically tailored to its scenes.

IDEA: {idea}
TONE: {tone} (A24 -> minimal ambient textures. Blockbuster -> orchestral. Sitcom -> light rhythmic cues)
INTENSITY SCORE: {intensity}/100 (Higher intensity -> more percussive / fast tempo)

EXTRACTED SCRIPT METADATA:
{json.dumps(metadata, indent=2)}

MASTER SCREENPLAY TO ANALYZE:
{truncated}

Return the data STRICTLY as a raw JSON object matching the format below. DO NOT wrap in markdown code blocks. DO NOT add any other text.
The Sound Plan must perfectly match the mood, locations, and events in the Master Screenplay.

Format Example:
{{
  "scenes": [
    {{
      "scene_heading": "The exact scene heading from the script (e.g. EXT. TERMINAL - NIGHT)",
      "ambiance": "Description of the background noise.",
      "score_style": "How the music should sound right here.",
      "sfx_list": ["List", "Of", "Specific", "Sound Effects"],
      "silence_moments": "Where the sound drops out completely for dramatic effect."
    }}
  ]
}}
"""
    try:
        raw = groq_request_with_retry({
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You output only valid JSON objects."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 2048
        }, groq_api_key)
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print("Sound Gen Error:", e)
        return {"scenes": []}
