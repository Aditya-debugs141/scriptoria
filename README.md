# SCRIPTORIA: AI Pre-Production Studio

![Scriptoria Header](https://via.placeholder.com/1200x400/0a0a0c/4B00D1?text=SCRIPTORIA)

**Scriptoria** is an advanced, AI-powered pre-production studio. It leverages the blazing speed of the **Groq Llama 3 API** to generate not just screenplays, but complete, structured production plans. Designed for filmmakers, writers, and producers, Scriptoria streamlines the creative phase from initial concept to a fully-fleshed-out director's packet.

## 🚀 Features

- **⚡ Blazing Fast Screenplay Generation**: Stream your script directly to the viewport token-by-token using Groq.
- **🎨 Cinematic Tone Engine**: Toggle between distinct stylistic tones like *A24 Indie*, *Summer Blockbuster*, or *Classic Sitcom*.
- **🔥 Intensity Slider**: Dynamically adjust the pacing, conflict, and emotional stakes of the generated content (from 0% to 100%).
- **🧠 Character Lab**: Automatically extract deep psychological profiles, motivations, and arcs for major characters.
- **🎵 Sound Architect**: Generate layered audio design breakdowns, ambiance suggestions, and Foley requirements per scene.
- **📊 Production Planner**: Estimate budgets, map out set complexity, list key props, and estimate shooting days.
- **💼 Exec Pitch Mode**: Instantly flip your script into a high-level executive pitch deck view.
- **🖨️ Multi-Format PDF Exports**: Seamlessly download specific components (`Screenplay Only`, `Production Plan Only`) or compile a massive `Full Project` packet. No page reloads!

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, Flask, FPDF2 (PDF generation), Groq API, Pydantic.
- **Frontend**: Vanilla JavaScript (ES6+), Tailwind CSS (CDN), GSAP (Cinematic UI Animations).

## 📥 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/scriptoria.git
   cd scriptoria
   ```

2. **Set up a virtual environment (Optional but Recommended):**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Create a `.env` file in the root directory and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

## 🎮 Usage

Start the Flask development server:
```bash
python app.py
```

Open your browser and navigate to `http://localhost:5000`.

1. Click **Start Creating** to enter the Live Pre-Production Studio.
2. Enter a logline or concept (e.g., *"A gritty detective uncovers a conspiracy in a neon-lit cyberpunk city."*).
3. Select your **Tone Engine** setting and dial in the **Cinematic Intensity**.
4. Hit **Generate Master Screenplay**.
5. Once the script finishes streaming, watch as the *Character Lab*, *Sound Architect*, and *Planner* automatically build out your pre-production environment.
6. Export your final packaged project via the **Export PDF** dropdown!

## 📂 Project Structure

```text
scriptoria/
│
├── app.py                   # Main Flask Application & API Routes
├── requirements.txt         # Python dependencies
├── .env                     # API Keys (Git Ignored)
│
├── core/
│   ├── config.py            # Environment configurations
│   ├── models.py            # SQLAlchemy database models (if using persistence)
│   ├── schemas.py           # Pydantic schemas for data validation
│   └── prompts.py           # System prompts to tune the Groq LLM
│
├── services/
│   ├── script_engine.py      # Groq screenplay streaming logic
│   ├── character_engine.py   # Character profile generation
│   ├── sound_engine.py       # Audio design processing
│   ├── production_engine.py  # Logistics and planning
│   └── metadata_engine.py    # Automatic keyword/genre extraction
│
├── templates/
│   └── index.html           # Main UI / Hub
│
└── static/
    └── js/
        └── main.js          # Client-side reactivity, GSAP animations, Export handlers
```

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
