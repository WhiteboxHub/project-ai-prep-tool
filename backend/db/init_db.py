# # backend\db\init_db.py
# from db.connection import get_db_connection
# import pymysql

# def init_db():
#     print("Initializing Database structure...")
    
#     # We might need to create the database itself first if it does not exist, 
#     # but get_db_connection expects db_name to connect. 
#     # To be safe, we try to create the database using a generic connection over pymysql without selecting a db first.
#     import os
#     host = os.getenv("DB_HOST", "localhost")
#     user = os.getenv("DB_USER", "root")
#     password = os.getenv("DB_PASSWORD", "")
#     db_name = os.getenv("DB_NAME", "ai_prep")
#     port = int(os.getenv("DB_PORT", 3306))
    
#     try:
#         setup_conn = pymysql.connect(host=host, user=user, password=password, port=port)
#         with setup_conn.cursor() as cursor:
#             cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
#         setup_conn.commit()
#         setup_conn.close()
#     except Exception as e:
#         print(f"Error creating database {db_name}:", e)
#         # Continue and let get_db_connection fail if the DB really doesn't exist

#     try:
#         conn = get_db_connection()
#         with conn.cursor() as cursor:
#             # 1. aiprep_tool_candidates
#             cursor.execute("""
#                 CREATE TABLE IF NOT EXISTS aiprep_tool_candidates (
#                     id INT AUTO_INCREMENT PRIMARY KEY,
#                     user_id VARCHAR(255) UNIQUE NOT NULL,
#                     name VARCHAR(255),
#                     email VARCHAR(255),
#                     role VARCHAR(255),
#                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#                 )
#             """)
            
#             # 2. aiprep_tool_resumes
#             cursor.execute("""
#                 CREATE TABLE IF NOT EXISTS aiprep_tool_resumes (
#                     id INT AUTO_INCREMENT PRIMARY KEY,
#                     user_id VARCHAR(255) UNIQUE NOT NULL,
#                     resume_json JSON,
#                     resume_pdf_url VARCHAR(1024),
#                     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
#                 )
#             """)

#             # 3. aiprep_tool_project_context
#             cursor.execute("""
#                 CREATE TABLE IF NOT EXISTS aiprep_tool_project_context (
#                     id INT AUTO_INCREMENT PRIMARY KEY,
#                     user_id VARCHAR(255) UNIQUE NOT NULL,
#                     product TEXT,
#                     architecture TEXT,
#                     business_value TEXT,
#                     role TEXT,
#                     impact TEXT,
#                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#                     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
#                 )
#             """)

#             # 4. aiprep_tool_evaluations
#             cursor.execute("""
#                 CREATE TABLE IF NOT EXISTS aiprep_tool_evaluations (
#                     id INT AUTO_INCREMENT PRIMARY KEY,
#                     user_id VARCHAR(255) NOT NULL,
#                     type VARCHAR(50),
#                     score INT,
#                     passed BOOLEAN,
#                     feedback JSON,
#                     raw_response JSON,
#                     video_url VARCHAR(255) DEFAULT NULL,
#                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#                 )
#             """)

#             # 5. aiprep_tool_attempts
#             cursor.execute("""
#                 CREATE TABLE IF NOT EXISTS aiprep_tool_attempts (
#                     id INT AUTO_INCREMENT PRIMARY KEY,
#                     user_id VARCHAR(255) NOT NULL,
#                     attempt_type VARCHAR(50),
#                     attempt_count INT DEFAULT 0,
#                     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
#                     UNIQUE(user_id, attempt_type)
#                 )
#             """)
            
#         try:
#             with conn.cursor() as cursor:
#                 cursor.execute("ALTER TABLE aiprep_tool_project_context MODIFY COLUMN product TEXT")
#                 cursor.execute("ALTER TABLE aiprep_tool_project_context MODIFY COLUMN role TEXT")
#         except Exception:
#             pass # Ignore if it fails or table doesn't exist etc.

#         conn.commit()
#         conn.close()
#         print("Database tables initialized successfully.")
#     except Exception as e:
#         print("Error initializing tables:", e)



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
            # 1. CANDIDATES (UPDATED)
            # ---------------------------
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

            # ---------------------------
            # 2. RESUMES
            # ---------------------------
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

            # ---------------------------
            # 3. PROJECT CONTEXT
            # ---------------------------
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

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    INDEX idx_project_user (user_id)
                )
            """)

            # ---------------------------
            # 4. EVALUATIONS
            # ---------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aiprep_tool_evaluations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    type VARCHAR(50),
                    score INT,
                    passed BOOLEAN,

                    feedback JSON,
                    raw_response JSON,
                    video_url VARCHAR(255) DEFAULT NULL,

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    INDEX idx_eval_user (user_id),
                    INDEX idx_eval_type (type)
                )
            """)

            # ---------------------------
            # 5. ATTEMPTS (UPSERT FRIENDLY)
            # ---------------------------
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
            # ---------------------------
            # 6. CASE STUDIES
            # ---------------------------
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

        # ---------------------------
        # SAFE ALTERS (for existing DBs)
        # ---------------------------
        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_candidates ADD COLUMN wbl_email VARCHAR(255) UNIQUE")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                # Add new columns if missing
                cursor.execute("ALTER TABLE aiprep_tool_candidates ADD COLUMN api_key_encrypted TEXT")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_candidates ADD COLUMN extraction_status VARCHAR(50) DEFAULT 'pending'")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_candidates ADD COLUMN login_count INT DEFAULT 1")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_candidates ADD COLUMN last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_project_context ADD COLUMN domain VARCHAR(255)")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_project_context ADD COLUMN background TEXT")
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("ALTER TABLE aiprep_tool_project_context ADD COLUMN skills JSON")
        except Exception:
            pass

        # Safe alters for 13 new project context fields
        new_columns = [
            "business_problem", "previous_system", "key_objectives", "users_scale",
            "agents_components", "key_workflows", "tools_integrations", "tech_stack",
            "ai_techniques", "evaluation_approach", "challenges_learnings", 
            "safety_guardrails", "future_roadmap", "company_name", "key_problems",
            "learnings"
        ]
        for col in new_columns:
            try:
                with conn.cursor() as cursor:
                    cursor.execute(f"ALTER TABLE aiprep_tool_project_context ADD COLUMN {col} TEXT")
            except Exception:
                pass

        try:
            with conn.cursor() as cursor:
                cursor.execute(f"ALTER TABLE aiprep_tool_project_context ADD COLUMN agent_usage VARCHAR(50)")
        except Exception:
            pass

        conn.commit()
        conn.close()

        print("Database tables initialized successfully.")

    except Exception as e:
        print("Error initializing tables:", e)