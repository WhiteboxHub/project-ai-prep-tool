# Handoff Report: Backend Application & API Services Exploration

## 1. Observation

### Repository & Directory Structure
- **Backend Directory**: `C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\backend`
- **Subdirectories**:
  - `backend/db/`: Database connection pool (`connection.py`) using `DBUtils.PooledDB` + PyMySQL, DB schema initialization (`init_db.py`).
  - `backend/models/`: Pydantic schemas for Candidate (`candidate.py`), Evaluation (`evaluation.py`), Attempts (`attempts.py`).
  - `backend/routes/`: 11 API routers handling system endpoints:
    - `setup.py` (`/api/setup`): Session init, API key validation, resume upload, project extraction status.
    - `intro.py` (`/api/intro`): Audio/Video and Text intro evaluation, dynamic intro template generation, intro history.
    - `project.py` (`/api/project`): Project context saving, atomic UPSERT, project evaluation.
    - `interview.py` (`/api/interview`): Stage questions generation, live interview answer evaluation, interview completion report.
    - `report.py` (`/api/report`): Aggregated final executive report (resume, project, intro evals, interview evals).
    - `context.py` (`/api/context`): Full candidate context retrieval.
    - `resume.py` (`/api/resume`): Resume project extraction and latest project retrieval.
    - `case_study.py` (`/api/case-study`): Production case study generation (`agentic`, `rag`, `finetuning`, `mlops`, `system_design`, `intro_template`) and history.
    - `youtube.py` (`/api/youtube`): Resumable video upload URI generation, YouTube API token refresh, playlist integration.
    - `candidate_setup.py` (`/api/candidate`): WBL JWT-based candidate profile, resume CRUD, LLM API key management, prep token sync.
    - `analytics.py` (`/api/analytics`): Admin analytics report, candidate usage summary, CoderPad stats cache sync.
  - `backend/services/`: Core business logic & LLM wrappers:
    - `ai_client.py`: Multi-provider LLM wrapper (AsyncOpenAI & Google GenAI), key validation, text generation, Whisper STT.
    - `llm_service.py`: Context-injected LLM caller (`call_llm_with_context`).
    - `evaluator.py`: Intro & project evaluation routines, prompt loaders, JSON parser & consistency validator.
    - `speech_service.py`: Audio compression (`ffmpeg`), Whisper STT, technical glossary phonetic correction (`jellyfish`).
    - `user_context.py`: Decrypted API key and provider context resolver per user.
    - `context_service.py`: Candidate context builder.
    - `resume_source.py`: Candidate resume JSON reader/writer.
    - `prompts/`: Text prompts for case studies, coaching, intro evaluations, and project evaluations.
  - `backend/templates/`: PDF case study references (`case_study_agentic_ai.pdf`, `case_study_mlops.pdf`, `case_study_rag.pdf`) and text templates (`intro_template.docx`, `intro_template.txt`).
  - `backend/utils/`: Security encryption/decryption (`security.py`), WBL JWT authentication (`wbl_auth.py`).

### Dependencies & Existing Test Configuration
- `backend/requirements.txt`:
  - `fastapi==0.111.0`, `uvicorn[standard]==0.29.0`, `sqlalchemy==2.0.30`, `pydantic==2.7.1`
  - `python-multipart==0.0.9`, `pymupdf==1.24.3`, `python-docx==1.1.2`, `openai==1.30.3`, `google-genai>=1.0.0`
  - `python-dotenv==1.0.1`, `aiofiles==23.2.1`, `httpx==0.27.0`, `pymysql==1.1.0`, `cryptography==42.0.7`
  - `DBUtils>=3.1.0`, `python-jose[cryptography]==3.3.0`, `requests==2.31.0`, `jellyfish==1.2.1`, `imageio-ffmpeg>=0.5.0`
- **Existing Test Files**: No test files exist in `backend/`. `httpx` is already listed in `requirements.txt`, making it ready for `TestClient` or `AsyncClient` HTTP API testing. `pytest` and `pytest-asyncio` need to be installed or added to requirements.

