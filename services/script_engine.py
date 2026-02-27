import json
import requests
import os

def generate_script(idea, tone, intensity, seed):
    """Generates the master screenplay blueprint and yields it as a stream in Hollywood Fountain format."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    
    # Map intensity to pacing style
    if intensity <= 30:
        pacing = "Slower pacing. Longer descriptive action lines. Minimal dialogue."
    elif intensity <= 70:
        pacing = "Balanced pacing."
    else:
        pacing = "Rapid pacing. Shorter action lines. More urgent, snappy dialogue."

    # Map tone
    if tone == "A24 Indie":
        style = "Minimalistic. Emotional introspection. Character-driven. High subtext."
    elif tone == "Blockbuster":
        style = "Large-scale spectacle. External conflict. High stakes."
    elif tone == "Sitcom":
        style = "Comedic timing. Light tone. Situational humor."
    else:
        style = "Standard film tone."

    prompt = f"""You are a visionary screenwriter working on an intense new short film.
Your goal is to write a highly distinct short film blueprint specifically tailored to this idea:
"{idea}"

CRITICAL DIRECTIVES:
1. This script MUST heavily reflect the TONE: {style}.
2. The pacing and dialogue MUST match the INTENSITY: {pacing}.
3. Produce the output strictly in HOLLYWOOD FOUNTAIN FORMAT. Do NOT use JSON. Do NOT wrap in markdown blocks. Output raw text only.

FOUNTAIN FORMATTING RULES:
- Scene Headings must start with INT. or EXT. and include the scene number. Example: INT. POLICE STATION - NIGHT #1#
- Action lines are normal paragraphs.
- Character Names speaking dialogue MUST BE ALL CAPS and on their own line.
- Dialogue follows the character name on the next line.
- Parentheticals (if used) are on their own line between the character name and dialogue.

Requirements:
- Create a compelling TITLE line at the very top: TITLE: [Your Title]
- Create a LOGLINE right below: LOGLINE: [Your Logline]
- Separate the metadata from the script with a blank line.
- Structure the script into exactly 3 connected scenes showing a full narrative arc.
- Do NOT use placeholders. Give all characters distinct, setting-appropriate names.

Begin writing the Fountain format script now:
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
                    {"role": "system", "content": "You are a professional Hollywood screenwriter. Output strictly in Fountain format. Use proper scene headings (INT./EXT.), character names centered, dialogue formatting clean."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "stream": True,
                "max_tokens": 3500
            },
            stream=True,
            timeout=20
        )
        
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith('data: '):
                    data_str = decoded_line[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data and len(data['choices']) > 0:
                            delta = data['choices'][0].get('delta', {})
                            if 'content' in delta and delta['content']:
                                yield delta['content']
                    except json.JSONDecodeError:
                        continue
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, json.JSONDecodeError) as e:
        yield f"\n[GENERATION ERROR: AI generation failed. Please retry.]"
    except Exception as e:
        yield f"\n[GENERATION ERROR: {str(e)}]"
