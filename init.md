# Scriptopia Project Initialization & Log

## Current Status
- **Project Structure**: We have consolidated the project into a single `scriptopia` folder. The older, incomplete duplicate folder (`Scriptoria`) has been deleted.
- **Backend Infrastructure**: The backend is set up as a Python Flask application running locally at `http://127.0.0.1:5000`.
- **AI Integration**: The project currently uses `google.generativeai` (Gemini 1.5 Flash) across its modular engines (Script, Character, Sound, Production, Metadata) to process and generate short film blueprints.
- **Dependencies**: All dependencies inside `requirements.txt` (Flask, FPDF, Google SDKs, etc.) have been verified and are running successfully in a local `venv`.

## Recent Updates
1. **Repository Cleanup**: Removed the empty placeholder folder to avoid confusion.
2. **Environment Verification**: Fixed start-up issues and verified that the Flask server can boot up without errors.
3. **Model Evaluation**: Discussed migrating the core logic from Gemini 1.5 Flash to Claude 3.7 Sonnet (Anthropic API).

## Next Steps
- Implement the transition from Gemini to **Claude 3.7 Sonnet** for the script/content generation logic.
- Switch out the `google.generativeai` imports for the `anthropic` Python SDK.
- Create new prompts and generation scripts optimized for Claude's conversational and creative formatting capabilities.
