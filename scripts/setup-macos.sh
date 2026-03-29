#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

require_command() {
	local command_name="$1"
	local install_hint="$2"
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "Missing required command: $command_name"
		echo "$install_hint"
		exit 1
	fi
}

install_homebrew_if_needed() {
	if command -v brew >/dev/null 2>&1; then
		return
	fi

	echo "Homebrew not found. Installing Homebrew..."
	/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

	if [[ -x /opt/homebrew/bin/brew ]]; then
		eval "$(/opt/homebrew/bin/brew shellenv)"
	elif [[ -x /usr/local/bin/brew ]]; then
		eval "$(/usr/local/bin/brew shellenv)"
	fi
}

install_formula_if_missing() {
	local formula="$1"
	if brew list "$formula" >/dev/null 2>&1; then
		return
	fi
	bash -lc "brew install $formula"
}

ensure_env_file() {
	if [[ -f "$ROOT_DIR/.env" ]]; then
		return
	fi
	cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
	echo "Created $ROOT_DIR/.env from .env.example"
	echo "Update JWT secrets, Adzuna keys, and ADMIN_EMAILS before production use."
}

setup_backend() {
	echo "Setting up backend environment..."
	cd "$BACKEND_DIR"
	python3.11 -m venv .venv
	# shellcheck disable=SC1091
	source .venv/bin/activate
	pip install --upgrade pip
	pip install -r requirements.txt
	python -m spacy download en_core_web_sm
	deactivate
}

setup_frontend() {
	echo "Installing frontend dependencies..."
	cd "$FRONTEND_DIR"
	npm install
}

print_next_steps() {
	cat <<EOF

Setup complete.

Next steps:
1. Edit $ROOT_DIR/.env and fill in:
   - JWT_SECRET_KEY
   - JWT_REFRESH_SECRET_KEY
   - ADZUNA_APP_ID
   - ADZUNA_APP_KEY
   - ADMIN_EMAILS
2. Start infrastructure with Docker:
   cd "$ROOT_DIR" && docker compose up --build

If you want to run without Docker:
1. Start PostgreSQL and Redis.
2. Run backend:
   cd "$BACKEND_DIR"
   source .venv/bin/activate
   alembic upgrade head
   uvicorn app.main:app --reload
3. Run Celery worker:
   cd "$BACKEND_DIR"
   source .venv/bin/activate
   celery -A app.tasks.celery_app.celery_app worker --loglevel=info
4. Run Celery beat:
   cd "$BACKEND_DIR"
   source .venv/bin/activate
   celery -A app.tasks.celery_app.celery_app beat --loglevel=info
5. Run frontend:
   cd "$FRONTEND_DIR"
   npm run dev
EOF
}

main() {
	install_homebrew_if_needed
	require_command curl "Install curl via Xcode Command Line Tools: xcode-select --install"
	require_command git "Install Git from https://git-scm.com/downloads"

	install_formula_if_missing python@3.11
	install_formula_if_missing node
	install_formula_if_missing redis
	install_formula_if_missing postgresql@16

	require_command python3.11 "Python 3.11 is required. Install with: brew install python@3.11"
	require_command npm "Node.js and npm are required. Install with: brew install node"

	ensure_env_file
	setup_backend
	setup_frontend
	print_next_steps
}

main "$@"