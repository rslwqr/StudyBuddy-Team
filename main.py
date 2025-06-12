from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Syllabus, Message
from syllabus import parse_pdf
import requests


DATABASE_URL = "sqlite:///./studybuddy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)
app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register")
def register_user(name: str, email: str, db: Session = Depends(get_db)):
    user = User(name=name, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id}

@app.post("/upload_syllabus")
async def upload_syllabus(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    syllabus_text = parse_pdf(contents)
    syllabus = Syllabus(filename=file.filename, content=syllabus_text, user_id=user_id)
    db.add(syllabus)
    db.commit()
    db.refresh(syllabus)
    return {"syllabus_id": syllabus.id}

API_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

@app.post("/chat")
def chat(user_id: int, syllabus_id: int, content: str, db: Session = Depends(get_db)):
    msg_user = Message(sender="user", content=content, user_id=user_id, syllabus_id=syllabus_id)
    db.add(msg_user)
    db.commit()
    db.refresh(msg_user)

    syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    prompt = f"Here is the syllabus:\n{syllabus.content[:1500]}\n\n{content}"

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
        "messages": [{"role": "user", "content": prompt}]
    }
    response = requests.post(API_URL, json=data, headers=headers)

    if response.status_code == 200:
        result = response.json()
        bot_reply = result['choices'][0]['message']['content']
    else:
        bot_reply = f"Failed to fetch data from API. Status Code: {response.status_code}"

    msg_bot = Message(sender="bot", content=bot_reply, user_id=user_id, syllabus_id=syllabus_id)
    db.add(msg_bot)
    db.commit()
    db.refresh(msg_bot)

    messages = db.query(Message).filter(
        Message.user_id == user_id,
        Message.syllabus_id == syllabus_id
    ).order_by(Message.timestamp).all()

    return {
        "reply": bot_reply,
        "chat_history": [
            {"sender": m.sender, "content": m.content, "time": m.timestamp} for m in messages
        ]
    }
