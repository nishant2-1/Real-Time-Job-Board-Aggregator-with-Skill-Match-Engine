# JobRadar - Real-Time Job Aggregator with Resume Skill Match Intelligence

![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/nishant2-1/Real-Time-Job-Board-Aggregator-with-Skill-Match-Engine)

## Overview

JobRadar is a full-stack job discovery platform that automates job search and ranking.

Instead of manually checking multiple sites every day, JobRadar:

- Aggregates jobs from RemoteOK, Remotive, Adzuna, and direct ATS feeds.
- Removes duplicates with Redis fingerprinting.
- Parses uploaded resumes in PDF or DOCX format.
- Computes a skill-match score for each job using NLP.
- Presents ranked opportunities in a responsive React dashboard.

In one line, JobRadar acts like a personal job search engine that continuously finds, deduplicates, and ranks opportunities by your profile fit.

## Core System Components

### 1) Scraper Engine (Background Ingestion)

- Scheduled with Celery Beat every 30 minutes.
- Fetches jobs from external providers using HTTP clients.
- Normalizes heterogeneous payloads into a common schema.
- Stores job fingerprints in Redis to avoid duplicates.
- Persists clean job records in PostgreSQL.

Interview summary:
Built an async scraping pipeline with Celery scheduling and Redis hash-based deduplication across multiple external job sources.

### 2) Resume Parser (Unstructured to Structured Data)

- Accepts PDF and DOCX uploads.
- Extracts text with PyMuPDF and python-docx.
- Uses spaCy plus regex heuristics to identify skills, role titles, education indicators, and experience cues.

Interview summary:
Converted unstructured resume documents into structured candidate features using NLP and rule-based extraction.

### 3) Skill-Match Engine (Ranking Intelligence)

- Vectorizes resume text and job descriptions with TF-IDF.
- Computes cosine similarity between vectors.
- Applies keyword overlap boosts for explicit skill matches.
- Returns normalized scores in the 0-100 range.
- Caches score lookups in Redis for faster repeat responses.

Interview summary:
Implemented a TF-IDF plus cosine similarity matcher with deterministic skill boosting and Redis-backed result caching.

### 4) FastAPI Backend (Platform Control Plane)

- JWT-based registration and login.
- Resume upload and profile endpoints.
- Job listing endpoints with filter and sort controls.
- Scraper trigger and status endpoints.
- Rate limiting, request ID tracing, and structured logging.
- OpenAPI docs automatically available at `/docs`.

Interview summary:
Developed a production-style FastAPI service with authentication, observability, and guarded API traffic.

### 5) React Frontend (User Experience Layer)

- React 18, TypeScript, Tailwind CSS.
- Dashboard for activity and match analytics.
- Jobs view with filters, direct-feed lanes, and save actions.
- Resume upload and editable parsed metadata.
- React Query data caching and loading or error states.

Interview summary:
Built a type-safe React application with query caching, reusable hooks, and responsive workflows for job discovery.

## System Architecture

```mermaid
flowchart LR
  U[User Browser] --> FE[React Frontend]
  FE --> API[FastAPI API Layer]

  API --> PG[(PostgreSQL)]
  API --> RD[(Redis)]

  CB[Celery Beat Scheduler] --> CW[Celery Worker]
  CW --> ROK[RemoteOK API]
  CW --> REM[Remotive API]
  CW --> ADZ[Adzuna API]
  CW --> GHS[Greenhouse Boards]
  CW --> LVR[Lever Postings]

  CW --> PG
  CW --> RD

  API --> RS[Resume Parser Service]
  API --> MM[Match Engine Service]
  RS --> API
  MM --> API
```

## System Design Notes

### Data Flow

1. Celery Beat triggers scheduled scraping tasks.
2. Workers fetch and normalize external jobs.
3. Redis fingerprint checks prevent duplicate inserts.
4. Unique jobs are written to PostgreSQL.
5. Users upload resumes through the frontend.
6. The backend parses resumes and stores structured profile data.
7. The match engine computes scores between resumes and jobs.
8. Ranked jobs are returned via API and rendered by the frontend.

### Scalability and Reliability Decisions

- Asynchronous background jobs isolate scraping load from API latency.
- Redis provides low-latency deduplication and score caching.
- PostgreSQL stores normalized, queryable job and user entities.
- Containerized services simplify local parity and deployment workflows.
- API rate limits and structured logs improve operational safety and debugging.

### Security and Observability

- JWT access and refresh token model.
- Request-level tracing with request IDs.
- Structured logging for troubleshooting.
- Input validation with Pydantic schemas.

