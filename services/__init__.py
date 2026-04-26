import time
import requests


GROQ_RETRY_DELAYS = [8, 15, 30]  # seconds — generous delays to avoid back-to-back 429s


def groq_request_with_retry(payload, groq_api_key, max_retries=3):
    """Make a Groq API request with exponential backoff on 429 errors."""
    for attempt in range(max_retries):
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=90
            )

            if response.status_code == 429:
                wait_time = GROQ_RETRY_DELAYS[min(attempt, len(GROQ_RETRY_DELAYS) - 1)]
                print(f"[GROQ RATE LIMIT] 429 received. Retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 429 and attempt < max_retries - 1:
                wait_time = GROQ_RETRY_DELAYS[min(attempt, len(GROQ_RETRY_DELAYS) - 1)]
                print(f"[GROQ RATE LIMIT] HTTPError. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            raise e

    raise Exception("Groq API: max retries exceeded (rate limited). Please wait a moment and try again.")

