# backend\main.py
import threading
import os
from time import sleep
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env locally
if os.environ.get("K_SERVICE") is None:
    load_dotenv()

from db.init_db import init_db
from routes import setup, intro, project, interview, context, resume, case_study

app = FastAPI(
    title="AI Candidate Evaluation System",
    description="Production-ready AI interview pipeline with strictly partitioned loops.",
    version="2.0.0",
)

@app.on_event("startup")
def startup():
    # Execute CREATE TABLE IF NOT EXISTS sequences at startup.
    # We retry a few times to account for DB startup latency if running inside docker-compose.
    def init():
        for i in range(5):
            try:
                init_db()
                print("✅ DB Connection established and tables initialized.")
                break
            except Exception as e:
                print(f"❌ Database initialization failed on attempt {i+1}:", e)
                sleep(5)
    threading.Thread(target=init).start()

# CORS configuration
origins = [
    "https://ai-prep.whitebox-learning.com",
    "http://localhost:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Imports (The new partitioned MVC framework)
app.include_router(setup.router)
app.include_router(intro.router)
app.include_router(project.router)
app.include_router(interview.router)
app.include_router(context.router)
app.include_router(resume.router)
app.include_router(case_study.router)

@app.get("/")
def root():
    return {"message": "AI Candidate Evaluation System Online", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}