## Tech Stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Tailwind CSS, React Query | Type-safe UI with strong state and data handling |
| Backend API | FastAPI, Pydantic, SQLAlchemy, Alembic | High-performance API with validation and schema migrations |
| Background Tasks | Celery, Redis | Scheduled and asynchronous processing |
| Database | PostgreSQL | Relational consistency and robust querying |
| NLP and Matching | spaCy, scikit-learn, PyMuPDF, python-docx | Resume parsing and vector-based relevance scoring |
| DevOps | Docker, Docker Compose, GitHub Actions | Repeatable environments and CI pipelines |

## Quick Start (Docker)

```bash
git clone https://github.com/nishant2-1/Real-Time-Job-Board-Aggregator-with-Skill-Match-Engine.git
cd Real-Time-Job-Board-Aggregator-with-Skill-Match-Engine/jobrador
cp .env.example .env
docker compose up --build
```

Access points:

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- API docs: <http://localhost:8000/docs>

## What You Need To Run This Project

### Required Services

- Docker Desktop if you want the easiest full-stack startup path.
- Or, if running without Docker:
  - PostgreSQL
  - Redis
  - Python 3.11+
  - Node.js 18+

### Required Configuration

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - Needed so FastAPI, Alembic, and SQLAlchemy can connect to the database.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`
  - Needed for Celery, cache storage, and job deduplication.
- `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`
  - Needed for access and refresh token signing.
- `VITE_API_URL`
  - Needed so the frontend knows where the backend API is running.

### Optional Configuration

- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
  - Optional but recommended.
  - Without these, scraping still works from RemoteOK and Remotive.
  - Get them from [Adzuna Developer](https://developer.adzuna.com/).
- `GREENHOUSE_BOARDS`, `LEVER_COMPANIES`
  - Optional direct ATS board identifiers.
  - Use comma-separated company or board tokens.
- `ADMIN_EMAILS`
  - Optional. Used for admin-only scraper actions.
- `DOCKER_HUB_USERNAME`
  - Only needed if you use image publishing in CI.

### How To Create the Missing Values

JWT secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Adzuna credentials:

- Create an account on Adzuna Developer.
- Create an application.
- Copy the generated `app_id` and `app_key` into `.env`.

### Where To Put Them

1. Copy `.env.example` to `.env`.
2. Fill in the values for your environment.
3. If you run locally without Docker, set:
   - `POSTGRES_HOST=localhost`
   - `REDIS_HOST=localhost`
   - `CELERY_BROKER_URL=redis://localhost:6379/0`
   - `CELERY_RESULT_BACKEND=redis://localhost:6379/1`
4. If you run with Docker Compose, keep:
   - `POSTGRES_HOST=postgres`
   - `REDIS_HOST=redis`
   - `CELERY_BROKER_URL=redis://redis:6379/0`
   - `CELERY_RESULT_BACKEND=redis://redis:6379/1`

### Minimum Working Setup

If you only want the app running end-to-end for development, the minimum is:

- PostgreSQL running.
- Redis running.
- JWT secrets set.
- `VITE_API_URL=http://localhost:8000`.

Adzuna keys are not mandatory for the application to start.

## Local Development (Without Docker)

Prerequisites:

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Where Data Is Stored

- Registered users are stored in PostgreSQL in the `users` table.
- Uploaded resume text and parsed metadata are stored in PostgreSQL in the `resumes` table.
- Normalized job postings are stored in PostgreSQL in the `jobs` table.
- Saved job relationships are stored in PostgreSQL in the `saved_jobs` table.
- Scraper execution history is stored in PostgreSQL in the `scraper_runs` table.
- Redis stores cache, deduplication keys, and Celery queue state.

Passwords are not stored in plain text. The backend stores only hashed passwords.

## Deploy Without Docker

You do not need Docker on your own machine to deploy JobRadar.

Recommended alternative:

1. Deploy the FastAPI backend to Render or Railway.
2. Provision managed PostgreSQL and Redis on that platform.
3. Run Celery worker and Celery beat as separate background services.
4. Deploy the frontend as a static site with `VITE_API_URL` pointing at the backend.

Backend build command:

```bash
cd backend && pip install -r requirements.txt && python -m spacy download en_core_web_sm
```

Backend start command:

```bash
cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Celery worker command:

```bash
cd backend && celery -A app.tasks.celery_app.celery_app worker --loglevel=info
```

Celery beat command:

```bash
cd backend && celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

Frontend build command:

```bash
cd frontend && npm ci && npm run build
```

For a fuller handoff explanation, see `scripts/PROJECT_HANDOFF.md`.

For a concrete managed-platform setup, see `RENDER_DEPLOYMENT.md`.

For one-click Render setup from GitHub, use the Deploy to Render button at the top of this README. The repo now includes `render.yaml` at the root for that flow.
