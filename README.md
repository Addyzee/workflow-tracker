# Mini Application Workflow Tracker

- `backend/`: Django + Django Ninja API
- `frontend/`: React + TypeScript + Vite client

Workflow:

`Draft -> Submitted -> Under Review -> Need More Information | Approved | Rejected`

## Backend setup

From the `backend/` directory:

```bash
uv sync
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`.

API docs at `http://127.0.0.1:8000/api/docs`.

## Frontend setup

From the `frontend/` directory:

```bash
pnpm install
pnpm dev
```

The frontend runs at `http://127.0.0.1:5173`.

Vite proxies `/api` requests to the Django backend in development, so no additional CORS setup is required.

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

## API endpoints

- `POST /api/applications`
- `GET /api/applications`
- `GET /api/applications/{tracking_number}`
- `PATCH /api/applications/{tracking_number}`
- `POST /api/applications/{tracking_number}/submit`
- `POST /api/applications/{tracking_number}/start-review`
- `POST /api/applications/{tracking_number}/decision`

List and detail responses include `allowed_actions` so the frontend renders only valid actions for the current status.

## Assumptions made

- No authentication or role separation is implemented because the brief did not require it.
- Draft creation requires the main applicant/company/type/description fields rather than supporting partially blank drafts.
- `Need More Information` applications are resubmitted through the same submit endpoint used for drafts.
- `reviewer_comment` stores the latest reviewer note, not a full comment history.
- `submitted_at` is updated on each submit or resubmit.
- `reviewed_at` stores the timestamp of the latest reviewer decision.

## What I would improve with more time

- Add authentication and reviewer/applicant role separation.
- Add frontend integration tests for the main workflow transitions.
- Add reviewer comment history instead of a single latest comment field.
- Add filtering and search on the application list.
- Package the project with Docker Compose for one-command local startup.
