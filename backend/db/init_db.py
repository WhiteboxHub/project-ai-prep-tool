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
    # CREATE TABLES
    # ---------------------------
    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            # ---------------------------
            # 0. MINIMAL WBL BASE TABLES
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS batch (
                    batchid INT NOT NULL AUTO_INCREMENT,
                    PRIMARY KEY (batchid)
                )
            """)

            cursor.execute("""
                INSERT INTO batch (batchid)
                SELECT 150
                WHERE NOT EXISTS (SELECT 1 FROM batch WHERE batchid = 150)
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate (
                    id INT NOT NULL AUTO_INCREMENT,
                    full_name VARCHAR(255),
                    email VARCHAR(255) UNIQUE,
                    batchid INT DEFAULT 150,
                    status VARCHAR(50) DEFAULT 'active',
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    PRIMARY KEY (id),
                    INDEX idx_candidate_email (email)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate_marketing (
                    id INT NOT NULL AUTO_INCREMENT,
                    candidate_id INT NOT NULL,
                    email VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'active',
                    start_date DATE NULL,
                    candidate_json JSON NULL,
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    PRIMARY KEY (id),
                    INDEX idx_candidate_marketing_candidate (candidate_id),
                    INDEX idx_candidate_marketing_email (email)
                )
            """)

            # ---------------------------
            # 1. EVALUATIONS (per-candidate intro tracking)
            #    Uses candidate_marketing.id as FK
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_evaluations (
                    id           INT NOT NULL AUTO_INCREMENT,
                    candidate_id INT NOT NULL,
                    intro_score  INT DEFAULT NULL COMMENT 'AI-evaluated score for candidate intro video',
                    intro_video  VARCHAR(500) DEFAULT NULL COMMENT 'URL/path to candidate intro video',
                    intro_status ENUM('not_started','in_progress','completed','reviewed') DEFAULT 'not_started',
                    login_count  INT NOT NULL DEFAULT 0,
                    last_login   TIMESTAMP NULL DEFAULT NULL,
                    created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    PRIMARY KEY (id),
                    UNIQUE KEY uq_eval_candidate (candidate_id),
                    INDEX idx_eval_candidate (candidate_id)
                )
            """)

            # ---------------------------
            # 2. PROJECT CONTEXT (uses candidate_id INT)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_project_context (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    candidate_id INT NOT NULL,
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

                    UNIQUE KEY uq_proj_candidate (candidate_id),
                    INDEX idx_project_candidate (candidate_id)
                )
            """)

            # ---------------------------
            # 3. ATTEMPTS (uses candidate_id INT)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    candidate_id INT NOT NULL,
                    attempt_type VARCHAR(50),
                    attempt_count INT DEFAULT 0,

                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    UNIQUE(candidate_id, attempt_type),
                    INDEX idx_attempt_candidate (candidate_id)
                )
            """)

            # ---------------------------
            # 4. CASE STUDIES (uses candidate_id INT)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_case_studies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    candidate_id INT NOT NULL,
                    content TEXT,
                    topic VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_case_study_candidate (candidate_id)
                )
            """)

            # ---------------------------
            # 5. CODERPAD CACHE (WBL sync)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_coderpad_cache (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    wbl_email VARCHAR(255) UNIQUE NOT NULL,
                    questions_solved INT DEFAULT 0,
                    total_submissions INT DEFAULT 0,
                    pass_rate DECIMAL(5,2) DEFAULT 0.00,
                    languages_used JSON,
                    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_coderpad_cache_email (wbl_email)
                )
            """)

            # ---------------------------
            # 6. CANDIDATE RESUME (from wbl-backend migration)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate_resume (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    candidate_id INT UNIQUE NOT NULL,
                    resume_json JSON NOT NULL,
                    file_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_resume_candidate_id (candidate_id)
                )
            """)

            # ---------------------------
            # 7. CANDIDATE LLM API KEYS (from wbl-backend migration)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate_llm_api_keys (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    candidate_id INT NOT NULL,
                    provider_name VARCHAR(50) NOT NULL,
                    api_key TEXT NOT NULL,
                    model_name VARCHAR(100),
                    voice_enabled BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    last_used_at TIMESTAMP NULL,
                    is_default BOOLEAN DEFAULT FALSE,
                    INDEX idx_apikey_candidate_id (candidate_id)
                )
            """)

            # ---------------------------
            # 8. PREP TOKENS (one-time sync tokens, replaces Redis)
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS prep_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    token VARCHAR(36) UNIQUE NOT NULL,
                    user_id VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_prep_token (token)
                )
            """)

        conn.commit()
        conn.close()

        print("Database tables initialized successfully.")

    except Exception as e:
        print("Error initializing tables:", e)
