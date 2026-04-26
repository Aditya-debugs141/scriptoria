import requests, json, os
from dotenv import load_dotenv

load_dotenv()
groq_api_key = os.environ.get('GROQ_API_KEY', '')

prompt = """You are the Line Producer for a new film.
Create a production breakdown specifically analyzing the scenes, locations, and characters in the MASTER SCREENPLAY below.

IDEA: test
TONE: A24 Indie (Blockbuster -> Massive budget. Indie -> Smaller, scrappy scale)
INTENSITY: 50% (Higher intensity -> more action/FX -> higher scene complexity rating)

EXTRACTED SCRIPT METADATA:
{}

MASTER SCREENPLAY TO ANALYZE:
Scene 1. A man walks.

Return the data STRICTLY as a raw JSON object matching the format below. DO NOT wrap in markdown code blocks. DO NOT add any other text.
Rules:
- If a single location dominates the script -> low shoot days.
- If multiple action scenes -> higher complexity rating.
- If blockbuster tone -> larger budget estimate.

Format Example:
{
  "locations": ["List the specific locations extracted from the scene headings."],
  "props": ["List the heavy/special props needed (e.g., The glowing briefcase, rain machines)."],
  "cast_requirements": "How many main actors vs. extras needed based on the script.",
  "estimated_shoot_days": "e.g., 14 Days",
  "scene_complexity_rating": "A number from 1 to 10 (10 being most demanding)",
  "budget_scale_estimate": "e.g., $85M - $120M"
}
"""

response = requests.post(
    'https://api.groq.com/openai/v1/chat/completions',
    headers={
        'Authorization': f'Bearer {groq_api_key}',
        'Content-Type': 'application/json'
    },
    json={
        'model': 'llama-3.1-8b-instant',
        'messages': [
            {'role': 'system', 'content': 'You output only valid JSON objects.'},
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.6,
        'max_tokens': 1024
    },
    timeout=20
)
print(response.status_code)
print('RAW OUTPUT:')
print(response.text)
