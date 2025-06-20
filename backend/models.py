from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    name = Column(String)
    syllabuses = relationship("Syllabus", back_populates="user")
    messages = relationship("Message", back_populates="user")

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

