# JobRadar Project Handoff

## What JobRadar Is

JobRadar is a full-stack job discovery platform.

It does four main things:

1. pulls jobs from public APIs and direct ATS feeds
2. stores and deduplicates them
3. lets users register, log in, and upload resumes
4. scores jobs against a user profile and resume

## Where Registered Users Are Stored

Registered users are stored in PostgreSQL, not in the frontend and not in the Git repository.

The main tables are:

- `users`: email, full name, hashed password, active flag, last login time
- `resumes`: uploaded resume text and parsed metadata for each user
- `jobs`: normalized job postings from all sources
- `saved_jobs`: links between users and jobs they saved
- `scraper_runs`: scraper history and status for each source

The model definitions live in:

- `backend/app/models/user.py`
- `backend/app/models/resume.py`
- `backend/app/models/job.py`
- `backend/app/models/saved_job.py`
- `backend/app/models/scraper_run.py`

## What Exactly Is Stored

### In PostgreSQL

- User identity: email, full name, hashed password
- Resume data: original filename, extracted text, parsed skills, parsed roles, education level, experience
- Job data: title, company, location, description, tags, source, salary, timestamps
- Product state: saved jobs and scraper execution history

### In Redis

Redis is used for fast temporary operational data.

- job deduplication keys
- cached match results
- Celery broker and result backend state

Redis is not the primary source of truth for registered users.

## Where The Database Lives

### Local machine without Docker

PostgreSQL data lives in your local PostgreSQL data directory, not inside the repo.

Typical Homebrew locations on macOS are:

- `/opt/homebrew/var/postgresql@16`
- `/usr/local/var/postgresql@16`

Redis data and runtime state live in your local Redis installation and memory.

### Docker setup

If you run with Docker Compose, Postgres and Redis live inside Docker-managed volumes and containers.

### Cloud deployment

If you deploy to a managed platform like Render or Railway, PostgreSQL and Redis live in provider-managed services.

That means:

- the repo stores code
- the cloud database stores user and job data
- Redis stores cache and queue state

## What You Can Show Someone In The Product

### Frontend static site

- login and registration flow
- jobs board with search and filters
- direct company feed lane
- saved jobs
- resume upload and parsed profile data
- match-oriented ranking and job detail view

### Backend

- `/docs` Swagger UI
- `/health` health check
- auth endpoints
- jobs endpoints
- resume endpoints
- scraper status and trigger endpoints

## How Registration Works

1. user submits email, full name, and password
2. backend hashes the password before storing it
3. a row is created in the `users` table
4. JWT access and refresh tokens are returned
5. frontend stores those tokens in browser storage for session use

Important:

- raw passwords are not stored
- only hashed passwords are stored in PostgreSQL

## How To Inspect Data Locally

### PostgreSQL

Open `psql` and run:

```sql
\dt
SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC;
SELECT id, user_id, original_filename, uploaded_at FROM resumes ORDER BY uploaded_at DESC;
SELECT id, company, title, source, posted_at FROM jobs ORDER BY posted_at DESC LIMIT 20;
```

### Redis

Use:

```bash
redis-cli
KEYS *
```

## Deployment Without Docker On Your Laptop

You do not need Docker installed locally to develop or deploy this project.

Local non-Docker path:

1. run PostgreSQL directly on your machine
2. run Redis directly on your machine
3. run FastAPI with Uvicorn
4. run Celery worker
5. run Celery beat
6. run the Vite frontend

The macOS setup helper already supports this path.

## Recommended Non-Docker Deployment Path

If local Docker space is a problem, use a managed platform.

Recommended stack:

1. Render or Railway for the backend service
2. managed PostgreSQL from the same platform
3. managed Redis from the same platform
4. static frontend deployment on Render Static Site, Vercel, or Netlify

### Render example architecture

- Web service: FastAPI API
- Background worker: Celery worker
- Background worker or cron: Celery beat
- PostgreSQL: managed database
- Redis: managed cache and broker
- Static site: built frontend pointing to deployed API URL

## Build And Start Commands For Non-Docker Deployments

### Backend web service

Build command:

```bash
cd backend && pip install -r requirements.txt && python -m spacy download en_core_web_sm
```

Start command:

```bash
cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Celery worker

Start command:

```bash
cd backend && celery -A app.tasks.celery_app.celery_app worker --loglevel=info
```

### Celery beat

Start command:

```bash
cd backend && celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

### Frontend

Build command:

```bash
cd frontend && npm ci && npm run build
```

Environment variable:

```bash
VITE_API_URL=https://your-api-domain
```

## Why That GitHub Actions Screenshot Failed

The screenshot shows a rerun for commit `a485da0`, which is an older commit.

That matters because:

- rerunning an old workflow reruns the old code
- it does not automatically use the latest fixes from newer commits

The CI fixes were pushed later, so the correct run to check is the newest workflow attached to the latest commit on `main`.

## What To Tell Someone In One Short Explanation

JobRadar is a resume-aware job search platform. Users register and log in through the FastAPI backend, their accounts and resume data are stored in PostgreSQL, temporary matching and queue state are stored in Redis, jobs are collected from external and direct ATS sources, and the React frontend presents ranked roles with search, save, and detail workflows.
