from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from tools.db_utils import get_all_questions, get_all_passages, get_all_rubrics, get_rubric_by_question_id
from pydantic import BaseModel
import whisper
model = whisper.load_model("base")
from utils.scoring import score_transcript
from tools.db_utils import log_response
from fastapi import Query
from tools.db_utils import get_user_responses

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

class EvaluationRequest(BaseModel):
    user_id: int
    question_id: int
    response_text: str
    mode: str  # "writing" or "speaking"


@app.post("/evaluate")
async def evaluate_response(data: EvaluationRequest):
    try:
        rubric = get_rubric_by_question_id(data.question_id)
        if not rubric:
            return JSONResponse(status_code=404, content={"error": "Rubric not found."})

        transcript = None

        if data.mode == "writing":
            transcript = data.response_text
            feedback = f"Scoring writing based on rubric: {rubric[:100]}..."
            score = 3  # Placeholder

            log_response(
                user_id=data.user_id,
                question_id=data.question_id,
                mode="writing",
                transcript=transcript,
                score=score
            )

        elif data.mode == "speaking":
            audio_path = data.response_text

            if audio_path.endswith(".mp3") or audio_path.endswith(".wav"):
                try:
                    result = model.transcribe(audio_path)
                    transcript = result["text"]

                    if isinstance(transcript, list):
                        transcript = " ".join(str(t) for t in transcript)
                    elif not isinstance(transcript, str):
                        transcript = str(transcript)

                    feedback = (
                        f"Transcription: {transcript[:100]}... "
                        f"Scoring based on rubric: {rubric[:100]}..."
                    )
                    score = score_transcript(transcript)

                    log_response(
                        user_id=data.user_id,
                        question_id=data.question_id,
                        mode="speaking",
                        transcript=transcript,
                        score=score
                    )

                except Exception as e:
                    return JSONResponse(
                        status_code=500,
                        content={"error": f"Transcription failed: {str(e)}"}
                    )
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid audio format. Use .mp3 or .wav"}
                )
        else:
            return JSONResponse(
                status_code=400,
                content={"error": "Unsupported mode. Use 'writing' or 'speaking'."}
            )

        return {
            "question_id": data.question_id,
            "score": score,
            "max_score": 5,
            "feedback": feedback,
            "transcript": transcript
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Evaluation failed: {str(e)}"}
        )

@app.get("/responses")
def get_responses(user_id: int = Query(..., description="The ID of the user to retrieve responses for")):
    try:
        responses = get_user_responses(user_id)
        return JSONResponse(content=responses)
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
