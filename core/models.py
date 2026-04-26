from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import text, inspect

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    projects = db.relationship('Project', backref='user', lazy=True)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # nullable for legacy rows
    title = db.Column(db.String(200), nullable=True)
    logline = db.Column(db.Text, nullable=True)
    idea = db.Column(db.Text, nullable=False)
    tone = db.Column(db.String(50), nullable=False)
    intensity = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    screenplay_text = db.Column(db.Text, nullable=True)
    
    # Store global arcs and metadata here for memory persistence
    metadata_json = db.Column(db.Text, nullable=True)

class Scene(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    scene_number = db.Column(db.Integer, nullable=False)
    heading = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    
class Characters(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    backstory = db.Column(db.Text, nullable=True)
    motivation = db.Column(db.Text, nullable=True)
    arc = db.Column(db.Text, nullable=True)


def safe_migrate(app):
    """Safe migration: add missing columns without dropping data."""
    with app.app_context():
        # Create any entirely new tables (e.g. users)
        db.create_all()

        # Check if 'user_id' column exists in 'project' table
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('project')]
        
        if 'user_id' not in columns:
            print("[MIGRATION] Adding 'user_id' column to 'project' table...")
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE project ADD COLUMN user_id INTEGER REFERENCES users(id)'))
                conn.commit()
            print("[MIGRATION] Done.")
        else:
            print("[MIGRATION] 'user_id' column already exists. Skipping.")
