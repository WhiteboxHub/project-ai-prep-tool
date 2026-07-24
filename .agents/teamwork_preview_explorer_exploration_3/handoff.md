# Test Infrastructure, Tooling, Guidelines, and Environment Setup Handoff Report

## 1. Observation

### Repository Structure & Package Configuration
- **Root Directory**: `C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool`
  - No root `package.json`, `pnpm-workspace.yaml`, or monorepo runner config exists in the root directory.
  - Subdirectories: `backend/` (FastAPI / Python) and `frontend-new/` (React 18 / Vite / TypeScript).
  - CI/CD Workflows (`.github/workflows/`):
    - `backend-ci.yml`: Triggers on changes to `backend/**`. Runs `python -m compileall backend` and `docker build`. Does **not** run pytest or any test suites (`backend-ci.yml:38-42`).
    - `ci-frontend.yml`: Triggers on changes to `frontend-new/**`. Runs `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` (`ci-frontend.yml:37-46`).

### Frontend (`frontend-new/`) Test Environment & Execution
- **`package.json` (`frontend-new/package.json`)**:
  - `packageManager`: `"pnpm@10.14.0+sha512..."` (Line 97).
  - `"scripts"`:
    - `"test"`: `"vitest --run"` (Line 11).
    - `"typecheck"`: `"tsc"` (Line 13).
    - `"build"`: `"npm run build:client && npm run build:server"` (Line 7 — Note: calls `npm` instead of `pnpm`).
  - `"devDependencies"`: Includes `"vitest": "^4.1.0"`.
  - **Missing Packages**: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `happy-dom`.
- **Vite Configuration (`frontend-new/vite.config.ts`)**:
  - Configures Vite server on port 8080 and Express middleware plugin.
  - Does **not** include a `test` configuration block (e.g. `environment: 'jsdom'`, `setupFiles`, or `globals`).
- **Existing Test Files**:
  - `frontend-new/client/lib/utils.spec.ts` (33 lines): Unit tests for `cn()` Tailwind utility.
  - Zero component (`.tsx`), hook (`.ts`), page, or API client test files exist in `frontend-new`.
- **Command Output (`pnpm run test` in `frontend-new`)**:
  ```text
  > vitest --run
  RUN  v4.1.1 C:/Users/Adarsh Teja/Desktop/ai_prep_tool/project-ai-prep-tool/frontend-new
  ✓ client/lib/utils.spec.ts (5 tests) 14ms
  Test Files  1 passed (1)
       Tests  5 passed (5)
    Duration  1.86s
  ```
- **Command Output (`pnpm run typecheck` in `frontend-new`)**:
  ```text
  > tsc
  (Exit code: 0)
  ```

### Backend (`backend/`) Test Environment & Execution
- **Dependencies (`backend/requirements.txt`)**:
  - Contains FastAPI, Uvicorn, SQLAlchemy, Pydantic, PyMySQL, DBUtils, httpx, etc.
  - **Missing Packages**: `pytest`, `pytest-asyncio`, `pytest-cov`, `unittest` harness configuration.
- **Existing Test Files**:
  - Searching for `test*` in `backend/` outside of `venv/` returned 0 results.
  - No `tests/` directory, `conftest.py`, `pytest.ini`, or test files exist in `backend/`.
- **Command Output (`.\venv\Scripts\python.exe -m pytest` in `backend/`)**:
  ```text
  C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\backend\venv\Scripts\python.exe: No module named pytest
  (Exit code: 1)
  ```

### Repository Testing Guidelines (`frontend-new/test.md/`)
The repository contains documentation and architectural guidelines in `frontend-new/test.md/`:
- **`tests.md`**:
  - **Good Tests**: Integration-style testing through public interfaces, testing observable behavior (`WHAT`, not `HOW`), single logical assertion per test, surviving refactoring.
  - **Bad Tests**: Implementation-detail tests (mocking internal collaborators, testing private methods, asserting call counts/order, breaking on internal refactoring).
- **`mocking.md`**:
  - Mock **only at system boundaries** (external APIs, databases, time/randomness, filesystem).
  - Do **not** mock internal classes, modules, or collaborators under application control.
  - Use **Dependency Injection** and **SDK-style interfaces** over generic fetchers.
- **`SKILL.md`**:
  - Enforces **AAA Pattern (Arrange-Act-Assert)** for test case structure.
  - Sets Quality Gates: 100% test execution, ≥80% pass rate, 0 P0 bugs, ≤5 P1 bugs, ≥80% code coverage, 90% OWASP security testing coverage.
