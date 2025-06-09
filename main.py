import requests

# Replace with your OpenRouter API key
API_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

# Define the headers for the API request
headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Define the request payload (data)
data = {
    "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
    "messages": [{"role": "user", "content": "Create two Python Programming Tasks on Polymorphism"}]
}

# Send the POST request to the DeepSeek API
response = requests.post(API_URL, json=data, headers=headers)

# Check if the request was successful
if response.status_code == 200:
    print("API Response:", response.json())
else:
    print("Failed to fetch data from API. Status Code:", response.status_code)