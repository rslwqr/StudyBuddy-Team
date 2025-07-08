from fastapi import FastAPI
from models import ChatSession
from fastapi.responses import FileResponse

app = FastAPI()
import datetime
import json
import os
import random
import re
import requests
from dotenv import load_dotenv
from fastapi import UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from pydantic import validator, constr
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
from models import Base, User, Syllabus, Message, EmailCode
from models import Solution, Task
from models import Topic
from datetime import datetime
from typing import List

load_dotenv()
API_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

DATABASE_URL = "sqlite:///studybuddy1.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"
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
    password: constr(min_length=8)

    @validator("email")
    def check_domain(cls, v):
        if not v.endswith("@innopolis.university"):
            raise ValueError("Email must end with @innopolis.university")
        return v


class LoginRequest(BaseModel):
    password: str
    email: EmailStr


@app.post("/login_with_password")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.password != data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    syllabus = (
        db.query(Syllabus)
        .filter(Syllabus.user_id == user.id)
        .order_by(Syllabus.id.desc())
        .first()
    )
    syllabus_id = syllabus.id if syllabus else None

    return {
        "user_id": user.id,
        "user_name": user.name,
        "user_email": user.email,
        "message": f"Welcome back, {user.name}!",
        "syllabus_id": syllabus_id
    }


class ChatIn(BaseModel):
    content: str


@app.post("/register")
def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")
    user = User(name=data.name, email=data.email, password=data.password)
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
    session_id: int
    syllabus_id: int



class SolutionResponse(BaseModel):
    evaluation: str
    is_correct: int


class SessionResponse(BaseModel):
    session_id: int
    created_at: datetime


class SessionCreateRequest(BaseModel):
    user_id: int

@app.get("/download_syllabus")
def download_syllabus(user_id: int, db: Session = Depends(get_db)):
    syllabus = (
        db.query(Syllabus)
        .filter(Syllabus.user_id == user_id)
        .order_by(Syllabus.id.desc())
        .first()
    )
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    filepath = f"./uploads/{syllabus.filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=syllabus.filename
    )

@app.post("/sessions", response_model=SessionResponse)
def create_session(data: SessionCreateRequest, db: Session = Depends(get_db)):
    session = ChatSession(user_id=data.user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "created_at": session.created_at}



