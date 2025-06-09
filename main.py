from fastapi import FastAPI
import requests

app = FastAPI()

# OpenRouter API параметры
API_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

data = {
    "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
    "messages": [{"role": "user", "content": "Create two Python Programming Tasks on Polymorphism"}]
}


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/tasks")
async def get_python_tasks():
    # Отправляем запрос к OpenRouter API
    response = requests.post(API_URL, headers=headers, json=data)

    if response.status_code == 200:
        result = response.json()
        # Возвращаем только сгенерированный контент
        content = result['choices'][0]['message']['content']
        return {"tasks": content}
    else:
        return {
            "error": f"Failed to fetch from OpenRouter. Status: {response.status_code}",
            "details": response.text
        }