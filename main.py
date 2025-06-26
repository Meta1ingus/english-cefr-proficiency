from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from tools.db_utils import get_all_questions, get_all_passages, get_all_rubrics  # Ensure these functions exist in db_utils.py

app = FastAPI()

# Static route for serving audio files
app.mount("/audio_files", StaticFiles(directory="audio_files"), name="audio_files")

@app.get("/")
def read_root():
    return {"message": "English CEFR Proficiency API is running."}

@app.get("/questions")
def get_questions():
    try:
        questions = get_all_questions()
        return JSONResponse(content=questions)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/passages")
def get_passages():
    try:
        passages = get_all_passages()
        return JSONResponse(content=passages)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/rubrics")
def get_rubrics():
    try:
        rubrics = get_all_rubrics()
        return JSONResponse(content=rubrics)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