### Database Tables Initialized (`backend/db/init_db.py`)
1. `aiprep_tool_project_context`: Stores candidate project metadata, domain, architecture, impact, tech stack, business problem.
2. `aiprep_tool_evaluations`: Stores append-only evaluation attempts (intro, intro_jd, project), scores, feedback JSON, video URL.
3. `aiprep_tool_attempts`: Stores attempt counters per candidate and attempt type.
4. `aiprep_tool_case_studies`: Stores generated markdown case studies by topic and candidate_id.
5. `aiprep_tool_coderpad_cache`: Stores CoderPad performance stats synced from WBL.
6. `candidate_resume`: Stores uploaded candidate resume JSON.
7. `candidate_llm_api_keys`: Stores encrypted provider API keys per candidate.
8. `prep_tokens`: Stores one-time 5-minute sync tokens.

### Complete Public API Endpoints
| Router | HTTP Method | Endpoint | Description |
|---|---|---|---|
| Core | GET | `/` | System root status message |
| Core | GET | `/health` | Health check endpoint |
| Static | GET | `/uploads/{path}` | Static recorded intro video files |
| Setup | POST | `/api/setup/validate` | Validates provider API key and stores encrypted key |
| Setup | POST | `/api/setup/init` | Initializes session and login tracking |
| Setup | POST | `/api/setup/resume` | Uploads resume JSON, triggers async project extraction |
| Setup | GET | `/api/setup/summary` | Retrieves resume summary and configured LLM keys |
| Setup | POST | `/api/setup/sync-from-wbl` | Syncs resume & candidate data from WBL via prep token |
| Setup | POST | `/api/setup/init-and-summary` | Atomic session init and summary retrieval |
| Setup | DELETE | `/api/setup/llm-key/{key_id}` | Removes candidate LLM API key by ID |
| Setup | GET | `/api/setup/extraction-status` | Checks status of background project extraction |
| Setup | POST | `/api/setup/verify-reasoning` | Verifies LLM reasoning API key functionality |
| Intro | POST | `/api/intro/evaluate` | Evaluates audio/video self-introduction |
| Intro | POST | `/api/intro/evaluate-text` | Evaluates text transcript self-introduction |
| Intro | GET | `/api/intro/dynamic-template` | Generates personalized self-intro template |
| Intro | GET | `/api/intro/history` | Paginated intro attempt history |
| Intro | GET | `/api/intro/history/{attempt_id}` | Detailed intro evaluation result by ID |
| Project | POST | `/api/project/` | Saves & evaluates candidate 18-field project context |
| Project | GET | `/api/project/history` | Fetches project attempt status & case study IDs |
| Interview | GET | `/api/interview/stage-questions` | Starts mock interview stage and returns tailored Q1 |
| Interview | POST | `/api/interview/evaluate-live` | Evaluates live answer, returns score + next question |
| Interview | POST | `/api/interview/complete` | Generates 11-dimension final executive interview report |
| Report | GET | `/api/report/` | Aggregated report of resume, project, and evaluations |
| Context | GET | `/api/context/{user_id}` | Full candidate context object |
| Resume | POST | `/api/resume/extract-project` | LLM extraction of project details from resume |
| Resume | GET | `/api/resume/latest-project` | Latest saved project context / basic resume project fields |
| Case Study | POST | `/api/case-study/generate-typed` | Generates typed case study (`agentic`, `rag`, `mlops`, etc.) |
| Case Study | GET | `/api/case-study/history` | History of generated typed case studies |
| YouTube | GET | `/api/youtube/status` | Checks YouTube OAuth configuration status |
| YouTube | POST | `/api/youtube/get-upload-uri` | Initiates YouTube resumable upload session |
| YouTube | POST | `/api/youtube/update-video-url` | Links uploaded YouTube video ID to evaluation record |
| Candidate | GET | `/api/candidate/me` | Logged-in candidate profile info via WBL auth token |
| Candidate | GET | `/api/candidate/setup-status` | Setup completion flags (resume & API keys) |
| Candidate | POST | `/api/candidate/resume` | Creates candidate resume JSON |
| Candidate | GET | `/api/candidate/resume` | Reads candidate resume JSON |
| Candidate | PUT | `/api/candidate/resume` | Updates candidate resume JSON |
| Candidate | POST | `/api/candidate/api-keys` | Validates & saves encrypted LLM key |
| Candidate | GET | `/api/candidate/api-keys` | Lists masked LLM API keys |
| Candidate | DELETE | `/api/candidate/api-keys/{key_id}` | Deletes candidate LLM API key |
| Candidate | POST | `/api/candidate/generate-prep-token` | Generates one-time prep sync token |
| Candidate | GET | `/api/candidate/sync-data` | Exchanges prep token for resume & decrypted keys |
| Analytics | GET | `/api/analytics/ai-prep-report` | Admin WBL dashboard aggregate report |
| Analytics | GET | `/api/analytics/summary` | Admin summary metrics |
| Analytics | GET | `/api/analytics/candidates` | Admin candidate prep progress list |
| Analytics | GET | `/api/analytics/candidates/{candidate_id}` | Admin candidate detailed history view |
| Analytics | POST | `/api/analytics/sync-coderpad/{candidate_id}` | Syncs CoderPad stats from WBL backend |

