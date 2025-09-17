import os
from supabase import create_client
from dotenv import load_dotenv
from collections import defaultdict

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Only load .env in local development
if os.getenv("RENDER") is None:  # Optional: define your own flag
    from dotenv import load_dotenv
    load_dotenv(dotenv_path="tools/.env")

def get_all_questions():
    # 1. Fetch questions
    questions_res = supabase.table("questions").select("*").execute()
    if not hasattr(questions_res, "data") or questions_res.data is None:
        raise Exception("❌ Supabase query failed or returned no data")
    question_rows = questions_res.data

    # 2. Fetch choices
    choices_res = supabase.table("choices").select("*").order("question_id").execute()
    if not hasattr(choices_res, "data") or choices_res.data is None:
        raise Exception("❌ Supabase query for choices failed or returned no data")
    choice_rows = choices_res.data

    # 3. Group choices by question_id
    choice_map = defaultdict(list)
    for choice in choice_rows:
        choice_map[choice["question_id"]].append({
            "id": choice["id"],
            "label": choice["label"],
            "choice_text": choice.get("choice_text", "")
        })

    # 4. Merge questions and choices
    questions_list = []
    for q in question_rows:
        questions_list.append({
            "question_id": q["id"],
            "questionText": q["question_text"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "answerType": q["answer_type"],
            "correctAnswer": q["correct_answer"],
            "minWordCount": q.get("min_word_count"),
            "writingType": q.get("writing_type"),
            "rubricId": q.get("rubric_id"),
            "readingId": q.get("reading_id"),
            "audio": q.get("audio"),
            "choices": choice_map.get(q["id"], [])
        })

    return questions_list

def get_all_rubrics():
    response = supabase.table("rubrics").select("id, rubric_text").execute()
    if not hasattr(response, "data") or response.data is None:
        raise Exception("Failed to fetch rubrics from Supabase")
    return {row["id"]: row["rubric_text"] for row in response.data}

def get_all_passages():
    response = supabase.table("passages").select("reading_id, passage_text").execute()
    if not hasattr(response, "data") or response.data is None:
        raise Exception("Failed to fetch passages from Supabase")
    return {row["reading_id"]: row["passage_text"] for row in response.data}

def get_rubric_by_question_id(question_id):
    # Step 1: Get the question
    question_res = supabase.table("questions").select("rubric_id").eq("id", question_id).single().execute()
    if not hasattr(question_res, "data") or question_res.data is None:
        raise Exception(f"❌ No question found with ID {question_id}")
    rubric_id = question_res.data.get("rubric_id")
    if rubric_id is None:
        return None

    # Step 2: Get the rubric
    rubric_res = supabase.table("rubrics").select("rubric_text").eq("id", rubric_id).single().execute()
    if not hasattr(rubric_res, "data") or rubric_res.data is None:
        raise Exception(f"❌ No rubric found with ID {rubric_id}")
    return rubric_res.data["rubric_text"]


def log_response(user_id, question_id, response_text, is_correct=None, score=None):
    payload = {
        "user_id": user_id,
        "question_id": question_id,
        "response_text": response_text,
        "is_correct": is_correct,
        "score": score
    }

    response = supabase.table("responses").insert(payload).execute()
    if not hasattr(response, "data") or response.data is None:
        raise Exception("❌ Failed to log response to Supabase")
    return response.data

def get_user_responses(user_id: int):
    response = supabase.table("responses").select(
        "question_id, mode, transcript, score, submitted_at"
    ).eq("user_id", user_id).order("submitted_at", desc=True).execute()

    if not hasattr(response, "data") or response.data is None:
        raise Exception("❌ Failed to fetch user responses")

    results = []
    for r in response.data:
        results.append({
            "question_id": r.get("question_id"),
            "mode": r.get("mode"),
            "transcript": r.get("transcript"),
            "score": r.get("score"),
            "submitted_at": r.get("submitted_at")
        })

    return results

def get_user_summary(user_id):
    response = supabase.table("responses").select("score").eq("user_id", user_id).execute()
    if not hasattr(response, "data") or response.data is None:
        raise Exception("❌ Failed to fetch user summary")

    scores = [r["score"] for r in response.data if r.get("score") is not None]
    return {
        "total_responses": len(response.data),
        "average_score": round(sum(scores) / len(scores), 2) if scores else None
    }

def score_transcript_by_rubric(question_id, transcript):
    # Step 1: Get rubric_id from question
    question_res = supabase.table("questions").select("rubric_id").eq("id", question_id).single().execute()
    if not hasattr(question_res, "data") or question_res.data is None:
        raise Exception(f"❌ No question found with ID {question_id}")
    rubric_id = question_res.data.get("rubric_id")
    if rubric_id is None:
        return {"score": None, "feedback": "No rubric attached to this question."}

    # Step 2: Get rubric text
    rubric_res = supabase.table("rubrics").select("rubric_text").eq("id", rubric_id).single().execute()
    if not hasattr(rubric_res, "data") or rubric_res.data is None:
        return {"score": None, "feedback": "Rubric not found."}
    rubric_text = rubric_res.data.get("rubric_text")

    # Step 3: Apply scoring logic (placeholder)
    score = min(len(transcript.split()) // 10, 5)  # crude word-count-based score
    if rubric_text is not None:
        feedback = f"Scored based on rubric: {rubric_text[:60]}..."
    else:
        feedback = "Scored, but rubric text was not found."

    return {"score": score, "feedback": feedback}