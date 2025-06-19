from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Syllabus, Message
from syllabus import parse_pdf
import requests
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.exc import IntegrityError
from models import Topic, Task
import json
import re

from dotenv import load_dotenv
import os

load_dotenv()
API_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

DATABASE_URL = "sqlite:///./studybuddy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://127.0.0.1:5174", "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr

    @validator("email")
    def check_domain(cls, v):
        if not v.endswith("@innopolis.university"):
            raise ValueError("Email must end with @innopolis.university")
        return v

@app.post("/register")
def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")
    user = User(name=data.name, email=data.email)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Email already registered")
    db.refresh(user)
    return {"user_id": user.id}

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.post("/upload_syllabus")
async def upload_syllabus(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()

    from syllabus import parse_pdf
    syllabus_dict = parse_pdf(contents)
    syllabus = Syllabus(filename=file.filename, content=json.dumps(syllabus_dict), user_id=user_id)
    db.add(syllabus)
    db.commit()
    db.refresh(syllabus)

    os.makedirs("uploads", exist_ok=True)
    filepath = f"./uploads/{file.filename}"
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"syllabus_id": syllabus.id}

@app.get("/download_syllabus")
def download_syllabus(user_id: int, db: Session = Depends(get_db)):
    syllabus = db.query(Syllabus).filter(Syllabus.user_id == user_id).order_by(Syllabus.id.desc()).first()
    if not syllabus:
        raise HTTPException(404, "No syllabus found")

    path = f"./uploads/{syllabus.filename}"
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")

    return FileResponse(path=path, media_type="application/pdf")

class ChatRequest(BaseModel):
    user_id: int
    syllabus_id: int
    content: str

@app.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    user_id = req.user_id
    syllabus_id = req.syllabus_id
    content = req.content
    msg_user = Message(sender="user", content=content, user_id=user_id, syllabus_id=syllabus_id)
    db.add(msg_user)
    db.commit()
    db.refresh(msg_user)

    syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    # Преобразуем syllabus.content из JSON-строки в словарь
    try:
        syllabus_dict = json.loads(syllabus.content)
    except json.JSONDecodeError:
        syllabus_dict = {}

    # Попробуем распознать "Week X" в сообщении пользователя
    # Попробуем распознать "Week X" в сообщении пользователя
    match = re.search(r"Week\s*(\d+)", content, re.IGNORECASE)
    week_num = None
    topic = None

    if match:
        week_num = int(match.group(1))
        topic = syllabus_dict.get(str(week_num)) or syllabus_dict.get(week_num)
        if topic:
            content += f"\n(The topic for Week {week_num} is: {topic})"

    # Формируем prompt
    if week_num and topic:
        prompt = (
            f"You are a Python tutor.\n"
            f"The student is asking for help with the topic from Week {week_num}, which is: '{topic}'.\n"
            f"Provide two tasks based on this topic '{topic}'.\n\n"
            f"Student's message:\n{content}"
        )
    else:
        prompt = (
            f"You are a Python tutor.\n"
            f"The student is asking for help, but no clear week or topic was identified.\n"
            f"Try to interpret and respond helpfully anyway.\n\n"
            f"Student's message:\n{content}"
        )

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
        try:
            result = response.json()
            bot_reply = result['choices'][0]['message']['content']
        except Exception as e:
            print("❌ Failed to parse JSON:", e)
            bot_reply = "⚠ Failed to parse AI response."
    else:
        bot_reply = f"⚠ AI error. Status Code: {response.status_code}"

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

@app.delete("/user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(Message).filter(Message.user_id == user_id).delete()

    syllabuses = db.query(Syllabus).filter(Syllabus.user_id == user_id).all()
    for syl in syllabuses:
        db.query(Message).filter(Message.syllabus_id == syl.id).delete()
        db.delete(syl)

    db.delete(user)
    db.commit()
    return {"message": "User and related data deleted"}

@app.get("/topics")
def get_topics(db: Session = Depends(get_db)):
    return db.query(Topic).all()

class TopicCreate(BaseModel):
    title: str
    syllabus_id: int

@app.post("/topics")
def create_topic(topic: TopicCreate, db: Session = Depends(get_db)):
    new_topic = Topic(title=topic.title, syllabus_id=topic.syllabus_id)
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic

@app.get("/tasks")
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

class TaskCreate(BaseModel):
    title: str
    difficulty: str
    topic_id: int

@app.post("/tasks")
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    new_task = Task(title=task.title, difficulty=task.difficulty, topic_id=task.topic_id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.delete("/syllabus")
def delete_syllabus(user_id: int, db: Session = Depends(get_db)):
    syllabus = db.query(Syllabus).filter(Syllabus.user_id == user_id).order_by(Syllabus.id.desc()).first()
    if not syllabus:
        raise HTTPException(status_code=404, detail="No syllabus to delete")
    db.query(Message).filter(Message.syllabus_id == syllabus.id).delete()
    db.delete(syllabus)
    db.commit()
    return {"message": "Syllabus deleted"}