@app.post("/submit_solution", response_model=SolutionResponse)
def submit_solution(
        data: SolutionRequest,
        db: Session = Depends(get_db),
):
    user_code = data.code.strip()
    user_id = data.user_id

    # 1) Разбор первой строки
    lines = user_code.splitlines()
    if not lines:
        raise HTTPException(400, "Please, start with: Task N: name of the task")

    m = re.match(r"^Task\s*\d+\s*:\s*(.+)$", lines[0], flags=re.IGNORECASE)
    if not m:
        raise HTTPException(
            400,
            "Incorrect form. First line should contain only: Task N: name of the task"
        )

    task_name = m.group(1).strip()
    # 2) Ищем задачу в БД (по части названия, нечувствительно к регистру)
    matched_task = (
        db.query(Task)
        .filter(Task.description.ilike(f"%{task_name}%"))
        .first()
    )
    if not matched_task:
        raise HTTPException(
            404,
            f"Task «{task_name}» is not defined. Please check your first line for correct task's name."
        )

    # 3) Формируем prompt для AI-проверки
    prompt = (
        f"You are a strict Python tutor.\n"
        f"Original task:\n{matched_task.description}\n\n"
        f"Student solution (including first line):\n{user_code}\n\n"
        "If solution fully solves the task reply exactly these words and nothing more:\n"
        "'Nice job. Let's move on!'\n"
        f"If solution is not fully covered the task explain shortly but understandably why this solution: \n{user_code} is partly correct."
        f"If solution: \n{user_code} is absolutely wrong for the : \n{matched_task.description}\n\n. Write: Wrong solution, please resolve it. "
    )

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    ai_payload = {
        "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        resp = requests.post(API_URL, json=ai_payload, headers=headers)
        resp.raise_for_status()
        ai_text = resp.json()["choices"][0]["message"]["content"]
    except Exception:
        sol = Solution(
            user_id=user_id,
            task_id=matched_task.id,
            content=user_code,
            is_correct=0
        )
        db.add(sol);
        db.commit()
        raise HTTPException(502, "Ошибка при проверке AI, повторите попытку позже.")

    is_correct = "Nice job" in ai_text
    sol = Solution(
        user_id=user_id,
        task_id=matched_task.id,
        content=user_code,
        is_correct=1 if is_correct else 0
    )
    db.add(sol);
    db.commit()

    # Сохраняем сообщение пользователя
    msg_user = Message(
        sender="user",
        content=user_code,
        user_id=user_id,
        syllabus_id=data.syllabus_id,
        session_id=data.session_id
    )
    db.add(msg_user)

    # Сохраняем сообщение от бота
    msg_bot = Message(
        sender="bot",
        content=ai_text,
        user_id=user_id,
        syllabus_id=data.syllabus_id,
        session_id=data.session_id
    )
    db.add(msg_bot)

    db.commit()


    # 5) Возвращаем ответ
    return SolutionResponse(
        evaluation=ai_text,
        is_correct=int(is_correct)
    )


class ChatRequest(BaseModel):
    user_id: int
    syllabus_id: int
    content: str
    session_id: int


@app.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    user_id = req.user_id
    syllabus_id = req.syllabus_id
    content = req.content
    session_id = req.session_id

    session = db.query(ChatSession).filter_by(id=session_id, user_id=req.user_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_level = user.difficulty or "Beginner"

    msg_user = Message(sender="user", content=content, user_id=user_id, syllabus_id=syllabus_id, session_id=session_id)
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

    base = f"""You are a Python tutor. Student level: {user_level}
    Use this level to adjust task difficulty.

    Use this template for only two generated tasks:
    Your level: {user_level} \n
    Task 1: <the name of the task>
    Description: description of the task \n
    Task 2: <the name of the task>
    Description: description of the task \n
    """

    if week_num and topic_from_week:
        prompt = base + (
            f"You are a Python tutor.\n"
            f"The student is asking about Week {week_num} — '{topic_from_week}'.\n"
            f"Generate two creative practice tasks for this topic only, no solutions. Before tasks write the {user_level}\n\n"
            f"Student's message:\n{content}"
        )
    elif week_num and not topic_from_week:
        prompt = base + (
            f"You are a Python tutor.\n"
            f"The student asked about Week {week_num}, but no topic was found for this week in the syllabus.\n"
            f"Ask the student to clarify or check the syllabus.\n\n"
            f"Student's message:\n{content}"
        )
    elif not week_num and found_topic:
        prompt = base + (
            f"You are a Python tutor.\n"
            f"The student mentioned the topic: '{found_topic}', which exists in the syllabus.\n"
            f"Generate two practice tasks for this topic only without solutions. Before tasks write the {user_level}\n\n"
            f"Student's message:\n{content}"
        )
    else:

        prompt = base + (
            f"You are a Python tutor.\n"
            f"The student didn't mention any known topic or week from the syllabus.\n"
            f"Ask them to refer to a specific week or topic and no more words.\n\n"
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

        # Безопасно получаем ответ AI
        bot_reply = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

        if not bot_reply:
            raise ValueError("Empty response from AI")

        topic_id = None
        if topic_from_week:
            topic_row = db.query(Topic).filter(Topic.title.ilike(f"%{topic_from_week}%")).first()
            if topic_row:
                topic_id = topic_row.id

        pattern = re.compile(
            r"(Task\s*\d+[:.].*?)(?=(?:Task\s*\d+[:.]|$))",
            flags=re.IGNORECASE | re.DOTALL
        )

        tasks_blocks = [blk.strip() for blk in pattern.findall(bot_reply)]

        for task_text in tasks_blocks:
            task = Task(description=task_text, difficulty="medium", topic_id=topic_id)
            db.add(task)
        db.commit()

    except Exception as e:
        print("=== AI error ===")
        print(e)
        try:
            print("Raw response:", response.text)
        except:
            pass
        bot_reply = "\u26a0 Sorry, the AI could not respond at this time."

    msg_bot = Message(sender="bot", content=bot_reply, user_id=user_id, syllabus_id=syllabus_id, session_id=session_id)
    db.add(msg_bot)
    db.commit()
    db.refresh(msg_bot)

    chats = db.query(Message).filter_by(
        user_id=req.user_id,
        syllabus_id=req.syllabus_id,
        session_id=session_id
    ).order_by(Message.timestamp).all()

    return {
        "reply": bot_reply,
        "chat_history": [
            {"sender": m.sender, "content": m.content, "time": m.timestamp} for m in chats
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


@app.post("/send_code")
def send_code(email: EmailStr, db: Session = Depends(get_db)):
    code = str(random.randint(100000, 999999))

    existing = db.query(EmailCode).filter(EmailCode.email == email).first()
    if existing:
        existing.code = code
        existing.created_at = datetime.utcnow()
    else:
        db.add(EmailCode(email=email, code=code))

    db.commit()
    print(f"🔐 Your verification code: {code}")
    return {"message": "Verification code sent to your email"}


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    name: str
    password: constr(min_length=6)


@app.post("/verify_code_and_register")
def verify_code(req: VerifyCodeRequest, db: Session = Depends(get_db)):
    record = db.query(EmailCode).filter(EmailCode.email == req.email).first()
    if not record or record.code != req.code:
        raise HTTPException(400, "Invalid or expired code")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(409, "User already exists")

    user = User(name=req.name, email=req.email, password=req.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id}


@app.get("/latest_syllabus_id")
def get_latest_syllabus_id(user_id: int, db: Session = Depends(get_db)):
    syllabus = db.query(Syllabus).filter(Syllabus.user_id == user_id).order_by(Syllabus.id.desc()).first()
    if not syllabus:
        raise HTTPException(404, "No syllabus found for this user.")
    return {"syllabus_id": syllabus.id}


@app.get("/syllabus")
def get_syllabus(user_id: int, db: Session = Depends(get_db)):
    syllabus = (
        db
        .query(Syllabus)
        .filter(Syllabus.user_id == user_id)
        .order_by(Syllabus.id.desc())
        .first()
    )
    if not syllabus:
        raise HTTPException(status_code=404, detail="No syllabus found for this user")
    return {
        "syllabus_id": syllabus.id,
        "filename": syllabus.filename,
        "content": json.loads(syllabus.content)
    }


# main.py

from fastapi import Path


@app.get("/profile/{user_id}/difficulty")
def get_difficulty(
        user_id: int = Path(..., description="ID пользователя"),
        db: Session = Depends(get_db)
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return {"difficulty": user.difficulty}


class DifficultyRequest(BaseModel):
    difficulty: str


@app.post("/profile/{user_id}/difficulty")
def set_difficulty(
        user_id: int,
        req: DifficultyRequest,
        db: Session = Depends(get_db)
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # можно проверить, что уровень корректный
    if req.difficulty not in ("Beginner", "Intermediate", "Advanced"):
        raise HTTPException(400, "Invalid difficulty")
    user.difficulty = req.difficulty
    db.commit()
    return {"difficulty": user.difficulty}


@app.get("/user_progress/{user_id}")
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    syllabus = (
        db.query(Syllabus)
        .filter(Syllabus.user_id == user_id)
        .order_by(Syllabus.id.desc())
        .first()
    )
    if not syllabus:
        raise HTTPException(404, "No syllabus found for this user")

    topics = syllabus.topics
    total_topics = len(topics)
    completed_topics = 0

    for topic in topics:
        tasks = topic.tasks
        correct_count = 0
        for task in tasks:
            correct_solutions = db.query(Solution).filter(
                Solution.user_id == user_id,
                Solution.task_id == task.id,
                Solution.is_correct == 1
            ).count()
            correct_count += correct_solutions

        if correct_count >= 2:
            completed_topics += 1

    percentage = round((completed_topics / total_topics) * 100) if total_topics > 0 else 0
    user.progress = percentage
    db.commit()

    return {
        "completed_topics": completed_topics,
        "total_topics": total_topics,
        "progress_percentage": percentage
    }


class ChatHistoryItem(BaseModel):
    sender: str
    content: str
    timestamp: datetime

    class Config:
        orm_mode = True


@app.get(
    "/chat_history/{session_id}",
    response_model=List[ChatHistoryItem],
    summary="Получить историю чата по session_id"
)
def get_chat_history(
        session_id: int,
        db: Session = Depends(get_db),
):
    # Проверяем, что такая сессия существует
    chat_sess = db.query(ChatSession).get(session_id)

    if not chat_sess:
        raise HTTPException(404, detail=f"Session {session_id} not found")

    # Достаём все сообщения, отсортированные по времени
    msgs = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.timestamp)
        .all()
    )

    return msgs

