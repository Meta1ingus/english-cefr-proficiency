from fastapi import FastAPI
from fastapi.responses import JSONResponse
import json
import os

app = FastAPI()

# Root route (optional welcome message)
@app.get("/")
def read_root():
    return {"message": "English CEFR Proficiency API is running."}

# Questions endpoint - loads data from questions.json
@app.get("/questions")
def get_questions():
    try:
        json_path = os.path.join(os.path.dirname(__file__), "questions.json")
        with open(json_path, "r", encoding="utf-8") as f:
            questions = json.load(f)
        return JSONResponse(content=questions)
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"error": "questions.json not found"})
    except json.JSONDecodeError:
        return JSONResponse(status_code=500, content={"error": "Invalid JSON format"})
