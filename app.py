import os
import re
import time
import io
import json
import requests
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, jsonify, send_file, Response, session, redirect, url_for
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from fpdf import FPDF
from pydantic import ValidationError
from werkzeug.security import generate_password_hash, check_password_hash

# Import modular services
from services.script_engine import generate_script
from services.character_engine import generate_characters
from services.sound_engine import generate_sound
from services.production_engine import generate_production
from services.metadata_engine import generate_metadata

# Import database and schemas
from core.models import db, Project, User, Scene, Characters, safe_migrate
from core.schemas import GenerateScreenplayRequest, GenerateMetadataRequest, GenerateComponentsRequest

load_dotenv()

app = Flask(__name__)

# ─── Session & Security Configuration ───
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(32).hex())
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get("FLASK_ENV") == "production"  # True only on HTTPS

# ─── Database Configuration ───
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///scriptopia_production.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# ─── Rate Limiter ───
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "100 per hour"],
    storage_uri="memory://"
)

# ─── Safe Migration (not db.create_all for columns) ───
safe_migrate(app)

# ─── Groq API ───
groq_api_key = os.environ.get("GROQ_API_KEY", "")
HAS_AI = bool(groq_api_key)


# ═══════════════════════════════════════════
# AUTH HELPERS
# ═══════════════════════════════════════════

def get_current_user():
    """Return current User or None."""
    uid = session.get('user_id')
    if not uid:
        return None
    try:
        return db.session.get(User, uid)
    except Exception:
        return None

def login_required(f):
    """Decorator: returns 401 JSON if not authenticated."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required."}), 401
        return f(user, *args, **kwargs)
    return decorated

def validate_email(email):
    """Basic email format check."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


# ═══════════════════════════════════════════
# PAGE ROUTES
# ═══════════════════════════════════════════

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    user = get_current_user()
    if not user:
        return redirect(url_for('login_page'))
    return render_template('dashboard.html')


# ═══════════════════════════════════════════
# AUTH API ROUTES
# ═══════════════════════════════════════════

