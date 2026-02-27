import json
import requests
import os

def generate_production(idea, script, tone, intensity, metadata):
    """Generates a structured JSON string of a production plan based on scene complexity."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    
    prompt = f"""You are the Line Producer for a new film.
Create a production breakdown specifically analyzing the scenes, locations, and characters in the MASTER SCREENPLAY below.

IDEA: {idea}
TONE: {tone} (Blockbuster -> Massive budget. Indie -> Smaller, scrappy scale)
INTENSITY: {intensity}% (Higher intensity -> more action/FX -> higher scene complexity rating)

EXTRACTED SCRIPT METADATA:
{json.dumps(metadata, indent=2)}

MASTER SCREENPLAY TO ANALYZE:
{script}

Return the data STRICTLY as a raw JSON object matching the format below. DO NOT wrap in markdown code blocks. DO NOT add any other text.
Rules:
- If a single location dominates the script -> low shoot days.
- If multiple action scenes -> higher complexity rating.
- If blockbuster tone -> larger budget estimate.

Format Example:
{{
  "locations": ["List the specific locations extracted from the scene headings."],
  "props": ["List the heavy/special props needed (e.g., The glowing briefcase, rain machines)."],
  "cast_requirements": "How many main actors vs. extras needed based on the script.",
  "estimated_shoot_days": "e.g., 14 Days",
  "scene_complexity_rating": "A number from 1 to 10 (10 being most demanding)",
  "budget_scale_estimate": "e.g., $85M - $120M"
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
                "temperature": 0.6,
                "max_tokens": 1024
            },
            timeout=20
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print("Production Gen Error:", e)
        return {}
