import re

def score_transcript(text: str) -> int:
    words = text.split()
    unique_words = set(words)
    avg_len = sum(len(s.split()) for s in re.split(r'[.!?]', text) if s.strip()) / max(1, text.count('.') + text.count('!') + text.count('?'))
    fillers = ["um", "uh", "like", "you know", "so", "actually"]
    filler_count = sum(text.lower().split().count(f) for f in fillers)

    score_vocab = min(5, len(unique_words) // 10)
    score_length = min(5, int(avg_len))
    score_fluency = 5 if filler_count == 0 else max(1, 5 - filler_count)

    final = round((score_vocab + score_length + score_fluency) / 3)
    return final
