import os
import time
import io
import json
import requests
from flask import Flask, render_template, request, jsonify, send_file, Response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from fpdf import FPDF
from pydantic import ValidationError

# Import modular services
from services.script_engine import generate_script
from services.character_engine import generate_characters
from services.sound_engine import generate_sound
from services.production_engine import generate_production
from services.metadata_engine import generate_metadata

# Import database and schemas
from core.models import db, Project, Scene, Characters
from core.schemas import GenerateScreenplayRequest, GenerateMetadataRequest, GenerateComponentsRequest

load_dotenv()

app = Flask(__name__)

# Configure Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///scriptopia_production.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Configure Rate Limiter (Scalability & Security: 1000 Users)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "100 per hour"],
    storage_uri="memory://" # Can be swapped to Redis in prod
)

# Initialize DB on first load
with app.app_context():
    db.create_all()

# Configure Groq
groq_api_key = os.environ.get("GROQ_API_KEY", "")
HAS_AI = False
if groq_api_key:
    HAS_AI = True

@app.route('/api/llm/status', methods=['GET'])
def api_llm_status():
    if not HAS_AI:
        return jsonify({
            "provider": "Groq",
            "status": "offline",
            "error": "GROQ_API_KEY not found"
        }), 503
        
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5
            },
            timeout=5
        )
        if response.status_code == 200:
            return jsonify({
                "provider": "Groq",
                "model": "llama-3.3-70b-versatile",
                "status": "ready"
            })
        else:
            return jsonify({
                "provider": "Groq",
                "status": "offline",
                "error": response.text
            }), 500
    except Exception as e:
        return jsonify({
            "provider": "Groq",
            "status": "offline",
            "error": str(e)
        }), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/generate/screenplay', methods=['POST'])
@limiter.limit("5 per minute") # strict limit for main generation
def api_generate_screenplay():
    try:
        req = GenerateScreenplayRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    def stream_fountain_script():
        full_script_content = ""
        if HAS_AI:
            try:
                for chunk in generate_script(req.idea, req.tone, req.intensity, req.seed):
                    full_script_content += chunk
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                
                # Stream ends, save to DB
                try:
                    with app.app_context():
                        new_proj = Project(
                            idea=req.idea,
                            tone=req.tone,
                            intensity=req.intensity,
                            screenplay_text=full_script_content
                        )
                        db.session.add(new_proj)
                        db.session.commit()
                except Exception as db_err:
                    print(f"Error saving generated script to DB: {db_err}")
                    
                yield f"data: {json.dumps({'status': 'DONE'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        else:
            # High-quality fallback for the new multi-scene blueprint
            paragraphs = [
                f"TITLE: THE TERMINAL RAIN\nLOGLINE: {req.idea}\n\n",
                "INT. VAULT - CONTINUOUS\n\nA massive steel door groans open. Sparks fly.\n\n",
                "CHARACTER 2\n(Urgent)\nWe have to move! Now!\n\n"
            ]
            for p in paragraphs:
                time.sleep(1)
                full_script_content += p
                yield f"data: {json.dumps({'text': p})}\n\n"
                
            # Stream ends, save to DB (fallback mode)
            try:
                with app.app_context():
                    new_proj = Project(
                        idea=req.idea,
                        tone=req.tone,
                        intensity=req.intensity,
                        screenplay_text=full_script_content
                    )
                    db.session.add(new_proj)
                    db.session.commit()
            except Exception as db_err:
                print(f"Error saving generated script to DB (fallback mode): {db_err}")

            yield f"data: {json.dumps({'status': 'DONE'})}\n\n"

    return Response(stream_fountain_script(), mimetype='text/event-stream')

@app.route('/api/generate/metadata', methods=['POST'])
@limiter.limit("20 per minute")
def api_generate_metadata():
    try:
        req = GenerateMetadataRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            metadata = generate_metadata("", req.script)
            return jsonify({"metadata": metadata})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        time.sleep(1)
        return jsonify({"metadata": {
            "main_characters": ["Mock Lead", "Mock Villain"],
            "locations": ["Mock Hub", "Mock Vault"],
            "conflict_type": "Mock Conflict",
            "genre_inference": "Mock Genre"
        }})

@app.route('/api/generate/characters', methods=['POST'])
@limiter.limit("20 per minute")
def api_generate_characters():
    try:
        req = GenerateComponentsRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            characters = generate_characters(req.idea, req.script, req.tone, req.intensity, req.metadata)
            return jsonify({"characters": characters})
        except Exception as e:
            print("Error generating char:", e)
            return jsonify({"error": str(e)}), 500
    else:
        time.sleep(1)
        return jsonify({"characters": [
            {"name": "MOCK CHAR 1", "role": "Protagonist", "backstory": "Fallback data.", "motivation": "Testing.", "arc": "Flatter than paper."}
        ]})

@app.route('/api/generate/sound', methods=['POST'])
@limiter.limit("20 per minute")
def api_generate_sound():
    try:
        req = GenerateComponentsRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            sound_plan = generate_sound(req.idea, req.script, req.tone, req.intensity, req.metadata)
            return jsonify({"sound": sound_plan})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        time.sleep(1)
        return jsonify({"sound": {"scenes": [{"ambiance": "Mock Wind", "score_style": "Synth", "sfx_list": ["Step 1", "Step 2"]}]}})

