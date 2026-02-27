import requests
url = "http://localhost:5000/api/generate/screenplay"
payload = {
    "idea": "A retired detective must solve one last case in a dystopian Mumbai where rainfall is toxic.",
    "tone": "Blockbuster",
    "intensity": 90,
    "seed": 0.123
}
try:
    response = requests.post(url, json=payload)
    print("STATUS:", response.status_code)
    data = response.json()
    if 'screenplay' in data:
        print("\n=== SCREENPLAY OUTPUT ===\n")
        print(data['screenplay'])
    else:
        print("ERROR:", data)
except Exception as e:
    print("Exception", e)
