<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Hotel Booking System API built with NestJS for ITCS258. It uses Prisma ORM with
a local MySQL database, bcrypt password hashing, JWT bearer tokens, Redis
caching, and NestJS Throttler. The API serves Swagger/OpenAPI documentation at
`/api-docs`.

## Local configuration

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the local MySQL `nest_auth_lab` database.
3. Replace `JWT_SECRET` with a long random value.
4. Apply the schema with `npx prisma migrate deploy`.
5. Start Redis on port 6379 (or set `REDIS_URL` in `.env` to another Redis URL).

All registrations receive the `USER` role, including existing users after the
role migration. Assign an admin through a trusted database administrator action,
for example `UPDATE users SET role = 'ADMIN' WHERE username = 'alice';` in MySQL.
Log in again after promotion: the role is included in the signed JWT at login
and tokens expire after one hour. Never accept a role in `/auth/register`.

## Docker Compose (Lab 12)

`docker-compose.yml` runs the whole stack as project `lab12-project-<STUDENT_ID>`:

- `app`: the API, published on `127.0.0.1:8090` (container port 3000).
- `migrate`: runs `prisma migrate deploy` once, then exits. `app` waits for it.
- `db`: `mysql:8.4`, data in the named volume `talia_safehouse` at `/var/lib/mysql`.
- `cache`: `redis:8-alpine` for the room cache. It has no volume because the cache can be rebuilt.

```powershell
Copy-Item .env.example .env   # set STUDENT_ID and throwaway, URL-safe MySQL passwords
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps -a          # migrate shows Exited (0), the rest healthy
curl.exe -s http://localhost:8090/health
```

To test writes, register a user, promote it with
`docker compose exec db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "UPDATE users SET role=''ADMIN'' WHERE username=''student6788117'';"'`,
log in, then `POST /rooms`. The Lab 12 demo account is `student6788117` /
`lab12-demo-only`, and it only exists in the local Compose database.

`docker compose down` keeps the `talia_safehouse` volume. `down -v` deletes it.

If `apt-get` fails with `Connection failed [IP: ... 80]` during the build, the
network is probably dropping apt's User-Agent. The Dockerfile already sets a
different one in `/etc/apt/apt.conf.d/99-user-agent`.

## API documentation (Swagger)

Start the API and open http://localhost:3000/api-docs. The raw OpenAPI JSON is
at http://localhost:3000/api-docs-json.

1. Run `POST /auth/login` with **Try it out** and copy the `access_token`.
2. Click **Authorize**, paste the token, and click **Authorize** again.
   Endpoints with a lock icon now send `Authorization: Bearer <token>`. Swagger
   UI keeps the token after a page reload.
3. Use **Try it out** on any endpoint.

Room endpoints document every status code they can return (200/201, 400, 401,
403, 404, 429) with example bodies.

The project uses `@nestjs/swagger` 11.x because version 12 requires NestJS 12.

## API endpoints

- `POST /auth/register` — create a user with a bcrypt-hashed password.
- `POST /auth/login` — receive an `access_token`.
- `GET /auth/profile` — return the verified JWT payload.
- `GET /rooms` — list rooms one page at a time. Optional query parameters:
  `page` (default 1), `limit` (1 to 100, default 10), and `search` (matches the
  name or description). The response is
  `{ data: Room[], meta: { total, page, limit, totalPages } }`.
- `GET /rooms/:id` — read one room.
- `POST /rooms` — create a room (ADMIN only).
- `PATCH /rooms/:id` or `PUT /rooms/:id` — update a room (ADMIN only).
- `DELETE /rooms/:id` — delete a room (ADMIN only). Returns `{ message, room }`.

The profile and room endpoints require `Authorization: Bearer <access_token>`.
Both roles can read rooms; USER receives 403 Forbidden on all room writes,
while missing or invalid tokens receive 401 Unauthorized.

## Caching and rate limits

`GET /rooms` and `GET /rooms/:id` use Redis with a five-minute TTL. Each URL,
including its query string, is cached separately, so a successful room create,
update, or delete clears every cached room entry. The `X-Cache` response header
is `MISS` on the first read and `HIT` on later reads. Inspect entries with
`docker exec redis redis-cli --scan --pattern '*rooms*'` (replace `redis` with
your container name if needed). Set `ROOM_CACHE_ENABLED=false` to turn room
caching off.

NestJS Throttler allows 100 requests per minute to each general endpoint and
10 requests per minute to each Room endpoint, per client IP. Excess requests
return HTTP 429. Throttler counters use Nest's in-memory storage.

The lecture's `cache-manager-redis-yet` example uses cache-manager v5. This
NestJS 11 project uses cache-manager v7, so its Redis cache uses the compatible
`@keyv/redis` adapter.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit and integration tests (src/**/*.spec.ts)
$ npm run test

# e2e tests (test/*.e2e-spec.ts)
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

The Room tests follow the testing pyramid:

- `src/rooms/rooms.service.spec.ts` (unit) — tests `RoomsService` with a mocked
  `PrismaService` and cache manager. It covers create, findAll (pagination and
  search), findOne, update, and remove, including not-found (`P2025`) and other
  database errors.
- `src/rooms/rooms.controller.integration.spec.ts` (integration) — sends HTTP
  requests to `RoomsController` with a mocked `RoomsService`. It overrides
  `JwtAuthGuard`, `RolesGuard`, and `RoomCacheInterceptor`, and keeps the
  `ValidationPipe` so it also checks 400 responses.
- `test/rooms.e2e-spec.ts` (end-to-end) — starts the full `AppModule` against the
  MySQL database in `DATABASE_URL` and replaces Redis with an in-memory cache. It
  seeds an ADMIN user, logs in for a JWT, and runs the create, read, update, and
  delete lifecycle, including 401 and 404 cases. `afterAll` deletes the user and
  its rooms.

Start MySQL and run `npx prisma migrate deploy` before `npm run test:e2e`. The
tests do not need Redis. `test/auth.e2e-spec.ts` uses an in-memory Prisma test
double to check registration, login, and the role rules on every room operation.

Run one layer with `npx jest rooms.service`, `npx jest rooms.controller.integration`,
or `npm run test:e2e -- rooms`.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
