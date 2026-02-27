from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=True)
    logline = db.Column(db.Text, nullable=True)
    idea = db.Column(db.Text, nullable=False)
    tone = db.Column(db.String(50), nullable=False)
    intensity = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    screenplay_text = db.Column(db.Text, nullable=True) # Full text of the generated script
    
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