- **`interface-design.md`**, **`deep-modules.md`**, **`refactoring.md`**:
  - Accept dependencies instead of instantiating them internally.
  - Design "deep modules" (small public interface hiding complex implementation).

---

## 2. Logic Chain

1. **Monorepo / Workspace Architecture**:
   - The repo uses a clean two-folder structure (`backend/` and `frontend-new/`).
   - Because there is no root workspace orchestrator (like pnpm workspaces, Turbo, or Nx), tests for frontend and backend must be executed separately in their respective subdirectories.

2. **Frontend Testing Status & Deficiencies**:
   - `frontend-new` has Vitest installed and `pnpm run test` executes `vitest --run`.
   - The existing test runner works for pure TypeScript helper functions (`utils.spec.ts`), but cannot support React UI component or hook testing because DOM emulation (`jsdom`/`happy-dom`) and React testing utilities (`@testing-library/react`) are not in `package.json`.
   - In `frontend-new/package.json`, line 7 defines `"build": "npm run build:client && npm run build:server"`. This calls `npm` inside a `pnpm` workspace, introducing unnecessary package manager mixing.

3. **Backend Testing Status & Deficiencies**:
   - `backend` has no test files and no `pytest` dependency installed in `requirements.txt`.
   - Running `pytest` fails with `No module named pytest`.
   - The CI workflow `backend-ci.yml` compiles code (`compileall`) and checks Docker build, but executes 0 tests.
   - Any backend automated testing requires adding `pytest`, `pytest-asyncio`, `pytest-cov`, creating a `tests/` package structure, and updating `backend-ci.yml`.

4. **Guidelines Alignment**:
   - The codebase has explicit, highly structured testing guidelines defined in `frontend-new/test.md/`.
   - Future test implementations for both frontend and backend must follow these rules: AAA pattern, public interface testing (no internal mocking), boundary mocking via DI, and 80%+ code coverage.

---

## 3. Caveats

- **Network Mode**: Investigation operated under `CODE_ONLY` network mode, so package installation commands (`pnpm add` or `pip install`) were not executed against external npm/PyPI registries during exploration.
- **Root Workspace Decisions**: The absence of root package management is deliberate in the current layout, but adding root task runner scripts (or root `package.json` with workspace scripts) could streamline repository-wide test execution.

---

## 4. Conclusion

1. **Frontend Test Suite**:
   - **Working Command**: `cd frontend-new && pnpm run test`
   - **Current State**: Passes 5/5 tests in `utils.spec.ts`.
   - **Required Upgrades**: Add `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event` to `devDependencies`. Add `test: { environment: 'jsdom' }` to `vite.config.ts`. Fix `"build"` script in `package.json` to use `pnpm run` instead of `npm run`.

2. **Backend Test Suite**:
   - **Working Command**: None currently available.
   - **Current State**: Non-existent (0 test files, `pytest` missing).
   - **Required Upgrades**: Add `pytest`, `pytest-asyncio`, and `pytest-cov` to `backend/requirements.txt`. Create `backend/tests/` directory with `conftest.py` and initial FastAPI endpoint / service unit tests. Add `pytest` test step to `.github/workflows/backend-ci.yml`.

3. **Guidelines & Standards**:
   - All tests must adhere to guidelines documented in `frontend-new/test.md/`: AAA pattern, public interface behavior verification, system-boundary mocking only via DI, and 80%+ coverage target.

---

## 5. Verification Method

### How to Verify Frontend Test Infrastructure:
1. Navigate to `frontend-new`:
   ```powershell
   cd frontend-new
   pnpm run test
   ```
   *Expected Result*: Vitest runs and passes 5 tests in `client/lib/utils.spec.ts`.
2. Run Typecheck:
   ```powershell
   pnpm run typecheck
   ```
   *Expected Result*: `tsc` completes with zero errors.

### How to Verify Backend Test Infrastructure:
1. Check pytest module presence:
   ```powershell
   cd backend
   .\venv\Scripts\python.exe -m pytest
   ```
   *Current Result (Invalidation condition)*: `No module named pytest` error confirms pytest must be installed and configured.

### Documents to Inspect:
- `frontend-new/package.json` (lines 7, 11, 23-96)
- `frontend-new/vite.config.ts`
- `frontend-new/test.md/tests.md`
- `frontend-new/test.md/mocking.md`
- `frontend-new/test.md/SKILL.md`
- `backend/requirements.txt`
- `.github/workflows/backend-ci.yml`
