from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sys

# Include current file’s directory in Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Internal imports
from tools.db_utils import (
    get_all_questions,
    get_all_passages,
    get_all_rubrics,
    get_rubric_by_question_id,
    log_response,
    get_user_responses,
    get_user_summary
)
from utils.scoring import score_transcript
from utils.transcriber import transcribe_with_huggingface

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://127.0.0.1:8001"] for more restriction
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static audio files
app.mount("/audio", StaticFiles(directory=os.path.join("public", "audio")), name="audio")

@app.get("/")
def read_root():
    return {"message": "English CEFR Proficiency API is running."}


@app.get("/questions")
def get_questions():
    try:
        return JSONResponse(content=get_all_questions())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/passages")
def get_passages():
    try:
        return JSONResponse(content=get_all_passages())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/rubrics")
def get_rubrics():
    try:
        return JSONResponse(content=get_all_rubrics())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


class EvaluationRequest(BaseModel):
    user_id: int
    question_id: int
    response_text: str  # For writing: actual text | For speaking: path to .mp3/.wav
    mode: str           # Either "writing" or "speaking"


@app.post("/evaluate")
async def evaluate_response(data: EvaluationRequest):
    try:
        rubric = get_rubric_by_question_id(data.question_id)
        if not rubric:
            return JSONResponse(status_code=404, content={"error": "Rubric not found."})

        transcript = None
        feedback = None
        score = None

        if data.mode == "writing":
            transcript = data.response_text
            feedback = f"Scoring writing based on rubric: {rubric[:100]}..."
            score = 3  # Placeholder score—for future grammar/style integration

        elif data.mode == "speaking":
            audio_path = data.response_text
            if audio_path.endswith(".mp3") or audio_path.endswith(".wav"):
                try:
                    transcript = transcribe_with_huggingface(audio_path)
                    feedback = (
                        f"Transcription: {transcript[:100]}... "
                        f"Scoring based on rubric: {rubric[:100]}..."
                    )
                    score = score_transcript(transcript)
                except Exception as e:
                    return JSONResponse(status_code=500, content={"error": f"Transcription failed: {str(e)}"})
            else:
                return JSONResponse(status_code=400, content={"error": "Invalid audio format. Use .mp3 or .wav"})
        else:
            return JSONResponse(status_code=400, content={"error": "Unsupported mode. Use 'writing' or 'speaking'."})

        log_response(
            user_id=data.user_id,
            question_id=data.question_id,
            mode=data.mode,
            transcript=transcript,
            score=score
        )

        return {
            "question_id": data.question_id,
            "score": score,
            "max_score": 5,
            "feedback": feedback,
            "transcript": transcript
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Evaluation failed: {str(e)}"})


@app.get("/responses")
def get_responses(user_id: int = Query(..., description="User ID to retrieve responses for")):
    try:
        return JSONResponse(content=get_user_responses(user_id))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/summary")
def get_summary(user_id: str = Query(..., description="User ID to generate performance summary for")):
    try:
        return JSONResponse(content=get_user_summary(user_id))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
