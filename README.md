# JobRadar - AI-Powered Job Aggregator & Skill Match Engine

![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)

## What it does
JobRadar continuously aggregates software job listings from multiple external sources into a unified feed and scores each role against a user resume. It helps candidates prioritize the highest-fit opportunities first, while showing concrete skill gaps for targeted upskilling.

## How the skill match works
JobRadar first converts resume text and job descriptions into TF-IDF vectors so both are represented in a consistent mathematical space. It then measures cosine similarity to estimate how semantically close a role is to the resume. A keyword boost is applied when exact high-value skills overlap, which helps reward practical tool alignment beyond pure vector similarity. The final score is capped to a 0-100 range and returned with matched and missing skills for explainability.

## Architecture
```mermaid
flowchart LR
  FE[React Frontend] --> API[FastAPI]
  API --> PG[(PostgreSQL)]
  API --> RD[(Redis)]
  API --> CW[Celery Worker]
  CW --> ROK[RemoteOK]
  CW --> REM[Remotive]
  CW --> ADZ[Adzuna]
```

## Local setup
```bash
git clone https://github.com/nishant2-1/Real-Time-Job-Board-Aggregator-with-Skill-Match-Engine.git
cd Real-Time-Job-Board-Aggregator-with-Skill-Match-Engine/jobrador
cp .env.example .env
# Fill ADZUNA_APP_ID, ADZUNA_APP_KEY, and SECRET_KEY in .env
docker compose up --build
```

Open http://localhost:3000 - API docs: http://localhost:8000/docs

## Features
- Multi-source job ingestion via Celery workers (RemoteOK, Remotive, Adzuna)
- Resume parsing for PDF/DOCX with extracted skills, titles, and experience signals
- AI-assisted match scoring with TF-IDF, cosine similarity, and skill boosting
- Real-time dashboard with scraper status, top matches, and skill breakdown charts
- Saved jobs workflow with optimistic UI updates in React Query
- End-to-end containerized local stack with FastAPI, PostgreSQL, Redis, Celery, and React

## Tech stack
| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, React Query, Recharts |
| Backend API | FastAPI, Pydantic, SQLAlchemy, Alembic |
| Async/Workers | Celery, Redis |
| Data | PostgreSQL |
| Resume/ML | PyMuPDF, python-docx, scikit-learn (TF-IDF + cosine) |
| DevOps | Docker, Docker Compose, GitHub Actions |

## License
MIT