@app.route('/api/generate/production', methods=['POST'])
@limiter.limit("20 per minute")
def api_generate_production():
    try:
        req = GenerateComponentsRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            production_plan = generate_production(req.idea, req.script, req.tone, req.intensity, req.metadata)
            return jsonify({"production": production_plan})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        time.sleep(1)
        return jsonify({"production": {"locations": ["Mock Hub"], "props": ["Fake Gun"], "estimated_shoot_days": "5", "scene_complexity_rating": "5"}})

class PDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Courier", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

@app.route('/api/export-pdf', methods=['POST'])
@limiter.limit("10 per minute")
def api_export_pdf():
    state = request.json
    export_type = state.get('exportType', 'full')
    
    if export_type in ['screenplay', 'full'] and not state.get('screenplay'):
        return jsonify({"error": "No content to export"}), 400
        
    if export_type == 'production' and not state.get('productionPlan'):
        return jsonify({"error": "No production plan to export"}), 400

    try:
        pdf = PDF()
        pdf.set_auto_page_break(auto=True, margin=15.0)
        
        if export_type == "screenplay":
            pdf.add_page()
            # FPDF margins: left, top, right (1.5 inch left margin = 38.1mm)
            pdf.set_margins(38.1, 20.0, 25.4)
            pdf.set_font("Courier", size=12)
            
            text = str(state.get('screenplay', '')).encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, txt=text)
            
        elif export_type == "production":
            pdf.add_page()
            pdf.set_font("Courier", size=12)
            pdf.set_margins(20.0, 20.0, 20.0)
            
            pdf.set_font("Courier", 'B', 16)
            pdf.cell(0, 10, txt="SCRIPTORIA PRODUCTION PLAN", ln=True, align='C')
            pdf.ln(10)
            
            plan = state.get('productionPlan', {})
            for key, value in plan.items():
                pdf.set_font("Courier", 'B', 14)
                pdf.cell(0, 10, txt=str(key).replace('_', ' ').upper(), ln=True)
                pdf.set_font("Courier", '', 12)
                
                if isinstance(value, list):
                    for item in value:
                        pdf.multi_cell(0, 6, txt=f"- {str(item).encode('latin-1', 'replace').decode('latin-1')}")
                else:
                    pdf.multi_cell(0, 6, txt=str(value).encode('latin-1', 'replace').decode('latin-1'))
                pdf.ln(10)
                
        elif export_type == "full":
            pdf.add_page()
            pdf.set_margins(25.4, 20.0, 25.4)
            pdf.set_font("Courier", 'B', 16)
            pdf.cell(0, 10, txt="SCRIPTORIA PRODUCTION PACK", ln=True, align='C')
            pdf.set_font("Courier", '', 12)
            pdf.ln(10)
            
            pdf.multi_cell(0, 7, txt=f"LOGLINE: {state.get('idea', '')}\nTONE: {state.get('tone', '')}\nINTENSITY: {state.get('intensity', '')}%")
            pdf.ln(10)
            
            # Screenplay
            pdf.add_page()
            pdf.set_margins(38.1, 20.0, 25.4)
            pdf.set_font("Courier", 'B', 14)
            pdf.cell(0, 10, txt="MASTER SCREENPLAY", ln=True)
            pdf.set_font("Courier", '', 12)
            text = str(state.get('screenplay', '')).encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, txt=text)
            
            # Characters
            pdf.add_page()
            pdf.set_margins(25.4, 20.0, 25.4)
            pdf.set_font("Courier", 'B', 14)
            pdf.cell(0, 10, txt="CHARACTER PROFILES", ln=True)
            pdf.set_font("Courier", '', 10)
            chars = state.get('characters', [])
            if chars and isinstance(chars, list):
                for c in chars:
                    c_text = json.dumps(c, indent=2).encode('latin-1', 'replace').decode('latin-1')
                    pdf.multi_cell(0, 5, txt=c_text)
                    pdf.ln(5)
                    
            # Sound Plan
            pdf.add_page()
            pdf.set_font("Courier", 'B', 14)
            pdf.cell(0, 10, txt="SOUNDSCAPE ARCHITECTURE", ln=True)
            pdf.set_font("Courier", '', 10)
            sound = state.get('soundPlan', {})
            if sound:
                s_text = json.dumps(sound, indent=2).encode('latin-1', 'replace').decode('latin-1')
                pdf.multi_cell(0, 5, txt=s_text)
                
            # Production Plan
            pdf.add_page()
            pdf.set_font("Courier", 'B', 14)
            pdf.cell(0, 10, txt="PRODUCTION FULL SUMMARY", ln=True)
            pdf.set_font("Courier", '', 10)
            plan = state.get('productionPlan', {})
            if plan:
                p_text = json.dumps(plan, indent=2).encode('latin-1', 'replace').decode('latin-1')
                pdf.multi_cell(0, 5, txt=p_text)

        pdf_bytes = pdf.output(dest='S').encode('latin-1')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'scriptoria_export.pdf'
        )
            
    except Exception as e:
        print("PDF Exception", e)
        return jsonify({"error": "Failed to compile PDF: " + str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
