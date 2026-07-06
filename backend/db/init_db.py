"""
backend/db/init_db.py

Initializes only the AI Prep Tool–specific tables in the shared WBL database (wbl_dump).

The following tables ALREADY EXIST in wbl_dump (created by wbl-backend migrations)
and must NOT be re-created here:
  - candidate              (WBL core candidate table)
  - candidate_marketing    (WBL marketing phase tracking)
  - candidate_llm_api_keys (WBL candidate LLM API keys)
  - candidate_resume       (WBL candidate resume store)

Tables created/managed by this script (AI Prep Tool–specific):
  - aiprep_tool_candidates     — session tracking (user_id UUID / numeric, api_key, login state)
  - aiprep_tool_resumes        — AI-extracted resume JSON per candidate
  - aiprep_tool_project_context — candidate project context for interview coaching
  - aiprep_tool_evaluations    — intro + interview evaluation records
  - aiprep_tool_attempts       — attempt rate-limiting per candidate
  - aiprep_tool_case_studies   — generated case studies per candidate
  - prep_tokens                — one-time secure session sync tokens
"""

from db.connection import get_db_connection
import pymysql
import os


def init_db():
    print("Initializing Database structure...")

    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "ai_prep")
    port = int(os.getenv("DB_PORT", 3306))

    # ---------------------------
    # CREATE DATABASE IF NOT EXISTS
    # (Only needed when NOT using shared wbl_dump; safe to run either way)
    # ---------------------------
    try:
        setup_conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port
        )
        with setup_conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        setup_conn.commit()
        setup_conn.close()
    except Exception as e:
        print(f"Error creating database {db_name}:", e)

    # ---------------------------
    # CREATE AI PREP TOOL–SPECIFIC TABLES
    # ---------------------------
    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:

            # ------------------------------------------------------------------
            # 1. AIPREP_TOOL_CANDIDATES
            #    Tracks per-candidate AI Prep session state:
            #      - user_id: either a UUID (legacy) or the WBL candidate.id as string
            #      - wbl_email: links back to candidate_marketing / candidate tables
            #      - api_key_encrypted: single fallback LLM key (legacy; new keys go in candidate_llm_api_keys)
            #      - login_count, last_login, extraction_status: prep workflow state
            #
            #    NOTE: candidate / candidate_marketing / candidate_llm_api_keys already
            #    exist in wbl_dump — do NOT re-create them here.
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_candidates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) UNIQUE NOT NULL,
                    wbl_email VARCHAR(255) UNIQUE,
                    name VARCHAR(255),
                    email VARCHAR(255),
                    role VARCHAR(255),

                    api_key_encrypted TEXT,
                    login_count INT DEFAULT 1,
                    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    extraction_status VARCHAR(50) DEFAULT 'pending',

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    INDEX idx_user_id (user_id)
                )
            """)

            # ------------------------------------------------------------------
            # 2. AIPREP_TOOL_RESUMES
            #    Stores the AI-extracted structured resume JSON (separate from the
            #    raw uploaded file tracked in WBL's candidate_resume table).
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_resumes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) UNIQUE NOT NULL,
                    resume_json JSON,
                    resume_pdf_url VARCHAR(1024),

                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    INDEX idx_resume_user (user_id)
                )
            """)

            # ------------------------------------------------------------------
            # 3. AIPREP_TOOL_PROJECT_CONTEXT
            #    Stores the candidate's project / domain context used for
            #    interview coaching and case study generation.
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_project_context (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) UNIQUE NOT NULL,
                    product TEXT,
                    architecture TEXT,
                    business_value TEXT,
                    role TEXT,
                    impact TEXT,
                    business_problem TEXT,
                    previous_system TEXT,
                    key_objectives TEXT,
                    users_scale TEXT,
                    agents_components TEXT,
                    key_workflows TEXT,
                    tools_integrations TEXT,
                    tech_stack TEXT,
                    ai_techniques TEXT,
                    evaluation_approach TEXT,
                    challenges_learnings TEXT,
                    safety_guardrails TEXT,
                    future_roadmap TEXT,
                    company_name TEXT,
                    key_problems TEXT,
                    agent_usage VARCHAR(50),
                    learnings TEXT,
                    domain VARCHAR(255),
                    background TEXT,
                    skills JSON,

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    INDEX idx_project_user (user_id)
                )
            """)

            # ------------------------------------------------------------------
            # 4. AIPREP_TOOL_EVALUATIONS
            #    Stores intro video + interview answer evaluations.
            #    type: 'intro' | 'interview_answer' | 'interview_complete'
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_evaluations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    type VARCHAR(50),
                    score INT,
                    passed BOOLEAN,

                    feedback JSON,
                    raw_response JSON,
                    video_url VARCHAR(1024),

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    INDEX idx_eval_user (user_id),
                    INDEX idx_eval_type (type)
                )
            """)

            # ------------------------------------------------------------------
            # 5. AIPREP_TOOL_ATTEMPTS  (already exists in production — safe no-op)
            #    Tracks attempt counts per candidate for rate-limiting.
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    attempt_type VARCHAR(50),
                    attempt_count INT DEFAULT 0,

                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    UNIQUE(user_id, attempt_type),
                    INDEX idx_attempt_user (user_id)
                )
            """)

            # ------------------------------------------------------------------
            # 6. AIPREP_TOOL_CASE_STUDIES
            #    Stores AI-generated case studies per candidate.
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_case_studies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    content TEXT,
                    topic VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_case_study_user (user_id)
                )
            """)

            # ------------------------------------------------------------------
            # 7. PREP_TOKENS
            #    One-time secure tokens used to link WBL sessions to AI Prep sessions.
            # ------------------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS prep_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    token VARCHAR(36) UNIQUE NOT NULL,
                    user_id VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_prep_token (token)
                )
            """)

        # ------------------------------------------------------------------
        # SAFE COLUMN ALTERS
        # These are idempotent — they silently fail if the column already exists.
        # Used to upgrade existing deployments without re-running full migrations.
        # ------------------------------------------------------------------

        safe_alters = [
            # aiprep_tool_candidates columns
            "ALTER TABLE aiprep_tool_candidates ADD COLUMN wbl_email VARCHAR(255) UNIQUE",
            "ALTER TABLE aiprep_tool_candidates ADD COLUMN api_key_encrypted TEXT",
            "ALTER TABLE aiprep_tool_candidates ADD COLUMN extraction_status VARCHAR(50) DEFAULT 'pending'",
            "ALTER TABLE aiprep_tool_candidates ADD COLUMN login_count INT DEFAULT 1",
            "ALTER TABLE aiprep_tool_candidates ADD COLUMN last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
            # aiprep_tool_project_context columns
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN domain VARCHAR(255)",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN background TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN skills JSON",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN business_problem TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN previous_system TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN key_objectives TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN users_scale TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN agents_components TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN key_workflows TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN tools_integrations TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN tech_stack TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN ai_techniques TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN evaluation_approach TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN challenges_learnings TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN safety_guardrails TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN future_roadmap TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN company_name TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN key_problems TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN learnings TEXT",
            "ALTER TABLE aiprep_tool_project_context ADD COLUMN agent_usage VARCHAR(50)",
            # aiprep_tool_evaluations columns
            "ALTER TABLE aiprep_tool_evaluations ADD COLUMN video_url VARCHAR(1024)",
        ]

        for alter_sql in safe_alters:
            try:
                with conn.cursor() as cursor:
                    cursor.execute(alter_sql)
            except Exception:
                pass  # Column already exists — safe to ignore

        conn.commit()
        conn.close()

        print("Database tables initialized successfully.")

    except Exception as e:
        print("Error initializing tables:", e)