# AI Candidate Preparation Platform

An AI-powered interview preparation app for resume-based project case studies,
intro practice, mock interviews, and readiness reports.

## Repository Layout

```text
project-ai-prep-tool/
  backend/        FastAPI API, database setup, AI services, templates
  frontend-new/   React + Vite frontend with a small Node production server
```

The frontend and backend are intentionally separated inside one repo. CI/CD is
currently enabled only for the backend.

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router, Vitest |
| Frontend server | Node/Express production bundle |
| Backend | FastAPI, Uvicorn, PyMySQL, DBUtils |
| AI providers | OpenAI and Google Gemini |
| Documents | PyMuPDF and python-docx |
| Deployment-ready | Dockerfiles for both frontend and backend |

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn main:app --reload --port 8000
```

Health check:

```text
http://localhost:8000/health
```

API docs:

```text
http://localhost:8000/docs
```

Required backend environment values are documented in `backend/.env.example`.
Do not commit real `.env`, `.env.yaml`, database files, logs, uploaded files, or
generated runtime artifacts.

## Frontend

This project uses `pnpm`.

```powershell
cd frontend-new
corepack enable
pnpm install
pnpm run dev
```

Default frontend dev server:

```text
http://localhost:8080
```

To point the frontend to a backend:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Useful Commands

Frontend:

```powershell
cd frontend-new
pnpm run typecheck
pnpm run test
pnpm run build
```

Backend:

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Docker:

```powershell
docker build -t ai-prep-backend ./backend
docker build --build-arg VITE_API_URL=http://127.0.0.1:8000 -t ai-prep-frontend ./frontend-new
```

## Backend CI/CD

The repository has one GitHub Actions workflow for the backend:

```text
.github/workflows/backend-ci-cd.yml
```

The workflow is path-filtered. Frontend-only changes do not run CI/CD.

Backend workflow:

```text
backend/** changed
  -> install Python dependencies
  -> compile Python files
  -> validate Docker build
  -> on main only: push image and deploy to Cloud Run
```

Pull requests into `dev` or `main` run checks and Docker build validation only.
Pushes to `main` deploy the backend to Cloud Run.

Expected branch flow:

```text
feature branch -> PR to dev
  backend changed -> backend CI runs
  frontend-only change -> no CI/CD runs

dev -> PR to main
  backend changed -> backend CI runs

merge to main
  backend changed -> backend image is pushed and deployed to Cloud Run
```

### Required GitHub Secrets

Add these secrets in GitHub repository settings:

```text
GCP_PROJECT_ID
GCP_REGION
GCP_SERVICE_ACCOUNT_KEY
ARTIFACT_REGISTRY_REPO
BACKEND_SERVICE_NAME
```

Example values:

```text
GCP_REGION=us-central1
ARTIFACT_REGISTRY_REPO=ai-prep
BACKEND_SERVICE_NAME=ai-prep-backend
```

The service account behind `GCP_SERVICE_ACCOUNT_KEY` needs permission to push to
Artifact Registry and deploy the backend Cloud Run service.

### Backend Runtime Secrets

Do not store backend runtime secrets in GitHub workflow files. Keep these in
Cloud Run environment variables or Google Secret Manager:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
ENCRYPTION_KEY
ADMIN_KEY
```

## Security Notes

Secrets must live in deployment secret managers or CI/CD variables, never in the
repository. If real credentials were ever committed, rotate them before deploying.
