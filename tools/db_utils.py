import os
import psycopg2
from dotenv import load_dotenv
from collections import defaultdict

# Only load .env in local development
if os.getenv("RENDER") is None:  # Optional: define your own flag
    from dotenv import load_dotenv
    load_dotenv(dotenv_path="tools/.env")

def get_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", "5432")
    )

def get_all_questions():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Get questions
    cursor.execute("""
        SELECT id, question_text, category, difficulty, answer_type,
               correct_answer, min_word_count, writing_type, rubric_id, reading_id
        FROM questions;
    """)
    question_rows = cursor.fetchall()

    # 2. Get choices
    cursor.execute("""
        SELECT question_id, label, choice_text
        FROM choices
        ORDER BY question_id, label;
    """)
    choice_rows = cursor.fetchall()

    # 3. Group choices by question_id and flatten to ["A. Text", "B. Text", "C. Text"]
    choice_map = defaultdict(list)
    for question_id, label, choice_text in choice_rows:
        label_text = f"{label}. {choice_text}"
        choice_map[question_id].append(label_text)

    cursor.close()
    conn.close()

    # 4. Merge everything
    return [
        {
            "question_id": q[0],
            "questionText": q[1],
            "category": q[2],
            "difficulty": q[3],
            "answerType": q[4],
            "correctAnswer": q[5],
            "minWordCount": q[6],
            "writingType": q[7],
            "rubricId": q[8],
            "readingId": q[9],
            "choices": choice_map.get(q[0], [])
        }
        for q in question_rows
    ]

def get_all_rubrics():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT rubric_id, description FROM rubrics;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return {rubric_id: description for rubric_id, description in rows}

def get_all_passages():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT reading_id, passage_text FROM passages;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return {reading_id: passage_text for reading_id, passage_text in rows}

def get_rubric_by_question_id(question_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.description
        FROM questions q
        JOIN rubrics r ON q.rubric_id = r.rubric_id
        WHERE q.id = %s;
    """, (question_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row[0] if row else None

def log_response(user_id, question_id, mode, transcript, score):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO responses (user_id, question_id, mode, transcript, score)
        VALUES (%s, %s, %s, %s, %s);
    """, (user_id, question_id, mode, transcript, score))

    conn.commit()
    cursor.close()
    conn.close()

def get_user_responses(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT question_id, mode, transcript, score, submitted_at
        FROM responses
        WHERE user_id = %s
        ORDER BY submitted_at DESC;
    """, (user_id,))

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Format results as a list of dictionaries
    results = []
    for r in rows:
        results.append({
            "question_id": r[0],
            "mode": r[1],
            "transcript": r[2],
            "score": r[3],
            "submitted_at": r[4].isoformat()
        })

    return results

def get_user_summary(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*), AVG(score)
        FROM responses
        WHERE user_id = %s;
    """, (user_id,))
    row = cursor.fetchone()
    if row is not None:
        total, avg = row
    else:
        total, avg = 0, None

    cursor.execute("""
        SELECT score, mode, submitted_at
        FROM responses
        WHERE user_id = %s
        ORDER BY submitted_at DESC
        LIMIT 1;
    """, (user_id,))
    recent = cursor.fetchone()

    cursor.close()
    conn.close()

    return {
        "total_submissions": total or 0,
        "average_score": float(round(avg, 2)) if avg is not None else None,
        "most_recent_score": recent[0] if recent else None,
        "most_recent_mode": recent[1] if recent else None,
        "last_updated": recent[2].isoformat() if recent else None
    }
