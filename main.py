from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from fastapi.responses import RedirectResponse
from fastapi.requests import Request
from fastapi import status
import traceback
import os
import sys
import re  # ✅ Added for clean()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools.db_utils import (
    get_all_questions,
    get_all_passages,
    get_all_rubrics,
    get_rubric_by_question_id,
    log_response,
    get_user_responses,
    get_user_summary,
    score_transcript_by_rubric
)

from utils.transcriber import transcribe_with_huggingface

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")  # 👈 Load from environment variable
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # 👈 Load from environment variable

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

    response = supabase.table("users").select("id").eq("name", name).execute()

    if response.data:
        user_id = response.data[0]["id"]
    else:
        insert_response = supabase.table("users").insert({"name": name}).execute()
        if not insert_response.data or "id" not in insert_response.data[0]:
            raise HTTPException(status_code=500, detail="Failed to insert user into Supabase")
        user_id = insert_response.data[0]["id"]

    return {"user_id": user_id}

@app.options("/register_user")
def options_register_user():
    return JSONResponse(content={}, status_code=200)

app.mount("/audio", StaticFiles(directory=os.path.join("public", "audio")), name="audio")

@app.get("/")
def read_root():
    return {"message": "English CEFR Proficiency API is running."}

@app.get("/questions")
def get_questions():
    try:
        print("DATABASE_URL:", os.getenv("DATABASE_URL"))
        print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
        data = get_all_questions()
        return JSONResponse(content=data)
    except Exception as e:
        print("Error in /questions:", str(e))
        traceback.print_exc()  # ← This is the key line to add
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
        data = get_all_rubrics()
        if not data:
            return JSONResponse(status_code=404, content={"error": "No rubrics found"})
        return JSONResponse(content=data)
    except Exception as e:
        print("❌ /rubrics error:", str(e))
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

# ✅ Model aligned with frontend keys
class EvaluationRequest(BaseModel):
    userId: int
    questionId: int
    mode: str
    response_text: Optional[str] = None
    choice_id: Optional[int] = None

    model_config = ConfigDict(
        validate_by_name=True,
        validate_by_alias=True
    )

# ✅ Utility for normalizing text comparison
def clean(text):
    return re.sub(r'\W+', '', text or '').strip().lower()

@app.post("/evaluate")
async def evaluate_response(data: EvaluationRequest):
    try:
        rubric = get_rubric_by_question_id(data.questionId)
        if not rubric and data.mode != "multiple-choice":
            return JSONResponse(status_code=404, content={"error": "Rubric not found."})

        transcript = None
        feedback = None
        score = None
        criteria_scores = {}

        if data.mode == "writing":
            if not data.response_text or not isinstance(data.response_text, str):
                return JSONResponse(status_code=400, content={"error": "Missing or invalid response text for writing task."})

            transcript = data.response_text.strip()
            if len(transcript.split()) < 5:
                return JSONResponse(status_code=400, content={"error": "Text too short to evaluate."})

            rubric_id = rubric["rubric_id"] if isinstance(rubric, dict) else getattr(rubric, "rubric_id", None)
            if rubric_id is None:
                return JSONResponse(status_code=400, content={"error": "Rubric ID not found for this writing task."})

            score, criteria_scores = score_transcript_by_rubric(transcript, rubric_id)
            feedback = f"Writing scored using rubric: {len(criteria_scores)} criteria. Avg: {score}/5"

        elif data.mode == "speaking":
            audio_path = data.response_text
            if not audio_path or not isinstance(audio_path, str):
                return JSONResponse(status_code=400, content={"error": "Missing or invalid audio path for speaking task."})

            if not (audio_path.endswith(".mp3") or audio_path.endswith(".wav")):
                return JSONResponse(status_code=400, content={"error": "Audio file must be .mp3 or .wav"})

            transcript_obj = transcribe_with_huggingface(audio_path)
            if isinstance(transcript_obj, dict):
                transcript = transcript_obj.get("text", "")
                confidence = transcript_obj.get("confidence", None)
            else:
                transcript = transcript_obj
                confidence = None

            if len(transcript.split()) < 4:
                return JSONResponse(status_code=400, content={"error": "Speech too short to evaluate."})

            rubric_id = rubric["rubric_id"] if isinstance(rubric, dict) else getattr(rubric, "rubric_id", None)
            if rubric_id is None:
                return JSONResponse(status_code=400, content={"error": "Rubric ID not found for this speaking task."})

            score, criteria_scores = score_transcript_by_rubric(transcript, rubric_id)
            feedback = (
                f"Speech scored using rubric: {len(criteria_scores)} criteria. "
                f"Avg: {score}/5. Confidence: {confidence if confidence else 'N/A'}"
            )

        elif data.mode == "multiple-choice":
            if data.choice_id is None:
                return JSONResponse(status_code=400, content={"error": "Missing choice ID for multiple-choice task."})

            # Supabase: Get selected choice text
            choice_res = supabase.table("choices").select("choice_text").eq("id", data.choice_id).single().execute()
            if not hasattr(choice_res, "data") or choice_res.data is None:
                return JSONResponse(status_code=404, content={"error": "Selected choice not found."})
            user_choice_text = choice_res.data.get("choice_text")

            # Supabase: Get correct answer
            question_res = supabase.table("questions").select("correct_answer").eq("id", data.questionId).single().execute()
            if not hasattr(question_res, "data") or question_res.data is None:
                return JSONResponse(status_code=404, content={"error": "Correct answer not found."})
            correct_text = question_res.data.get("correct_answer")

            is_correct = clean(user_choice_text) == clean(correct_text)
            score = 1 if is_correct else 0
            feedback = "✅ Correct!" if is_correct else "❌ Incorrect."
            transcript = user_choice_text

        else:
            return JSONResponse(status_code=400, content={"error": "Unsupported mode. Use 'writing', 'speaking', or 'multiple-choice'."})

        # ✅ Updated log_response call
        log_response(
            user_id=data.userId,
            question_id=data.questionId,
            response_text=transcript,
            is_correct=(score == 1 if data.mode == "multiple-choice" else None),
            score=score
        )

        return {
            "questionId": data.questionId,
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
    
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    return RedirectResponse(url="/?redirected=true", status_code=status.HTTP_302_FOUND)