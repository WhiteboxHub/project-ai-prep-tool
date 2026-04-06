# backend\models.py
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), unique=True, index=True)   # browser-side session token
    api_key = Column(String(255), nullable=False)
    api_provider = Column(String(255), default="openai")        # "openai" | "gemini"
    resume_text = Column(Text, nullable=True)
    resume_path = Column(String(255), nullable=True)
    candidate_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CaseStudy(Base):
    __tablename__ = "case_studies"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class IntroAttempt(Base):
    __tablename__ = "intro_attempts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True)
    transcript = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectExtraction(Base):
    __tablename__ = "project_extractions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True)
    project_details = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MockInterviewSession(Base):
    __tablename__ = "mock_interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True)
    questions_json = Column(Text, nullable=True)   # JSON list of questions
    created_at = Column(DateTime, default=datetime.utcnow)


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True)
    mock_session_id = Column(Integer, nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    overall_score = Column(Text, nullable=True)   # stored as string to keep decimal
    scores_json = Column(Text, nullable=True)     # JSON of dimension scores
    feedback = Column(Text, nullable=True)
    ideal_answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FinalReport(Base):
    __tablename__ = "final_reports"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
