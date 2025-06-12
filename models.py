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
