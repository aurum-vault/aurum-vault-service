# Aurum Vault Service — Backend

Fastify + TypeScript REST API for the Aurum Vault platform. Uses PostgreSQL (via Drizzle ORM) and Keycloak for authentication.

**Ports**

| Service | Port |
|---|---|
| API | 3001 |
| PostgreSQL | 5432 |
| Keycloak | 8080 |

## Prerequisites

- Node.js 22+
- PostgreSQL instance (local install or via Docker)
- Keycloak instance (local install or via Docker)

## Local Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

`.env` defaults (matches the Docker Compose services):

```env
DATABASE_URL=postgresql://aurum:aurum_secret@localhost:5432/aurum_vault
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=aurum-vault
KEYCLOAK_CLIENT_ID=aurum-vault-api
KEYCLOAK_CLIENT_SECRET=aurum-api-secret
PORT=3001
NODE_ENV=development
```

**3. Start dependencies (Postgres + Keycloak)**

If you don't have them running locally, spin them up via Docker Compose before running the API:

```bash
docker compose up postgres keycloak -d
```

Wait for Keycloak to finish initialising (first boot takes ~30s):

```bash
docker compose logs -f keycloak
# ready when: "Listening on: http://0.0.0.0:8080"
```

**4. Run database migrations**

```bash
npm run db:migrate
```

**5. Start the dev server**

```bash
npm run dev
```

API is available at [http://localhost:3001](http://localhost:3001). Health check: `GET /health`.

## Docker (OrbStack)

The `docker-compose.yml` starts the full stack: Postgres, Keycloak, and the API.

```bash
# Build and start all services
docker compose up --build

# Background
docker compose up --build -d

# Tail logs
docker compose logs -f

# Specific service
docker compose logs -f api

# Tear down (keeps the postgres volume)
docker compose down

# Tear down and delete data
docker compose down -v
```

### Service startup order

Compose waits for Postgres to be healthy before starting Keycloak and the API. Keycloak imports the realm from `keycloak/realm-export.json` on first boot.

### OrbStack tips

- Ports are exposed directly to the host — connect to `localhost:5432`, `localhost:8080`, `localhost:3001` as normal.
- Inspect containers: `orb` CLI or OrbStack menu bar app.
- Postgres data persists in the `postgres_data` named volume between restarts.

### Keycloak admin

URL: [http://localhost:8080](http://localhost:8080)  
Username: `admin`  
Password: `admin`

## Database Scripts

| Command | Description |
|---|---|
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev only, no migration file) |
| `npm run db:studio` | Open Drizzle Studio in the browser |

## App Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled output |
