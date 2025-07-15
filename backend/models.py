from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column
from datetime import datetime
from syllabus import parse_pdf
from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy import Boolean

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    difficulty = Column(String, default="Beginner")
    progress = Column(Integer, default=0)

    messages = relationship("Message", back_populates="user")
    syllabuses = relationship("Syllabus", back_populates="user")
    solutions = relationship("Solution", back_populates="user")

    email_notifications = Column(Integer, default=0)
   # weekly_report = Column(Integer, default=0)


class Syllabus(Base):
    __tablename__ = "syllabuses"
    id = Column(Integer, primary_key=True)
    filename = Column(String)
    content = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="syllabuses")
    messages = relationship("Message", back_populates="syllabus")
    topics = relationship("Topic", back_populates="syllabus")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    sender = Column(String)  # "user" or "bot"
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    syllabus_id = Column(Integer, ForeignKey("syllabuses.id"))
    user = relationship("User", back_populates="messages")
    syllabus = relationship("Syllabus", back_populates="messages")
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    session = relationship("ChatSession", back_populates="messages")


class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    syllabus_id = Column(Integer, ForeignKey("syllabuses.id"))
    syllabus = relationship("Syllabus", back_populates="topics")
    tasks = relationship("Task", back_populates="topic")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    description = Column(Text)
    difficulty = Column(String)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    topic = relationship("Topic", back_populates="tasks")
    solutions = relationship("Solution", back_populates="task")


class Solution(Base):
    __tablename__ = "solutions"
    id = Column(Integer, primary_key=True)
    content = Column(Text)
    is_correct = Column(Integer)  # 1 или 0
    submitted_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"))
    task = relationship("Task", back_populates="solutions")
    user = relationship("User", back_populates="solutions")


class EmailCode(Base):
    __tablename__ = "email_codes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(unique=True)
    code: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_task_id = Column(Integer, nullable=True)
    last_failed_task_id = Column(Integer, nullable=True)

    name = Column(String)
    chat_number = Column(Integer, nullable=True)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete")

User.chat_sessions = relationship("ChatSession", back_populates="user")