@app.route('/api/register', methods=['POST'])
@limiter.limit("10 per minute")
def api_register():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid request body."}), 400

        email = (data.get('email') or '').strip().lower()
        password = data.get('password', '')
        display_name = (data.get('display_name') or '').strip()

        # Validation
        if not email or not password or not display_name:
            return jsonify({"error": "Email, password, and display name are required."}), 400

        if not validate_email(email):
            return jsonify({"error": "Invalid email format."}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters."}), 400

        if len(display_name) < 2 or len(display_name) > 50:
            return jsonify({"error": "Display name must be 2-50 characters."}), 400

        # Check duplicate
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({"error": "An account with this email already exists."}), 409

        # Create user
        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            display_name=display_name
        )
        db.session.add(user)
        db.session.commit()

        # Auto-login after registration
        session['user_id'] = user.id
        session.permanent = True

        return jsonify({
            "message": "Registration successful.",
            "user": {"id": user.id, "email": user.email, "display_name": user.display_name}
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"[REGISTER ERROR] {e}")
        return jsonify({"error": "Registration failed. Please try again."}), 500


@app.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
def api_login():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid request body."}), 400

        email = (data.get('email') or '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password."}), 401

        session['user_id'] = user.id
        session.permanent = True

        return jsonify({
            "message": "Login successful.",
            "user": {"id": user.id, "email": user.email, "display_name": user.display_name}
        }), 200

    except Exception as e:
        print(f"[LOGIN ERROR] {e}")
        return jsonify({"error": "Login failed. Please try again."}), 500


@app.route('/api/logout', methods=['POST'])
def api_logout():
    try:
        session.clear()
        return jsonify({"message": "Logged out."}), 200
    except Exception as e:
        print(f"[LOGOUT ERROR] {e}")
        return jsonify({"error": "Logout failed."}), 500


@app.route('/api/me', methods=['GET'])
def api_me():
    try:
        user = get_current_user()
        if not user:
            return jsonify({"error": "Not authenticated."}), 401
        return jsonify({
            "user": {"id": user.id, "email": user.email, "display_name": user.display_name}
        }), 200
    except Exception as e:
        print(f"[ME ERROR] {e}")
        return jsonify({"error": "Failed to get user info."}), 500


# ═══════════════════════════════════════════
# LLM STATUS
# ═══════════════════════════════════════════

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


# ═══════════════════════════════════════════
# SCREENPLAY GENERATION (Auth + Rate Limited)
# ═══════════════════════════════════════════

@app.route('/api/generate/screenplay', methods=['POST'])
@limiter.limit("20 per minute")
def api_generate_screenplay():
    try:
        req = GenerateScreenplayRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    # Get user_id from session (optional — generation works without login but won't save)
    current_user = get_current_user()
    user_id = current_user.id if current_user else None
        
    def stream_fountain_script():
        full_script_content = ""
        generation_success = False
        
        if HAS_AI:
            try:
                for chunk in generate_script(req.idea, req.tone, req.intensity, req.length, req.seed):
                    full_script_content += chunk
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                
                generation_success = True
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        else:
            # Fallback mode
            paragraphs = [
                f"TITLE: THE TERMINAL RAIN\nLOGLINE: {req.idea}\n\n",
                "INT. VAULT - CONTINUOUS\n\nA massive steel door groans open. Sparks fly.\n\n",
                "CHARACTER 2\n(Urgent)\nWe have to move! Now!\n\n"
            ]
            for p in paragraphs:
                time.sleep(1)
                full_script_content += p
                yield f"data: {json.dumps({'text': p})}\n\n"
            generation_success = True

        # Only save to DB if generation succeeded AND there's real content
        final_project_id = None
        if generation_success and len(full_script_content.strip()) > 50:
            try:
                with app.app_context():
                    new_proj = Project(
                        user_id=user_id,
                        idea=req.idea,
                        tone=req.tone,
                        intensity=req.intensity,
                        screenplay_text=full_script_content
                    )
                    db.session.add(new_proj)
                    db.session.commit()
                    final_project_id = new_proj.id
            except Exception as db_err:
                print(f"[DB SAVE ERROR] {db_err}")
                    
        yield f"data: {json.dumps({'status': 'DONE', 'project_id': final_project_id})}\n\n"

    return Response(stream_fountain_script(), mimetype='text/event-stream')


# ═══════════════════════════════════════════
# SCREENPLAY HISTORY (Auth Required, User-Scoped)
# ═══════════════════════════════════════════

@app.route('/api/screenplay-history', methods=['GET'])
@login_required
def api_screenplay_history(user):
    try:
        projects = db.session.query(Project).filter_by(user_id=user.id).order_by(Project.created_at.desc()).limit(20).all()
        history = []
        for p in projects:
            if not p.screenplay_text or not p.idea:
                continue
            text_content = p.screenplay_text or ""
            words = text_content.split()
            preview = " ".join(words[:15]) + "..." if len(words) > 15 else text_content
            
            history.append({
                "id": p.id,
                "idea": p.idea,
                "tone": p.tone,
                "intensity": p.intensity,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "preview": preview,
                "screenplay_text": p.screenplay_text
            })
            
        return jsonify({"history": history}), 200
    except Exception as e:
        print(f"[HISTORY ERROR] {e}")
        return jsonify({"error": "Failed to fetch screenplay history."}), 500


@app.route('/api/history', methods=['GET'])
@login_required
def api_history(user):
    """User-scoped history for the sidebar."""
    try:
        projects = db.session.query(Project).filter_by(user_id=user.id).order_by(Project.created_at.desc()).limit(50).all()
        history = []
        for p in projects:
            if not p.screenplay_text or not p.idea:
                continue
            text_content = p.screenplay_text or ""
            words = text_content.split()
            preview = " ".join(words[:10]) + "..." if len(words) > 10 else text_content
            
            # Auto-generate title from first 8 words of idea
            idea_words = p.idea.split()
            title = " ".join(idea_words[:8]) + ("..." if len(idea_words) > 8 else "")
            
            history.append({
                "id": p.id,
                "title": title,
                "idea": p.idea,
                "tone": p.tone,
                "intensity": p.intensity,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "preview": preview
            })
            
        return jsonify({"history": history}), 200
    except Exception as e:
        print(f"[HISTORY ERROR] {e}")
        return jsonify({"error": "Failed to fetch history."}), 500


@app.route('/api/history/<int:screenplay_id>', methods=['GET'])
@login_required
def api_history_detail(user, screenplay_id):
    """Get single screenplay with ownership check."""
    try:
        project = db.session.get(Project, screenplay_id)
        if not project:
            return jsonify({"error": "Screenplay not found."}), 404
        
        # Ownership check
        if project.user_id != user.id:
            return jsonify({"error": "Access denied."}), 403
        
        return jsonify({
            "id": project.id,
            "idea": project.idea,
            "tone": project.tone,
            "intensity": project.intensity,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "screenplay_text": project.screenplay_text
        }), 200
    except Exception as e:
        print(f"[HISTORY DETAIL ERROR] {e}")
        return jsonify({"error": f"Failed to fetch screenplay: {str(e)}"}), 500


# ═══════════════════════════════════════════
# SECONDARY GENERATION ROUTES (Unchanged)
# ═══════════════════════════════════════════

@app.route('/api/generate/metadata', methods=['POST'])
@limiter.limit("30 per minute")
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
@limiter.limit("30 per minute")
def api_generate_characters():
    try:
        req = GenerateComponentsRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            characters = generate_characters(req.idea, req.script, req.tone, req.intensity, req.metadata)
            
            # Persist if project_id exists
            if req.project_id:
                try:
                    # Clear existing characters for this project to prevent duplicates
                    db.session.query(Characters).filter_by(project_id=req.project_id).delete()
                    for char in characters:
                        new_char = Characters(
                            project_id=req.project_id,
                            name=char.get('name', 'Unknown'),
                            role=char.get('role', 'Unknown'),
                            backstory=char.get('backstory', ''),
                            motivation=char.get('motivation', ''),
                            arc=char.get('arc', '')
                        )
                        db.session.add(new_char)
                    db.session.commit()
                except Exception as db_e:
                    db.session.rollback()
                    print(f"[CHAR DB ERROR] {db_e}")

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
@limiter.limit("30 per minute")
def api_generate_sound():
    try:
        req = GenerateComponentsRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            sound_plan = generate_sound(req.idea, req.script, req.tone, req.intensity, req.metadata)
            
            # Persist to Project.metadata_json
            if req.project_id:
                try:
                    project = db.session.get(Project, req.project_id)
                    if project:
                        metadata_str = project.metadata_json
                        current_meta = json.loads(metadata_str) if metadata_str else {}
                        if isinstance(current_meta, dict):
                            current_meta['sound_plan'] = sound_plan
                            project.metadata_json = json.dumps(current_meta)
                            db.session.commit()
                except Exception as db_e:
                    db.session.rollback()
                    print(f"[SOUND DB ERROR] {db_e}")

            return jsonify({"sound": sound_plan})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        time.sleep(1)
        return jsonify({"sound": {"scenes": [{"ambiance": "Mock Wind", "score_style": "Synth", "sfx_list": ["Step 1", "Step 2"]}]}})

@app.route('/api/generate/production', methods=['POST'])
@limiter.limit("30 per minute")
def api_generate_production():
    try:
        req = GenerateComponentsRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
        
    if HAS_AI:
        try:
            production_plan = generate_production(req.idea, req.script, req.tone, req.intensity, req.metadata)
            
            # Persist to Project.metadata_json
            if req.project_id:
                try:
                    project = db.session.get(Project, req.project_id)
                    if project:
                        metadata_str = project.metadata_json
                        current_meta = json.loads(metadata_str) if metadata_str else {}
                        if isinstance(current_meta, dict):
                            current_meta['production_plan'] = production_plan
                            project.metadata_json = json.dumps(current_meta)
                            db.session.commit()
                except Exception as db_e:
                    db.session.rollback()
                    print(f"[PROD DB ERROR] {db_e}")

            return jsonify({"production": production_plan})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        time.sleep(1)
        return jsonify({"production": {"locations": ["Mock Hub"], "props": ["Fake Gun"], "estimated_shoot_days": "5", "scene_complexity_rating": "5"}})


# ═══════════════════════════════════════════
# PDF EXPORT (Unchanged)
# ═══════════════════════════════════════════

class PDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Courier", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def safe_text(text):
    """Sanitize text for fpdf 1.7.2 (Latin-1 only)."""
    if text is None:
        return ""
    return str(text).encode('latin-1', 'replace').decode('latin-1')

def render_dict_to_pdf(pdf, data, indent=0):
    """Render a dict/list as formatted text in PDF."""
    prefix = "  " * indent
    if isinstance(data, dict):
        for key, value in data.items():
            label = str(key).replace('_', ' ').upper()
            if isinstance(value, (dict, list)):
                pdf.set_font("Courier", 'B', 11)
                pdf.cell(0, 8, txt=safe_text(f"{prefix}{label}:"), ln=True)
                pdf.set_font("Courier", '', 10)
                render_dict_to_pdf(pdf, value, indent + 1)
            else:
                pdf.set_font("Courier", 'B', 11)
                pdf.cell(0, 8, txt=safe_text(f"{prefix}{label}:"), ln=True)
                pdf.set_font("Courier", '', 10)
                pdf.multi_cell(0, 5, txt=safe_text(f"{prefix}  {value}"))
            pdf.ln(2)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, dict):
                pdf.set_font("Courier", 'B', 11)
                name = item.get('name', item.get('scene_heading', f'Item {i+1}'))
                pdf.cell(0, 8, txt=safe_text(f"{prefix}-- {name} --"), ln=True)
                pdf.set_font("Courier", '', 10)
                for k, v in item.items():
                    if isinstance(v, list):
                        pdf.multi_cell(0, 5, txt=safe_text(f"{prefix}  {k.upper()}: {', '.join(str(x) for x in v)}"))
                    else:
                        pdf.multi_cell(0, 5, txt=safe_text(f"{prefix}  {k.upper()}: {v}"))
                pdf.ln(3)
            else:
                pdf.multi_cell(0, 5, txt=safe_text(f"{prefix}- {item}"))

@app.route('/api/export-pdf', methods=['POST'])
@limiter.limit("10 per minute")
def api_export_pdf():
    try:
        state = request.get_json(silent=True) or {}
        export_type = state.get('exportType', 'full')
        
        screenplay = state.get('screenplay', '').strip()
        if export_type in ['screenplay', 'full'] and not screenplay:
            return jsonify({"error": "No script content provided for export."}), 400
            
        pdf = PDF()
        pdf.set_auto_page_break(auto=True, margin=15.0)
        
        if export_type == "screenplay":
            pdf.add_page()
            pdf.set_margins(38.1, 20.0, 25.4)
            pdf.set_font("Courier", size=12)
            pdf.multi_cell(0, 6, txt=safe_text(screenplay))
            
        elif export_type == "production":
            pdf.add_page()
            pdf.set_margins(20.0, 20.0, 20.0)
            pdf.set_font("Courier", 'B', 16)
            pdf.cell(0, 10, txt="SCRIPTORIA PRODUCTION PLAN", ln=True, align='C')
            pdf.ln(10)
            plan = state.get('productionPlan', {})
            if not plan:
                return jsonify({"error": "No production plan content provided."}), 400
            render_dict_to_pdf(pdf, plan)
                
        elif export_type == "full":
            # Cover page
            pdf.add_page()
            pdf.set_margins(25.4, 20.0, 25.4)
            pdf.set_font("Courier", 'B', 24)
            pdf.ln(60)
            pdf.cell(0, 15, txt="SCRIPTORIA", ln=True, align='C')
            pdf.set_font("Courier", 'B', 16)
            pdf.cell(0, 10, txt="FULL PRODUCTION PACK", ln=True, align='C')
            pdf.ln(20)
            pdf.set_font("Courier", '', 12)
            
            idea = state.get('idea', 'Untitled Project')
            tone = state.get('tone', 'Standard')
            intensity = state.get('intensity', 85)
            
            pdf.multi_cell(0, 7, txt=safe_text(f"LOGLINE: {idea}\n\nTONE: {tone}\nINTENSITY: {intensity}%"), align='C')
            pdf.ln(40)
            pdf.set_font("Courier", "I", 10)
            pdf.cell(0, 10, txt=f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True, align='C')

            # Screenplay
            pdf.add_page()
            pdf.set_margins(38.1, 25.0, 25.4)
            pdf.set_font("Courier", 'B', 14)
            pdf.cell(0, 10, txt="I. MASTER SCREENPLAY", ln=True)
            pdf.ln(5)
            pdf.set_font("Courier", '', 12)
            pdf.multi_cell(0, 6, txt=safe_text(screenplay))
            
            # Characters
            chars = state.get('characters')
            if chars and isinstance(chars, list) and len(chars) > 0:
                pdf.add_page()
                pdf.set_margins(25.4, 20.0, 25.4)
                pdf.set_font("Courier", 'B', 14)
                pdf.cell(0, 10, txt="II. CHARACTER PROFILES", ln=True)
                pdf.ln(5)
                render_dict_to_pdf(pdf, chars)

            # Sound
            sound = state.get('soundPlan')
            if sound and isinstance(sound, dict):
                pdf.add_page()
                pdf.set_margins(25.4, 20.0, 25.4)
                pdf.set_font("Courier", 'B', 14)
                pdf.cell(0, 10, txt="III. SOUNDSCAPE ARCHITECTURE", ln=True)
                pdf.ln(5)
                scenes = sound.get('scenes', sound)
                render_dict_to_pdf(pdf, scenes)
                
            # Production
            plan = state.get('productionPlan')
            if plan and isinstance(plan, dict):
                pdf.add_page()
                pdf.set_margins(25.4, 20.0, 25.4)
                pdf.set_font("Courier", 'B', 14)
                pdf.cell(0, 10, txt="IV. PRODUCTION BREAKDOWN", ln=True)
                pdf.ln(5)
                render_dict_to_pdf(pdf, plan)

        pdf_bytes = pdf.output(dest='S')
        if isinstance(pdf_bytes, str):
            pdf_bytes = pdf_bytes.encode('latin-1')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        filename = f"scriptoria_{export_type}_{int(time.time())}.pdf"
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[PDF EXPORT ERROR] {e}")
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
