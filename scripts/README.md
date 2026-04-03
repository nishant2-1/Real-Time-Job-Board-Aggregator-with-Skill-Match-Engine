# Scripts and Handoff Notes

## Setup

- `./scripts/setup-macos.sh`

This script installs Homebrew if needed, then installs Python 3.11, Node.js, Redis, and PostgreSQL 16, creates the backend virtual environment, installs backend and frontend dependencies, downloads the spaCy English model, and creates `.env` from `.env.example` when missing.

## Explainer

- `./scripts/PROJECT_HANDOFF.md`

Use this file when you want to explain the project to someone else. It covers:

- what the product does
- where registered users are stored
- where jobs, resumes, and saved jobs are stored
- what Redis is used for
- what you can show in the UI and API
- how to deploy without relying on local Docker
