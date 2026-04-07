# Contributing to JobRadar

Thank you for your interest in contributing! Here's how to get involved.

## Ways to Contribute

- **Bug reports** — open an issue describing what happened and how to reproduce it.
- **Feature requests** — open an issue explaining the use case and expected behaviour.
- **Code contributions** — pick up an open issue or propose a new one, then submit a pull request.
- **Documentation** — improve setup guides, add examples, fix typos.
- **Tests** — add missing coverage or fix flaky tests.

## Getting Started

1. **Fork** the repository and clone your fork.
2. Create a feature or fix branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Follow the [Local Development](README.md#local-development-without-docker) guide in the README to get the stack running.
4. Make your changes and make sure existing tests still pass:
   ```bash
   cd backend && pytest
   cd frontend && npm test
   ```
5. Commit with a clear message:
   ```bash
   git commit -m "fix: correct skill extraction for multi-word technologies"
   ```
6. Push your branch and open a pull request against `main`.

## Pull Request Checklist

- [ ] The change is focused — one concern per PR.
- [ ] Existing tests pass locally.
- [ ] New behaviour has test coverage where applicable.
- [ ] Commit messages are descriptive.
- [ ] The PR description explains *what* changed and *why*.

## Commit Message Convention

Use the format `type: short description`:

| Prefix | When to use |
|---|---|
| `feat:` | new feature |
| `fix:` | bug fix |
| `docs:` | documentation only |
| `test:` | adding or updating tests |
| `refactor:` | code change that neither fixes a bug nor adds a feature |
| `chore:` | tooling, dependencies, CI |

## Code Style

- **Python** — follow PEP 8; the project uses `pyproject.toml` for tooling config.
- **TypeScript/React** — follow the existing ESLint config in `frontend/eslint.config.js`.

To check your changes before submitting:

```bash
# Python linting and type checking (from repo root)
cd backend
source .venv/bin/activate
ruff check .
mypy .

# Frontend linting
cd frontend
npm run lint
```

## Reporting a Security Vulnerability

Please do **not** open a public issue for security vulnerabilities. Contact the maintainer directly through GitHub's private vulnerability reporting feature instead.

## Code of Conduct

Be respectful, constructive, and welcoming. This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.
