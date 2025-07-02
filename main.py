from fastapi import FastAPI, Query, HTTPException, Body
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
    db_connection,
    get_all_questions,
    get_all_passages,
    get_all_rubrics,
    get_rubric_by_question_id,
    log_response,
    get_user_responses,
    get_user_summary,
    score_transcript_by_rubric
)

from utils.scoring import score_transcript
from utils.transcriber import transcribe_with_huggingface

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://meta1ingus.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register_user")
def register_user(data: dict = Body(...)):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    with db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE name = %s", (name,))
        result = cursor.fetchone()

        if result:
            user_id = result[0]
        else:
            cursor.execute("INSERT INTO users (name) VALUES (%s) RETURNING id", (name,))
            user_id = cursor.fetchone()[0]
            conn.commit()

    return {"user_id": user_id}

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
        criteria_scores = {}

        # --- Mode: Writing ---
        if data.mode == "writing":
            transcript = data.response_text.strip()

            if len(transcript.split()) < 5:
                return JSONResponse(status_code=400, content={"error": "Text too short to evaluate."})

            rubric_id = rubric["rubric_id"] if isinstance(rubric, dict) else rubric.rubric_id
            score, criteria_scores = score_transcript_by_rubric(transcript, rubric_id)
            feedback = f"Writing scored using rubric: {len(criteria_scores)} criteria. Avg: {score}/5"


        # --- Mode: Speaking ---
        elif data.mode == "speaking":
            audio_path = data.response_text

            if not (audio_path.endswith(".mp3") or audio_path.endswith(".wav")):
                return JSONResponse(status_code=400, content={"error": "Invalid audio format. Use .mp3 or .wav"})

            try:
                # Returns transcript + optional metadata
                transcript_obj = transcribe_with_huggingface(audio_path)
                if isinstance(transcript_obj, dict):
                    transcript = transcript_obj.get("text", "")
                    confidence = transcript_obj.get("confidence", None)
                else:
                    transcript = transcript_obj
                    confidence = None

                if len(transcript.split()) < 4:
                    return JSONResponse(status_code=400, content={"error": "Speech too short to evaluate."})

                rubric_id = rubric["rubric_id"] if isinstance(rubric, dict) else rubric.rubric_id
                score, criteria_scores = score_transcript_by_rubric(transcript, rubric_id)
                feedback = (
                    f"Speech scored using rubric: {len(criteria_scores)} criteria. "
                    f"Avg: {score}/5. Confidence: {confidence if confidence else 'N/A'}"
                )

            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Transcription failed: {str(e)}"})

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
            "mode": data.mode,
            "score": score,
            "max_score": 5,
            "feedback": feedback,
            "transcript": transcript,
            "criteria": criteria_scores if criteria_scores else None
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
def get_summary(user_id: int = Query(..., description="User ID to generate performance summary for")):
    try:
        return JSONResponse(content=get_user_summary(user_id))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})