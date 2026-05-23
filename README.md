# Mini Application Workflow Tracker

- `backend/`: Django + Django Ninja API
- `frontend/`: React + TypeScript + Vite client using Tailwind CSS

Workflow:

`Draft -> Submitted -> Under Review -> Need More Information | Approved | Rejected`

Current capabilities:

- session-based authentication
- open signup for applicants and reviewers
- role-based application access and actions
- reviewer decision history
- application search and filtering

## Backend setup

From the `backend/` directory:

```bash
cp .env.example .env
uv sync
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`.

API docs at `http://127.0.0.1:8000/api/docs`.

## Frontend setup

From the `frontend/` directory:

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The frontend runs at `http://127.0.0.1:5173`.

Vite proxies `/api` requests to the Django backend in development, so no additional CORS setup is required.

For local development, keep:

- `frontend/.env`: `VITE_API_BASE_URL=http://127.0.0.1:8000/api`
- `backend/.env`: allow `http://localhost:5173` and `http://127.0.0.1:5173` in CORS and CSRF settings

## Authentication and roles

- Applicants can sign up, log in, create applications, and see only their own applications.
- Reviewers can sign up, log in, see all applications, and perform review actions.
- Reviewer accounts require a company name at signup.

Use the frontend signup flow to create an applicant or reviewer account before using the application screens.

## Running migrations

From `backend/`:

```bash
.venv/bin/python manage.py migrate
```

## Running tests

From `backend/`:

```bash
uv run python manage.py test
```

From `frontend/`:

```bash
pnpm build
```

The frontend build is used as the main compile/type-check verification step.

## Docker and deployment

Deployment is on a VPS using Docker.

- `backend/Dockerfile` for the Django backend
- `docker-compose.yml` for a backend-only deployment
- `.github/workflows/backend-ci.yml` for backend CI
- `.github/workflows/deploy-backend.yml` for backend CD to a VPS
- `backend/deploy.sh` for pulling the latest image, running migrations, and restarting the backend container

The Docker setup uses SQLite with a persistent Docker volume.

For local Docker use:

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

For production:

- set the real backend env values in `backend/.env` on the VPS
- set the real frontend API URL in Vercel using `VITE_API_BASE_URL`

## API endpoints

- `GET /api/auth/session`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/applications`
- `GET /api/applications`
- `GET /api/applications/{tracking_number}`
- `PATCH /api/applications/{tracking_number}`
- `POST /api/applications/{tracking_number}/submit`
- `POST /api/applications/{tracking_number}/start-review`
- `POST /api/applications/{tracking_number}/decision`

Application list responses support:

- `search`
- `status`
- `application_type`

List and detail responses include `allowed_actions`, and detail responses include reviewer decision history.

## Assumptions made

- Draft creation requires the main applicant/company/type/description fields rather than supporting partially blank drafts.
- `Need More Information` applications are resubmitted through the same submit endpoint used for drafts.
- Reviewer accounts are treated as company-side review accounts and can access all applications.
- Applicant accounts can access only the applications they own.
- Reviewer comments are stored as a chronological decision log rather than a threaded discussion system.
- SQLite is used for both local and VPS deployment, backed by a persistent Docker volume in the containerized setup.


## What I would improve with more time

- Add frontend integration tests for the main workflow transitions.
- Reviewers should only view applications to their company, not all applications.
- Add password reset and email verification flows.
- Add pagination and richer list filtering, including date ranges.
- Add reviewer assignment rules instead of a global review queue for all reviewers.
- Add automated SQLite backup and restore scripts for VPS deployments.
