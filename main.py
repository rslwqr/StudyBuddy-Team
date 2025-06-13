from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Syllabus, Message
from syllabus import parse_pdf
import requests
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import Depends
from models import User
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

DATABASE_URL = "sqlite:///./studybuddy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://localhost:5174"],
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
        raise HTTPException(
            status_code=409,
            detail="User with this email already exists"
        )
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
    syllabus_text = parse_pdf(contents)
    syllabus = Syllabus(filename=file.filename, content=syllabus_text, user_id=user_id)
    db.add(syllabus)
    db.commit()
    db.refresh(syllabus)
    return {"syllabus_id": syllabus.id}



@app.get("/download_syllabus")
def download_syllabus(user_id: int, db: Session = Depends(get_db)):
    syl = db.query(Syllabus).filter(Syllabus.user_id==user_id).order_by(Syllabus.id.desc()).first()
    if not syl:
        raise HTTPException(404, "No syllabus found")
    return FileResponse(path=f"./uploads/{syl.filename}", media_type='application/pdf')


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
