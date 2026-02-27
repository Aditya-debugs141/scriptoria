import json
import requests
import os

def generate_metadata(idea, script):
    """Analyzes the screenplay and extracts core metadata for cross-module consistency."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    
    prompt = f"""You are a script supervisor. Analyze this screenplay and extract key metadata.
    
    SCREENPLAY:
    {script}
    
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
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are a helpful AI assistant that only outputs valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            },
            timeout=20
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
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
