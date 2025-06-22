from fastapi import FastAPI
from typing import List
from pydantic import BaseModel

app = FastAPI()

# Define a Pydantic model for a question
class Question(BaseModel):
    id: int
    questionText: str
    audio: str = None
    image: str = None
    choices: List[str]
    answerType: str
    correctAnswer: str

# Sample data
questions = [
    Question(
        id=1,
        questionText="What instrument is playing?",
        audio="audio/q1.mp3",
        choices=["Piano", "Violin", "Guitar"],
        answerType="multiple-choice",
        correctAnswer="Violin"
    )
]

@app.get("/questions", response_model=List[Question])
def get_questions():
    return questions