---

## 2. Logic Chain

1. **Architecture Assessment**:
   - The backend is built as a single, decoupled FastAPI application (`main.py`) running Uvicorn.
   - It exposes 46 REST endpoints organized into 11 distinct APIRouter modules under `/api/`.
   - Data persistence relies on a MySQL database (via `pymysql` and `DBUtils.PooledDB`). Table schemas are dynamically initialized at application startup via `init_db()`.
2. **Current Test Gap**:
   - Zero test files exist in the `backend/` directory.
   - However, `httpx` is included in `requirements.txt`, which provides the exact client needed for FastAPI testing (`TestClient` or `httpx.AsyncClient`).
3. **AAA Testing Strategy (Without Internal Mocking)**:
   - To achieve realistic, production-grade test coverage, endpoints should be tested end-to-end as black boxes over HTTP using `httpx.AsyncClient(app=app, base_url="http://testserver")` or `starlette.testclient.TestClient`.
   - **Arrange**:
     - Use a dedicated test MySQL database (configured via `DATABASE_URL` environment variable during test run).
     - Call `init_db()` in a pytest fixture to create all database tables before test execution.
     - Seed test candidate records, test API key data, or call setup endpoints (`/api/setup/init`, `/api/candidate/resume`).
   - **Act**:
     - Execute HTTP requests against the FastAPI app router using `async client.get(...)`, `async client.post(...)`, etc.
   - **Assert**:
     - Assert HTTP status code (200, 201, 400, 404, 401, 429, 500).
     - Assert response JSON body structure (Pydantic model validation).
     - Assert DB side-effects (e.g., query database directly to verify row insertion in `aiprep_tool_evaluations`, `candidate_llm_api_keys`, `aiprep_tool_project_context`).

---

## 3. Caveats

- **External AI Service Dependency**: Endpoints that invoke OpenAI/Gemini (such as `/api/intro/evaluate`, `/api/project/`, `/api/interview/evaluate-live`, `/api/case-study/generate-typed`) require an active, funded API key. For integration testing without mocking internal Python functions, test suites should either supply a valid sandbox/test API key or use lightweight test payloads against offline endpoints like `/health`, `/api/setup/init`, `/api/setup/summary`, `/api/context/{id}`, `/api/candidate/setup-status`.
- **Database Dependency**: Tests must run against a running MySQL database instance (local MySQL or Docker container).

---

## 4. Conclusion

The AI Prep Tool backend is a well-structured, production-ready FastAPI application with 46 public endpoints handling setup, resume processing, AI intro evaluation, project explanation, mock interviews, case study generation, and admin analytics. Automated test coverage is currently absent and should be introduced using a black-box AAA approach targeting the public HTTP API endpoints.

---

## 5. Verification Method

### How to Verify Backend Build & Execution
1. Navigate to backend directory:
   `cd C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\backend`
2. Start backend server:
   `python -m uvicorn main:app --host 127.0.0.1 --port 8000`
3. Verify server startup logs indicate:
   `DB Connection established and tables initialized.`
4. Verify HTTP Health check:
   `curl http://127.0.0.1:8000/health` -> Expect `{"status":"ok"}`
5. Verify HTTP Root endpoint:
   `curl http://127.0.0.1:8000/` -> Expect `{"message":"AI Candidate Evaluation System Online","version":"2.0.0"}`

### Invalidation Conditions
- Any route handler failing to return valid JSON matching Pydantic response models.
- Missing database tables or connection pool exhaustion under concurrent HTTP test load.
