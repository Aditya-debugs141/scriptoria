import json
import requests
import os

def generate_sound(idea, script, tone, intensity, metadata):
    """Generates a structured JSON string of a per-scene sound plan."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    
    prompt = f"""You are the Lead Sound Designer for a new film.
Analyze the following MASTER SCREENPLAY and create a detailed Sound Plan specifically tailored to its scenes.

IDEA: {idea}
TONE: {tone} (A24 -> minimal ambient textures. Blockbuster -> orchestral. Sitcom -> light rhythmic cues)
INTENSITY SCORE: {intensity}/100 (Higher intensity -> more percussive / fast tempo)

EXTRACTED SCRIPT METADATA:
{json.dumps(metadata, indent=2)}

MASTER SCREENPLAY TO ANALYZE:
{script}

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
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You output only valid JSON objects."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2048
            },
            timeout=20
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print("Sound Gen Error:", e)
        return {"scenes": []}
