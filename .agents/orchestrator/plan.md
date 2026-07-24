# Master Orchestration Plan: AI Prep Tool Comprehensive Testing

## 1. Mission & Objectives
Implement comprehensive integration-style test suites for both frontend (`frontend-new`) and backend (`backend`) of the AI Prep Tool application, strictly adhering to established project guidelines in `frontend-new/test.md/`:
- **AAA Pattern**: Every test structured as Arrange-Act-Assert.
- **Public API & Observable Behavior**: Test observable UI outcomes and HTTP endpoint responses, NOT internal component props/state or private methods.
- **Zero Internal Mocking**: No mocking of internal collaborators or class functions under application control. Mock only system boundaries (external network endpoints, database, time).
- **Automated Execution & High Pass Rate**: 100% test execution passing without errors locally and in CI.

## 2. Milestone Decomposition

### Milestone 1: Test Infrastructure Setup
- **Frontend Infrastructure**:
  - Add test dependencies (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`).
  - Configure `frontend-new/vite.config.ts` with `test: { environment: 'jsdom', setupFiles: ['./client/test.setup.ts'], globals: true }`.
  - Create `frontend-new/client/test.setup.ts` with DOM matchers and browser mocks (`matchMedia`, `ResizeObserver`, `MediaRecorder`).
  - Fix `"build"` script in `package.json` to use `pnpm run` instead of `npm run`.
- **Backend Infrastructure**:
  - Install `pytest`, `pytest-asyncio`, `pytest-cov` in python environment and update `backend/requirements.txt`.
  - Create `backend/pytest.ini` (`asyncio_mode = auto`, `testpaths = tests`).
  - Create `backend/tests/conftest.py` with FastAPI `TestClient` / `httpx.AsyncClient` fixture and SQLite/MySQL test DB fixtures.

### Milestone 2: Frontend Integration Test Suite
- Write integration tests in `frontend-new/client/__tests__/` verifying UI flows and observable DOM state:
  1. **Authentication & Route Guard (`auth.test.tsx`)**: Verify Login form rendering, credentials submission, token saving, `<RequireAuth>` redirection.
  2. **Dashboard & Navigation (`dashboard.test.tsx`)**: Verify sidebar navigation, user welcome header, progress widgets, and continue cards.
  3. **Self-Intro Practice Room (`intro_practice.test.tsx`)**: Verify template generation, video/text intro recording UI state, submit action, and evaluation result display.
  4. **Mock Interview Room (`interview.test.tsx`)**: Verify stage selection, question rendering, live answer submission, feedback display, and completion transition.
  5. **Project Explanation & Case Study (`project.test.tsx`)**: Verify project context form input, atomic save/UPSERT, and generated case study rendering.
  6. **Admin Analytics & Setup (`analytics.test.tsx`)**: Verify setup summary, candidate metrics table, and API key management.

### Milestone 3: Backend Integration Test Suite
- Write black-box HTTP API integration tests in `backend/tests/`:
  1. **Core & Setup Routers (`test_setup.py`)**: `/health`, `/`, `/api/setup/init`, `/api/setup/validate`, `/api/setup/summary`, `/api/setup/extraction-status`.
  2. **Candidate & Authentication Routers (`test_candidate.py`)**: `/api/candidate/me`, `/api/candidate/setup-status`, `/api/candidate/resume` (CRUD), `/api/candidate/api-keys`.
  3. **Intro Routers (`test_intro.py`)**: `/api/intro/dynamic-template`, `/api/intro/evaluate-text`, `/api/intro/history`, `/api/intro/history/{attempt_id}`.
  4. **Project & Resume Routers (`test_project.py`, `test_resume.py`)**: `/api/project/`, `/api/project/history`, `/api/resume/latest-project`, `/api/context/{user_id}`.
  5. **Interview & Report Routers (`test_interview.py`, `test_report.py`)**: `/api/interview/stage-questions`, `/api/interview/evaluate-live`, `/api/interview/complete`, `/api/report/`.
  6. **Case Study, YouTube & Analytics Routers (`test_case_study.py`, `test_analytics.py`)**: `/api/case-study/generate-typed`, `/api/case-study/history`, `/api/youtube/status`, `/api/analytics/ai-prep-report`, `/api/analytics/summary`.

### Milestone 4: Verification, Hardening & Audit
- Execute both test suites locally (`pnpm run test` in frontend, `python -m pytest` in backend).
- Deploy **Challenger** subagent to run stress/edge-case tests and check for implementation leakage.
- Deploy **Forensic Auditor** (`teamwork_preview_auditor`) to verify zero internal mocking, genuine implementation, and 100% compliance with guidelines.

## 3. Worker & Sub-Orchestrator Execution Topology
- **Sub-Orchestrators / Workers**:
  - `worker_m1`: Infrastructure setup (Frontend vitest+jsdom, Backend pytest+httpx).
  - `worker_m2`: Frontend integration test suite implementation.
  - `worker_m3`: Backend integration test suite implementation.
- **Reviewers**:
  - `reviewer_1`, `reviewer_2`: Independent code and guideline compliance verification.
- **Challengers & Auditor**:
  - `challenger_1`, `challenger_2`: Empirical correctness & edge-case testing.
  - `auditor_1`: Forensic integrity verification (hard binary veto).
