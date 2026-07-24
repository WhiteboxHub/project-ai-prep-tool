# Project: AI Prep Tool Integration Test Suite

## Architecture
- **Frontend**: React 18 / Vite / TypeScript single-page application (`frontend-new/`). Public interface: UI components, pages, user interactions, and API integration.
- **Backend**: FastAPI / Uvicorn API service (`backend/`). Public interface: 46 HTTP REST endpoints across 11 APIRouters (`/api/*`).
- **Shared Standards**: Integration-style testing, AAA (Arrange-Act-Assert) pattern, testing observable public behavior, zero internal implementation mocking, boundary mocking only (network/DB).

## Code Layout
- **Frontend Source**: `frontend-new/client/`
- **Frontend Setup & Config**: `frontend-new/vite.config.ts`, `frontend-new/client/test.setup.ts`
- **Frontend Tests**: `frontend-new/client/__tests__/` or `*.test.tsx`
- **Backend Source**: `backend/`
- **Backend Setup & Config**: `backend/pytest.ini`, `backend/tests/conftest.py`
- **Backend Tests**: `backend/tests/test_*.py`
- **Test Guidelines**: `frontend-new/test.md/tests.md`, `mocking.md`, `SKILL.md`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Infrastructure Setup | Frontend (vitest+jsdom+testing-library) & Backend (pytest+httpx+conftest) setup | none | DONE |
| 2 | Frontend Integration Test Suite | Integration tests for Auth, Dashboard, Intro, Interview, Resume, Analytics | M1 | DONE |
| 3 | Backend Integration Test Suite | Black-box HTTP tests for 46 API endpoints across 11 routers | M1 | DONE |
| 4 | Verification & Audit Hardening | Execution, coverage verification, Challenger verification, Forensic Audit | M2, M3 | DONE |

## Interface Contracts
### Frontend Test Runner ↔ Vitest
- Config: `frontend-new/vite.config.ts` (`test.environment = 'jsdom'`)
- Setup: `frontend-new/client/test.setup.ts`
- Runner command: `pnpm run test` (in `frontend-new`)

### Backend Test Runner ↔ Pytest
- Config: `backend/pytest.ini` (`asyncio_mode = auto`)
- Setup: `backend/tests/conftest.py` (FastAPI `TestClient` / `httpx.AsyncClient` fixture)
- Runner command: `python -m pytest` (in `backend`)
