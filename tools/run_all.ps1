# Runs every Lab 12 evidence step in a real console window and screenshots it (via shot.ps1).
#   pwsh tools\run_all.ps1            run all steps in order
#   pwsh tools\run_all.ps1 03b 03c    run only steps whose names start with these prefixes
param([Parameter(ValueFromRemainingArguments)] [string[]]$Only = @())
$ErrorActionPreference = 'Stop'
$lab = Split-Path $PSScriptRoot
$ref = Join-Path $lab 'reference-express'
$own = Join-Path $lab 'hotel-booking-api'
$lab11 = Join-Path (Split-Path $lab) 'Lab11\express-api'

$steps = [ordered]@{}

# ---------- 01 baseline ----------
$steps['01a-versions'] = @($lab, @(
    'docker version'
    'docker compose version'
    'docker context show'
))
$steps['01b-baseline'] = @($lab11, @(
    'Get-Content Dockerfile'
    'docker run -d --name lab11-baseline -p 127.0.0.1:8080:3000 lab11-express:v2'
    'Start-Sleep -Seconds 2; docker ps --filter name=lab11-baseline'
    'curl.exe -s http://localhost:8080/health'
    'curl.exe -s http://localhost:8080/'
    'docker rm -f lab11-baseline'
))

# ---------- 02 app + db ----------
$steps['02a-compose-file'] = @($ref, @(
    'Get-Content docker-compose.yml'
))
$steps['02b-env'] = @($ref, @(
    'Get-Content .env.example'
    "(Get-Content .env) -replace 'PASSWORD=.*', 'PASSWORD=********'"
    'git status --short --ignored .'
    'docker image inspect postgres:18 --format "{{json .Config.Volumes}}"'
    'docker run --rm postgres:18 sh -c ''echo PG_MAJOR=$PG_MAJOR PGDATA=$PGDATA'''
))
$steps['02c-up'] = @($ref, @(
    'docker compose config --quiet; if ($?) { "compose config OK" }'
    'docker compose up -d --build --wait'
))
$steps['02d-ps-logs'] = @($ref, @(
    'docker compose ps'
    'docker volume ls --filter name=lab12-express'
    'docker compose logs --tail 30 app db'
))
$steps['02e-health'] = @($ref, @(
    'curl.exe -s -i http://localhost:8082/health'
))

# ---------- 03 config, network, data ----------
$steps['03a-env-network'] = @($ref, @(
    'docker compose exec app sh -c ''env | grep -E "^(PORT|DB_)" | sort | sed "s/PASSWORD=.*/PASSWORD=********/"'''
    'docker compose exec db sh -c ''env | grep ^POSTGRES_ | sort | sed "s/PASSWORD=.*/PASSWORD=********/"'''
    'docker compose exec app getent hosts db'
    'docker compose exec app node -e "for (const h of [''db'', ''localhost'']) require(''net'').connect(5432, h).on(''connect'', function () { console.log(h + '':5432 -> connected''); this.end() }).on(''error'', e => console.log(h + '':5432 -> '' + e.code))"'
))
$steps['03b-post-get'] = @($ref, @(
    '$note = @{ student_id = ''6788117''; body = ''Lab12-6788117-Capri-wakes-up'' } | ConvertTo-Json -Compress'
    'curl.exe -s -i -X POST http://localhost:8082/notes -H "Content-Type: application/json" -d $note'
    'curl.exe -s http://localhost:8082/notes'
))
$steps['03c-sql'] = @($ref, @(
    'docker compose exec db psql -U lab12 -d lab12 -c "SELECT id, student_id, body, created_at FROM notes ORDER BY id;"'
))

# ---------- 04 persistence ----------
$steps['04a-before'] = @($ref, @(
    'docker compose ps -q db'
    'docker inspect --format "{{json .Mounts}}" $(docker compose ps -q db)'
    'curl.exe -s http://localhost:8082/notes'
))
$steps['04b-restart'] = @($ref, @(
    'docker compose restart'
    'docker compose up -d --wait'
    'docker compose ps -q db'
    'curl.exe -s http://localhost:8082/notes'
    'docker compose exec db psql -U lab12 -d lab12 -c "SELECT id, student_id, body, created_at FROM notes ORDER BY id;"'
))
$steps['04c-down'] = @($ref, @(
    'docker compose down'
    'docker compose ps -a'
    'docker volume ls --filter name=lab12-express'
))
$steps['04d-up-again'] = @($ref, @(
    'docker compose up -d --wait'
    'docker compose ps -q db'
    'docker inspect --format "{{json .Mounts}}" $(docker compose ps -q db)'
    'curl.exe -s http://localhost:8082/notes'
    'docker compose exec db psql -U lab12 -d lab12 -c "SELECT id, student_id, body, created_at FROM notes ORDER BY id;"'
))

