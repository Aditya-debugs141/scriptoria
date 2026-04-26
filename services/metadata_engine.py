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


def generate_metadata(idea, script):
    """Analyzes the screenplay and extracts core metadata for cross-module consistency."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    truncated = _truncate_script(script)
    
    prompt = f"""You are a script supervisor. Analyze this screenplay and extract key metadata.
    
    SCREENPLAY:
    {truncated}
    
    Extract the following details and return STRICTLY as a raw JSON object. DO NOT wrap in markdown code blocks. DO NOT add any other text.
    
    Format Example:
    {{
      "main_characters": ["Name 1", "Name 2"],
      "locations": ["Location 1", "Location 2"],
      "conflict_type": "Man vs. Nature / Internal / etc.",
      "genre_inference": "Sci-Fi Thriller"
    }}
    """
    
    try:
        raw = groq_request_with_retry({
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are a helpful AI assistant that only outputs valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }, groq_api_key)
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print("Metadata Error:", e)
        return {
            "main_characters": [],
            "locations": [],
            "conflict_type": "Unknown",
            "genre_inference": "Unknown"
        }
