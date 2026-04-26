import json
import time
import requests
import os

def generate_script(idea, tone, intensity, length, seed):
    """Generates the master screenplay blueprint and yields it as a stream in Hollywood Fountain format."""
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    
    # Map intensity to pacing style
    if intensity <= 30:
        pacing = "Slower pacing. Longer descriptive action lines. Minimal dialogue."
    elif intensity <= 70:
        pacing = "Balanced pacing."
    else:
        pacing = "Rapid pacing. Shorter action lines. More urgent, snappy dialogue."

    # 1. TONE ENGINE DIFFERENTIATION (Structured System Prompts)
    if tone == "A24 Indie":
        system_prompt = """You are writing an emotionally grounded independent film.
- Minimalistic dialogue
- Emotional subtext
- Slow pacing
- Naturalistic conversations
- Long silences
- Internal character struggle
- Subtle symbolism

Produce output strictly in Fountain format."""
    elif tone == "Blockbuster":
        system_prompt = """You are writing a high-budget cinematic blockbuster.
- Fast pacing
- High-stakes conflict
- Large set pieces
- Clear hero vs antagonist
- Escalating tension every scene
- Cliffhangers

Produce output strictly in Fountain format."""
    elif tone == "Sitcom":
        system_prompt = """You are writing a half-hour sitcom episode.
- Rapid-fire dialogue
- Setup -> Punchline structure
- Situational irony
- Comedic escalation
- Short scenes
- Character quirks amplified

Produce output strictly in Fountain format."""
    else:
        system_prompt = """You are a professional Hollywood screenwriter.
- Standard dramatic tension
- Character-driven narrative
- Clear three-act scene structure
- Balanced dialogue and action

Produce output strictly in Fountain format."""

    # 2. SCRIPT LENGTH CONTROL
    target_length_instruction = ""
    max_output_tokens = 4000
    if length == "Short":
        target_length_instruction = "Target screenplay length: 3-5 pages.\nWrite approximately 3 to 5 scenes.\n1 screenplay page ≈ 1 minute runtime.\nStrictly respect this target. Do not end early."
        max_output_tokens = 2000
    elif length == "Medium":
        target_length_instruction = "CRITICAL LENGTH REQUIREMENT: You MUST write an 8-12 page screenplay. To achieve this: 1) Write exactly 8 to 12 distinct scenes. 2) Describe visual action, room details, and character movement thoughtfully. 3) Do not rush pacing. THIS IS MANDATORY."
        max_output_tokens = 4000
    elif length == "Long":
        target_length_instruction = "CRITICAL LENGTH REQUIREMENT: You MUST write a massive, 20+ page screenplay. To achieve this length: 1) Write at least 20 distinct scenes. 2) Describe EVERY visual action, room detail, and character movement meticulously. 3) Write extremely long, unbroken dialogue arguments and philosophical discussions. 4) Do NOT summarize time jumps. Show every single moment. THIS IS MANDATORY."
        max_output_tokens = 8000
    # If "None" or other, do not add constraints

    prompt = f"""You are a visionary screenwriter working on an intense new short film.
Your goal is to write a highly distinct short film blueprint specifically tailored to this idea:
"{idea}"

CRITICAL DIRECTIVES:
1. {target_length_instruction}
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
- Structure the script into connected scenes showing a full narrative arc.
- Do NOT use placeholders. Give all characters distinct, setting-appropriate names.

Begin writing the Fountain format script now:
"""
    
    MAX_RETRIES = 3
    RETRY_DELAYS = [8, 15, 30]  # seconds between retries on 429

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    # llama-3.1-8b-instant: 30K TPM on Groq free tier (10x more than 70b)
                    # — eliminates 429 rate limit errors during rapid regeneration
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "stream": True,
                    "max_tokens": max_output_tokens
                },
                stream=True,
                timeout=120
            )

            if response.status_code == 429:
                wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                print(f"[RATE LIMIT] 429 received. Retrying in {wait}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                response.close()
                if attempt < MAX_RETRIES - 1:
                    time.sleep(wait)
                    continue
                else:
                    yield f"\n[RATE LIMIT: Groq API is busy. Please wait 30 seconds and try again.]"
                    return

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
            return  # Success — exit retry loop

        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                print(f"[RATE LIMIT] HTTPError 429. Retrying in {wait}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(wait)
                    continue
                else:
                    yield f"\n[RATE LIMIT: Groq API is busy. Please wait 30 seconds and try again.]"
                    return
            yield f"\n[GENERATION ERROR: {str(e)}]"
            return
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            yield f"\n[GENERATION ERROR: Connection failed. Please check your network and retry.]"
            return
        except Exception as e:
            yield f"\n[GENERATION ERROR: {str(e)}]"
            return
