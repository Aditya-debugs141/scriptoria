# Scriptoria 🎬

> **AI-Powered Film Pre-Production Platform** — Transform a single idea into a complete production package in real time.

Scriptoria takes a raw film concept and generates a full, industry-formatted screenplay, character profiles, sound design architecture, and a production breakdown blueprint — all powered by the Groq LLM API running `llama-3.3-70b-versatile`.

---

## ✨ Features

- **Screenplay Generator** — Streams a formatted Fountain-style script directly to the browser in real time using Server-Sent Events (SSE)
- **Character Profiles** — Generates structured character backstories, motivations, and dramatic arcs
- **Sound Design Plan** — Creates a scene-by-scene soundscape and score recommendation
- **Production Breakdown** — Estimates shoot days, key locations, props, and scene complexity
- **PDF Export** — Download the full production pack (screenplay + all components) as a professionally formatted PDF
- **User Auth** — Register/Login with bcrypt-hashed passwords and Flask session management
- **Screenplay History** — All generated projects are saved and accessible per user
- **Rate Limiting** — Flask-Limiter protects all AI endpoints from abuse
- **Works Offline** — Fallback mock data mode if no API key is configured

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| AI Provider | Groq API (`llama-3.3-70b-versatile`) |
| Database | SQLite via SQLAlchemy |
| Auth | Werkzeug password hashing + Flask sessions |
| PDF Export | FPDF |
| Validation | Pydantic |
| Rate Limiting | Flask-Limiter |
| Frontend | Vanilla HTML/CSS/JS (Jinja templates) |

---

## 🚀 Local Setup

### 1. Prerequisites
- Python 3.10+
- A free [Groq API key](https://console.groq.com/)

### 2. Clone the repository
```bash
git clone https://github.com/Aditya-debugs141/scriptoria.git
cd scriptoria
```

### 3. Create a virtual environment
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure environment variables
```bash
# Copy the example file
cp .env.example .env
```

Now open `.env` and fill in your values:
```env
GROQ_API_KEY=your_groq_api_key_here
FLASK_SECRET_KEY=generate_a_long_random_string_here
FLASK_ENV=development
```

> **Generate a secure secret key** by running:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

### 6. Run the development server
```bash
python app.py
```

The app will be available at **http://localhost:5000**

---

## 📁 Project Structure

```
scriptopia/
├── app.py                  # Main Flask application, all routes
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template (safe to commit)
├── .env                    # Your local secrets (NEVER commit this)
├── core/
│   ├── models.py           # SQLAlchemy database models (User, Project, Scene, Characters)
│   └── schemas.py          # Pydantic request validation schemas
├── services/
│   ├── script_engine.py    # Groq API: screenplay generation
│   ├── character_engine.py # Groq API: character profile generation
│   ├── sound_engine.py     # Groq API: sound design generation
│   ├── production_engine.py# Groq API: production blueprint generation
│   └── metadata_engine.py  # Groq API: metadata extraction
├── templates/
│   ├── index.html          # Landing page
│   ├── login.html          # Auth page
│   └── dashboard.html      # Main app workspace
└── static/                 # CSS, JS, assets
```

---

## 🔒 Security Notes

- **Never commit `.env`** — it is already in `.gitignore`
- **Always use a strong, random `FLASK_SECRET_KEY`** — do not use a predictable string
- Session cookies are `HttpOnly` and `SameSite=Lax`
- All AI endpoints are rate-limited (20 requests/min for generation, 5/min for login)
- Passwords are hashed using Werkzeug's `pbkdf2:sha256` algorithm

---

## 📦 Deployment

For production, set:
```env
FLASK_ENV=production
```

This automatically enables `Secure` flag on session cookies (requires HTTPS).

Use `gunicorn` as the production WSGI server:
```bash
pip install gunicorn
gunicorn app:app --bind 0.0.0.0:5000
```

---

## 🤝 Contributing

Pull requests are welcome. Please ensure you:
1. Never commit `.env` or any real API keys
2. Add your changes to a feature branch
3. Write clear commit messages

---

## 📄 License

MIT License
