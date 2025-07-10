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

    # Найдём последнюю сессию
    session = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .first()
    )
    session_id = session.id if session else None

    return {
        "user_id": user.id,
        "user_name": user.name,
        "user_email": user.email,
        "message": f"Welcome back, {user.name}!",
        "syllabus_id": syllabus_id,
        "session_id": session_id
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
    last = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == data.user_id)
        .order_by(ChatSession.chat_number.desc())
        .first()
    )
    next_number = (last.chat_number if last and last.chat_number else 0) + 1

    session = ChatSession(
        user_id=data.user_id,
        chat_number=next_number,
        name=f"Chat {next_number}"  # временно, потом будет обновлено в /chat
    )
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

    prompt = (
        f"You are a helpful but strict Python tutor.\n"
        f"Original task:\n{matched_task.description}\n\n"
        f"Student solution (including first line):\n{user_code}\n\n"

        "INSTRUCTIONS:\n"
        "1. If the solution is fully correct, reply with:\n"
        "'Nice job. Let's move on!'\n\n"

        "2. If the solution is incorrect or incomplete:\n"
        "- First, say: 'Your solution to Task «{matched_task.description}» seems incorrect.'\n"
        "- Then ask: 'Would you like a hint, or do you prefer to try again yourself?'\n"
        "- If they later say they want a hint — give a short, clear hint.\n"
        "- Never write the full solution or copy the student's code again.\n"
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
        if topic_from_week:
            session.name = f"Week {week_num}: {topic_from_week}"
        elif found_topic:
            session.name = f"Topic: {found_topic}"
        else:
            session.name = f"Chat {session.id}"  # fallback
        db.commit()
        # check the amount of correct solutions per topic
        topic = matched_task.topic
        if topic:
            correct_count = db.query(Solution).join(Task).filter(
                Solution.user_id == user_id,
                Solution.task_id == Task.id,
                Task.topic_id == topic.id,
                Solution.is_correct == 1
            ).count()

            if correct_count == 2:
                congrats_message = "Great job — you have completed this topic! Ready to tackle the next one, or would you prefer more practice here?"
                msg_bot = Message(
                    sender="bot",
                    content=congrats_message,
                    user_id=user_id,
                    syllabus_id=data.syllabus_id,
                    session_id=data.session_id
                )
                db.add(msg_bot)
                db.commit()

        raise HTTPException(502, "Error AI")

    is_correct = "Nice job" in ai_text

    if not is_correct:
        session = db.query(ChatSession).filter_by(id=data.session_id).first()
        if session:
            session.last_failed_task_id = matched_task.id
            db.commit()

    sol = Solution(
        user_id=user_id,
        task_id=matched_task.id,
        content=user_code,
        is_correct=1 if is_correct else 0
    )
    db.add(sol);
    db.commit()


    msg_user = Message(
        sender="user",
        content=user_code,
        user_id=user_id,
        syllabus_id=data.syllabus_id,
        session_id=data.session_id
    )
    db.add(msg_user)
    session = db.query(ChatSession).get(data.session_id)
    if session:
        session.last_task_id = matched_task.id
        db.commit()

    msg_bot = Message(
        sender="bot",
        content=ai_text,
        user_id=user_id,
        syllabus_id=data.syllabus_id,
        session_id=data.session_id
    )
    db.add(msg_bot)

    db.commit()

    topic = matched_task.topic
    if topic:
        correct_count = db.query(Solution).join(Task).filter(
            Solution.user_id == user_id,
            Solution.task_id == Task.id,
            Task.topic_id == topic.id,
            Solution.is_correct == 1
        ).count()

        if correct_count == 2:
            congrats_message = "Great job — you have completed this topic! Ready to tackle the next one, or would you prefer more practice here?"
            msg_congrats = Message(
                sender="bot",
                content=congrats_message,
                user_id=user_id,
                syllabus_id=data.syllabus_id,
                session_id=data.session_id
            )
            db.add(msg_congrats)
            db.commit()

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

    match = re.search(r"Week\s*(-?\d+)", content, re.IGNORECASE)

    week_num = None
    topic_from_week = None
    if match:
        week_num = int(match.group(1))
        topic_from_week = syllabus_dict.get(str(week_num)) or syllabus_dict.get(week_num)
        if topic_from_week:
            content += f"\n(The topic for Week {week_num} is: {topic_from_week})"
    else:
        week_num = None
        topic_from_week = None

    found_topic = None
    for week_str, topic in lower_topic_map.items():
        if topic in content.lower():
            found_topic = syllabus_dict[week_str]
            break

    # Название чата на основе week/topic
    if topic_from_week:
        session.name = f"Week {week_num}: {topic_from_week}"
    elif found_topic:
        session.name = f"Topic: {found_topic}"
    else:
        session.name = f"Chat {session.chat_number}"
    db.commit()

    base = f"""Use this template for only two generated tasks:
    Your level: {user_level}

    Task 1: <the name of the task>
    Description: description of the task

    Task 2: <the name of the task>
    Description: description of the task
    """

    if week_num and topic_from_week:
        prompt = base + (
            f"You are a Python tutor.\n"
            f"The student is asking about Week {week_num} — '{topic_from_week}'.\n"
            f"Generate two creative practice tasks for this topic only, no solutions. Before tasks write the {user_level}\n\n"
            f"Student's message:\n{content}"
        )
    elif week_num is not None and not topic_from_week:

        bot_reply = f"Week {week_num} is not found in your syllabus. Please enter a valid week number."
        msg_bot = Message(sender="bot", content=bot_reply, user_id=user_id, syllabus_id=syllabus_id,
                          session_id=session_id)
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


    if content.strip().lower() in ["i want a hint", "hint", "give me a hint"]:
        session = db.query(ChatSession).filter_by(id=session_id).first()
        if session and session.last_failed_task_id:
            task = db.query(Task).get(session.last_failed_task_id)
            task_desc = task.description

            hint_prompt = (
                f"You are a Python tutor.\n"
                f"The student struggled with the task:\n{task_desc}\n"
                f"Please give them a helpful but not full solution hint."
            )

            ai_data = {
                "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
                "messages": [{"role": "user", "content": hint_prompt}]
            }
            try:
                response = requests.post(API_URL, json=ai_data, headers=headers)
                response.raise_for_status()
                reply = response.json()["choices"][0]["message"]["content"]
            except:
                reply = "Failed to generate a hint right now."

            msg_bot = Message(sender="bot", content=reply, user_id=user_id, syllabus_id=syllabus_id,
                              session_id=session_id)
            db.add(msg_bot)
            db.commit()

            chat_history = db.query(Message).filter_by(session_id=session_id).order_by(Message.timestamp).all()
            return {
                "reply": reply,
                "chat_history": [{"sender": m.sender, "content": m.content, "time": m.timestamp} for m in chat_history]
            }

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


@app.get("/user_sessions/{user_id}")
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )

    result = []
    for session in sessions:
        first_msg = (
            db.query(Message)
            .filter(Message.session_id == session.id)
            .order_by(Message.timestamp)
            .first()
        )
        result.append({
            "session_id": session.id,
            "name": session.name or f"Chat {session.id}",
            "messages": [{"text": first_msg.content}] if first_msg else []
        })

    return result

@app.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Удаляем все сообщения этой сессии
    db.query(Message).filter(Message.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}