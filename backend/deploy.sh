#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
SERVICE_NAME="${SERVICE_NAME:-workflow-tracker-backend}"
CONTAINER_NAME="${CONTAINER_NAME:-workflow-tracker-backend}"
RUN_BACKEND_MIGRATIONS="${RUN_BACKEND_MIGRATIONS:-1}"
COMPOSE_PROFILE="${COMPOSE_PROFILE:-}"

compose_cmd=(docker compose -f "$COMPOSE_FILE")
if [[ -n "$COMPOSE_PROFILE" ]]; then
  compose_cmd+=(--profile "$COMPOSE_PROFILE")
fi

cd "$REPO_ROOT"

# Validate compose & env interpolation
"${compose_cmd[@]}" config >/dev/null

# Pull latest image for app only
"${compose_cmd[@]}" pull "$SERVICE_NAME"

if [[ "$RUN_BACKEND_MIGRATIONS" == "1" ]]; then
  echo "Running database migrations for $SERVICE_NAME..."
  "${compose_cmd[@]}" run --rm "$SERVICE_NAME" \
    python manage.py migrate --noinput
fi

"${compose_cmd[@]}" up -d --no-deps --remove-orphans "$SERVICE_NAME"

# Wait for healthcheck to pass
echo "Waiting for $CONTAINER_NAME health..."
for i in {1..30}; do
  status="$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    echo "$CONTAINER_NAME is healthy"
    exit 0
  fi
  sleep 2
done

echo "WARNING: $CONTAINER_NAME did not become healthy in time"
docker logs --tail=200 "$CONTAINER_NAME" || true
exit 1
