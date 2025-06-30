import requests
import os

HF_API_TOKEN = os.getenv("HF_API_TOKEN")

def transcribe_with_huggingface(audio_path: str) -> str:
    if not HF_API_TOKEN:
        return "[Missing Hugging Face API token]"

    with open(audio_path, "rb") as f:
        response = requests.post(
            "https://api-inference.huggingface.co/models/openai/whisper-base",
            headers={"Authorization": f"Bearer {HF_API_TOKEN}"},
            files={"file": f}
        )
    
    result = response.json()
    return result.get("text", "[Transcription failed]")
