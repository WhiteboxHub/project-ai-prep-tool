## 2026-07-24T17:17:13Z
<USER_REQUEST>
You are teamwork_preview_worker_m1.
Your working directory is: C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\.agents\teamwork_preview_worker_m1
Project root: C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool

Task: Milestone 1 — Test Infrastructure Setup for Frontend and Backend

1. Frontend Test Infrastructure Setup (`frontend-new`):
   - Add devDependencies to `frontend-new/package.json`: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. (Execute `pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom` in `frontend-new`).
   - Configure Vitest in `frontend-new/vite.config.ts`: Add `test: { environment: 'jsdom', setupFiles: ['./client/test.setup.ts'], globals: true }` to the Vite config object.
   - Create setup file `frontend-new/client/test.setup.ts` importing `@testing-library/jest-dom` and adding polyfills/stubs for `window.matchMedia`, `ResizeObserver`, `MediaRecorder`, `navigator.mediaDevices`.
   - Update `frontend-new/package.json` script `"build": "pnpm run build:client && pnpm run build:server"` (fixing `npm run` to `pnpm run`).
   - Run build, typecheck, and test commands in `frontend-new`:
     `pnpm run typecheck`
     `pnpm run test`
     `pnpm run build`

2. Backend Test Infrastructure Setup (`backend`):
   - Install backend test dependencies: `pytest`, `pytest-asyncio`, `pytest-cov`. Update `backend/requirements.txt` to include `pytest`, `pytest-asyncio`, `pytest-cov`.
   - Create `backend/pytest.ini` with:
     ```ini
     [pytest]
     asyncio_mode = auto
     testpaths = tests
     python_files = test_*.py
     python_classes = Test*
     python_functions = test_*
     ```
   - Create `backend/tests/` directory with `__init__.py` and `conftest.py`:
     - Configure pytest fixture `client` using `httpx.AsyncClient(app=app, base_url="http://testserver")` or `TestClient(app)`.
     - Configure fixture for database setup (`init_db`).
   - Create basic infrastructure test `backend/tests/test_health.py` testing GET `/health` and GET `/`.
   - Run `python -m pytest` in `backend` directory to verify setup.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes and verification logs to `C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\.agents\teamwork_preview_worker_m1\handoff.md`.
Update `progress.md` with your status and timestamp. Send a message when finished.
</USER_REQUEST>
