from fastapi import FastAPI
import requests
from syllabus import load_syllabus

app = FastAPI()

SYLLABUS_TEXT = load_syllabus("pythonSyllabus.pdf")

API_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

HEADERS = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

@app.get("/")
def root():
    return {"message": "StudyBuddy is running!"}

@app.get("/syllabus")
def get_syllabus():
    return {"syllabus_preview": SYLLABUS_TEXT[:500]}

@app.get("/tasks")
def get_tasks_from_syllabus():
    prompt = f"""Based on the following syllabus content, create two Python programming practice tasks:
---
{SYLLABUS_TEXT[:2000]}"""

    data = {
        "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
        "messages": [{"role": "user", "content": prompt}]
    }

    response = requests.post(API_URL, headers=HEADERS, json=data)

    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        return {"tasks": content}
    else:
        return {
            "error": f"Failed to fetch from OpenRouter. Status: {response.status_code}",
            "details": response.text
        }