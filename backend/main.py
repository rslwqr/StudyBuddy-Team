from click import prompt
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
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from models import Solution, Task
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

class LoginRequest(BaseModel):
    name: str
    email: EmailStr


@app.post("/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == data.email,
        User.name == data.name
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your name and email.")

    return {"user_id": user.id, "message": f"Welcome back, {user.name}!"}



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

    for week_num, title in syllabus_dict.items():
        topic = Topic(title=title, syllabus_id=syllabus.id)
        db.add(topic)

    db.commit()

    os.makedirs("uploads", exist_ok=True)
    filepath = f"./uploads/{file.filename}"
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"syllabus_id": syllabus.id}


class SolutionRequest(BaseModel):
    user_id: int
    task_id: int
    code: str

@app.post("/submit_solution")
def submit_solution(data: SolutionRequest, db: Session = Depends(get_db)):
    user_code = data.code

    # Берем 2 последние задачи, с которыми, вероятно, связан код
    tasks = db.query(Task).order_by(Task.id.desc()).limit(2).all()

    matched = False
    reply_text = ""
    matched_task = None

    for task in tasks:
        prompt = (
            f"You are a strict Python tutor.\n"
            f"Here is the original task:\n{task.description}\n\n"
            f"Here is the student's solution:\n{user_code}\n\n"
            f"Evaluate whether the code solves the task correctly. "
            f"If correct, say: 'Nice job. Let's move on!'. "
            f"If incorrect, explain why and provide a correct solution."
        )

        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }

        data_ai = {
            "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
            "messages": [{"role": "user", "content": prompt}]
        }

        try:
            response = requests.post(API_URL, json=data_ai, headers=headers)
            result = response.json()
            reply = result['choices'][0]['message']['content']

            if "Nice job" in reply or "Let's move on" in reply:
                matched = True
                reply_text = reply
                matched_task = task
                break

        except Exception as e:
            print("⚠️ Error checking task:", e)
            continue

    if matched_task:
        solution = Solution(
            user_id=data.user_id,
            task_id=matched_task.id,
            content=user_code,
            is_correct=1
        )
        db.add(solution)
        db.commit()
    else:
        solution = Solution(
            user_id=data.user_id,
            task_id=None,
            content=user_code,
            is_correct=0
        )
        db.add(solution)
        db.commit()

    return {
        "evaluation": reply_text or "❌ Your solution didn't match any known tasks.",
        "is_correct": int(matched)
    }





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

    try:
        syllabus_dict = json.loads(syllabus.content)
        lower_topic_map = {k: v.lower() for k, v in syllabus_dict.items()}
    except json.JSONDecodeError:
        syllabus_dict = {}
        lower_topic_map = {}
    match = re.search(r"Week\s*(\d+)", content, re.IGNORECASE)
    week_num = None
    topic_from_week = None
    if match:
        week_num = int(match.group(1))
        topic_from_week = syllabus_dict.get(str(week_num)) or syllabus_dict.get(week_num)
        if topic_from_week:
            content += f"\n(The topic for Week {week_num} is: {topic_from_week})"

    found_topic = None
    for week_str, topic in lower_topic_map.items():
        if topic in content.lower():
            found_topic = syllabus_dict[week_str]
            break

    if week_num and topic_from_week:
        prompt = (
            f"You are a Python tutor.\n"
            f"The student is asking about Week {week_num} — '{topic_from_week}'.\n"
            f"Generate two creative practice tasks for this topic only, no solutions.\n\n"
            f"Student's message:\n{content}"
        )
    elif week_num and not topic_from_week:
        prompt = (
            f"You are a Python tutor.\n"
            f"The student asked about Week {week_num}, but no topic was found for this week in the syllabus.\n"
            f"Ask the student to clarify or check the syllabus.\n\n"
            f"Student's message:\n{content}"
        )
    elif not week_num and found_topic:
        prompt = (
            f"You are a Python tutor.\n"
            f"The student mentioned the topic: '{found_topic}', which exists in the syllabus.\n"
            f"Generate two practice tasks for this topic only without solutions.\n\n"
            f"Student's message:\n{content}"
        )
    else:
        prompt = (
            f"You are a Python tutor.\n"
            f"The student didn't mention any known topic or week from the syllabus.\n"
            f"Ask them to refer to a specific week or topic.\n\n"
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

    try:
        response = requests.post(API_URL, json=data, headers=headers)
        response.raise_for_status()
        result = response.json()
        bot_reply = result['choices'][0]['message']['content']
        topic_id = None
        if topic_from_week:
            topic_row = db.query(Topic).filter(Topic.title.ilike(f"%{topic_from_week}%")).first()
            if topic_row:
                topic_id = topic_row.id

        task_candidates = re.split(r"(?:###?|Task\s*\d+[:.])", bot_reply, flags=re.IGNORECASE)
        tasks_cleaned = [t.strip() for t in task_candidates if len(t.strip()) > 20]

        for task_text in tasks_cleaned:
            task = Task(description=task_text, difficulty="medium", topic_id=topic_id)
            db.add(task)

        db.commit()

    except Exception as e:
        print("❌ AI error:", e)
        bot_reply = "⚠ Sorry, the AI could not respond at this time."

    # Сохраняем ответ бота
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