# ---------- 05 own project ----------
$steps['05a-compose-file'] = @($own, @(
    'Get-Content docker-compose.yml'
))
$steps['05b-dockerfile-env'] = @($own, @(
    'Get-Content Dockerfile'
    'Get-Content .env.example'
    "(Get-Content .env) -replace 'PASSWORD=.*', 'PASSWORD=********'"
))
$steps['05c-build-fail'] = @($own, @(
    'docker build -f ..\report\Dockerfile.attempt1.txt --target runtime -t hotel-booking-api:attempt1 .'
))
$steps['05d-diagnose'] = @($own, @(
    'docker run --rm node:24-bookworm-slim sh -c "apt-get update 2>&1 | tail -3"'
    'docker run --rm -v "$(Resolve-Path ..\tools):/t" node:24-bookworm-slim node /t/apt-ua-check.mjs'
    'docker run --rm node:24-bookworm-slim sh -c "apt-get -o Acquire::http::User-Agent=Mozilla/5.0 update 2>&1 | tail -2"'
))
$steps['05e-up'] = @($own, @(
    'docker compose config --quiet; if ($?) { "compose config OK" }'
    'docker compose up -d --build --wait'
))
$steps['05f-ps-logs'] = @($own, @(
    'docker compose ps -a'
    'docker compose logs migrate'
    'docker compose logs db | Select-String "Temporary server|init process done|ready for connections. Version"'
    'curl.exe -s http://localhost:8090/health'
))
$steps['05g-write-read'] = @($own, @(
    '$login = ''{"username":"student6788117","password":"lab12-demo-only"}'''
    'curl.exe -s -X POST http://localhost:8090/auth/register -H "Content-Type: application/json" -d $login'
    'docker compose exec db sh -c ''mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "UPDATE users SET role=''''ADMIN'''' WHERE username=''''student6788117''''; SELECT id, username, role FROM users;" 2>/dev/null'''
    '$token = (curl.exe -s -X POST http://localhost:8090/auth/login -H "Content-Type: application/json" -d $login | ConvertFrom-Json).access_token'
    '$room = @{ name = ''Lab12-6788117-Capri-engram-suite''; description = ''Project Capricorn suite, booked by student 6788117'' } | ConvertTo-Json -Compress'
    'curl.exe -s -i -X POST http://localhost:8090/rooms -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d $room'
    'curl.exe -s "http://localhost:8090/rooms?search=Capri" -H "Authorization: Bearer $token"'
))
$steps['05h-sql-before'] = @($own, @(
    'docker compose exec db sh -c ''mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, name, created_by, created_at FROM rooms;" 2>/dev/null'''
    'docker compose ps -q db'
    'docker inspect --format "{{json .Mounts}}" $(docker compose ps -q db)'
))
$steps['05i-down-up'] = @($own, @(
    'docker compose down'
    'docker volume ls --filter name=lab12-project'
    'docker compose up -d --wait'
    'docker compose ps -q db'
    'docker inspect --format "{{json .Mounts}}" $(docker compose ps -q db)'
))
$steps['05j-read-after'] = @($own, @(
    '$login = ''{"username":"student6788117","password":"lab12-demo-only"}'''
    '$token = (curl.exe -s -X POST http://localhost:8090/auth/login -H "Content-Type: application/json" -d $login | ConvertFrom-Json).access_token'
    'curl.exe -s "http://localhost:8090/rooms?search=Capri" -H "Authorization: Bearer $token"'
    'docker compose exec db sh -c ''mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, name, created_by, created_at FROM rooms;" 2>/dev/null'''
))
$steps['05k-two-stacks'] = @($lab, @(
    'docker compose ls'
    'docker volume ls --filter name=lab12'
))
$steps['05l-cleanup'] = @($lab, @(
    'docker compose --project-directory reference-express down'
    'docker compose --project-directory hotel-booking-api down'
    'docker volume ls --filter name=lab12'
))

foreach ($name in $steps.Keys) {
    if ($Only.Count -and -not ($Only | Where-Object { $name.StartsWith($_) })) { continue }
    $cwd, $cmds = $steps[$name]
    Write-Host "== $name"
    & (Join-Path $PSScriptRoot 'shot.ps1') -Name $name -Cwd $cwd -Commands $cmds
}
