# Lab 12 reference stack (Express + PostgreSQL)

Two services: `app` (this Express API) and `db` (`postgres:18`). Data lives in
the named volume `capricorn_vault`, mounted at `/var/lib/postgresql` (the
Postgres 18 image keeps its data in `/var/lib/postgresql/18/docker`).

## Start

```powershell
Copy-Item .env.example .env   # then set STUDENT_ID and a throwaway POSTGRES_PASSWORD
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
```

Only the app is published, on `127.0.0.1:8082`. The app reaches the database
at `db:5432` over the Compose network.

## Check

```powershell
curl.exe -s http://localhost:8082/health
$note = @{ student_id = '6788117'; body = 'Lab12-6788117-Capri-wakes-up' } | ConvertTo-Json -Compress
curl.exe -s -X POST http://localhost:8082/notes -H "Content-Type: application/json" -d $note
curl.exe -s http://localhost:8082/notes
docker compose exec db psql -U lab12 -d lab12 -c "SELECT id, student_id, body, created_at FROM notes ORDER BY id;"
```

`/health` runs a real query, so it returns 503 if the database is down.

## Stop

```powershell
docker compose down      # keeps the volume and the data
```

`docker compose down -v` also deletes the volume. Only use it on data you don't
need.
