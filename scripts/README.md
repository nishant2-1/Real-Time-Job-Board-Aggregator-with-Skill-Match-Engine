macOS setup script:

./scripts/setup-macos.sh

The script installs Homebrew if needed, then installs Python 3.11, Node.js, Redis, and PostgreSQL 16, creates the backend virtual environment, installs backend/frontend dependencies, downloads the spaCy English model, and creates .env from .env.example when missing.