# Lab 12 — Docker Compose and Persistent Data

**Week 13 · CLO2**

Website: https://pisit-devop.com/itcs258/Lab12/

Use the downloadable Compose starters with your working Lab 11 backend.

## Objective / วัตถุประสงค์

Run your backend and its database with Docker Compose. Configure the connection
through environment variables and prove that a named volume preserves data after
the database container is removed and recreated.

รันแบ็กเอนด์และฐานข้อมูลร่วมกันด้วย Docker Compose กำหนดค่าการเชื่อมต่อด้วย
environment variables และพิสูจน์ว่า named volume เก็บข้อมูลไว้ได้หลังลบและสร้าง
คอนเทนเนอร์ฐานข้อมูลใหม่

Complete **all parts 01–04 and your own project (05)**. These are Lab 12's new
Compose exercises, not a requirement to repeat all three Lab 11 framework demos.

ทำ **01–04 และโปรเจกต์ของตนเอง (05) ให้ครบ** หมายเลขเหล่านี้เป็นงาน Compose
ของ Lab 12 โดยใช้ตัวอย่างร่วมหนึ่งชุดก่อนนำไปใช้กับโปรเจกต์ของตนเอง

## 01 · Continue from Lab 11 / ต่อยอดจาก Lab 11

- Confirm Docker's engine and the Compose CLI work. Identify the Dockerfile,
  app startup command, container port and health route from your Lab 11 work.
- Record a successful baseline request before adding the database dependency.
- Explain which previous `docker run` settings will become Compose settings.

ตรวจสอบ Engine และ Compose CLI ระบุ Dockerfile คำสั่งเริ่มแอป พอร์ตภายใน
และ health route จาก Lab 11 บันทึกผลสำเร็จก่อนเพิ่มฐานข้อมูล และอธิบายการย้าย
ค่าจาก `docker run` ไปยัง Compose

```text
docker version
docker compose version
```

Evidence: your own terminal output, baseline response and short mapping explanation.

## 02 · Run app + database / รันแอปและฐานข้อมูล

- Complete `docker-compose.yml` with exactly two core services: `app` and `db`.
- Use the app's existing Dockerfile pattern and the reference PostgreSQL image.
- Attach a named volume to the DB using the correct path for its image major.
- Publish only the app to the laptop for the core exercise. Use port 8082 for the
  reference app so Lab 11's 8080/8081 examples can remain separate.
- Add database readiness and wait for the stack to become healthy.

สร้าง Compose ที่มีสองบริการ `app` และ `db` ใช้ Dockerfile เดิมเป็นแนวทาง
เพิ่ม named volume ให้ฐานข้อมูล เปิดพอร์ตแอปบนเครื่อง และตรวจความพร้อมก่อนใช้งาน

Copy `.env.example` to `.env` before starting. Set your student ID and disposable
local credentials. PowerShell: `Copy-Item .env.example .env`; macOS/Linux:
`cp .env.example .env`. Keep this project name/student ID unchanged throughout
the persistence experiment.

```text
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
docker compose logs --tail 30 app db
```

The reference `GET http://localhost:8082/health` should report successful database
connectivity. Use `curl.exe` on Windows or `curl` on macOS/Linux. A static
process-only health response does not prove the DB connection.

Evidence: Compose file, named volume definition, healthy services, logs and API response.

## 03 · Connect, configure and create data / เชื่อมต่อ ตั้งค่า และเพิ่มข้อมูล

- Track `.env.example`, not the real `.env`. Explain both Compose interpolation
  and the explicit variables delivered to the app and DB containers.
- The reference app connects to `db:5432`; the browser connects to
  `localhost:8082`. Explain why app-side `localhost` would be the wrong DB host.
- Create your own record through `POST /notes`; include your student ID and a
  marker chosen by you, e.g. `Lab12-6688123-my-first-note`.
- Read it through `GET /notes`. Record the exact DB-generated ID, marker and
  `created_at`. Do not use an automatically seeded row as your persistence proof.

อธิบาย `.env` กับค่าที่ส่งเข้าคอนเทนเนอร์ ใช้ชื่อบริการ `db` เชื่อมฐานข้อมูล
เพิ่มข้อมูลผ่าน API ด้วยรหัสนักศึกษาและข้อความเฉพาะของตนเอง แล้วบันทึก ID
ข้อความและเวลาที่สร้างจากผลลัพธ์จริง ห้ามใช้ข้อมูลตั้งต้นเป็นหลักฐานเพียงอย่างเดียว

Windows PowerShell example:

```powershell
$note = @{ student_id = '6688123'; body = 'Lab12-6688123-my-first-note' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8082/notes' -ContentType 'application/json' -Body $note
Invoke-RestMethod -Uri 'http://localhost:8082/notes'
```

macOS/Linux example:

```bash
curl -X POST http://localhost:8082/notes -H 'Content-Type: application/json' -d '{"student_id":"6688123","body":"Lab12-6688123-my-first-note"}'
curl http://localhost:8082/notes
```

Replace the example ID and marker with your own. Independently check the DB:

```text
docker compose exec db psql -U lab12 -d lab12 -c "SELECT id, student_id, body, created_at FROM notes ORDER BY id;"
```

If you changed the DB user/database, use those values in the SQL command. Capture
only sanitized configuration and relevant output; full resolved Compose settings
may display credentials.

Evidence: your POST/GET results, matching SQL row and connection-path explanation.

### Extra guideline: Postman or an equivalent client / คู่มือเสริมสำหรับทดสอบ API

You may use Postman, PowerShell, curl, or FastAPI's `/docs` to perform these same
API requests. This is a choice of testing tool, not an additional graded task.
Download the [API testing kit](api-testing.zip) or read the
[step-by-step bilingual guide](api-testing/API-TESTING.md).

In Postman, import the collection and local environment, select the environment,
set `base_url` (Express `http://localhost:8082`, FastAPI `:8083`, NestJS `:8084`),
set `framework` to `express`, `fastapi` or `nestjs` accordingly,
and replace `student_id` / `note_body` with your own values. Send health, POST once,
then GET. Check HTTP status, JSON content and Test Results. After each persistence
test in part 04, send **only GET** to compare the original record. Keep SQL and
container/volume evidence alongside your API-client screenshots.

เลือกใช้ Postman, PowerShell, curl หรือ `/docs` ของ FastAPI เพื่อทดสอบคำขอเดิมได้
เป็นทางเลือกเครื่องมือ ไม่ใช่งานเพิ่ม หากใช้ Postman ให้ import collection และ environment
เลือก environment แล้วแก้ `base_url`, `framework`, `student_id`, `note_body` ให้ตรงกับตัวเอง
ส่ง health จากนั้น POST ครั้งเดียว แล้ว GET ตรวจ status, JSON และ Test Results
หลังทดสอบ persistence ในส่วน 04 ให้ส่ง **เฉพาะ GET** เพื่อเทียบแถวเดิม
เก็บภาพ SQL และ container/volume คู่กับภาพ API client ด้วย

## 04 · Prove persistence / พิสูจน์การเก็บข้อมูลถาวร

Record the DB container ID and volume mount before testing:

```text
docker compose ps -q db
docker inspect --format "{{json .Mounts}}" $(docker compose ps -q db)
```

First restart and read your row again:

```text
docker compose restart
docker compose up -d --wait
```

Then remove and recreate the containers, retaining their named volume:

```text
docker compose down
docker compose up -d --wait
docker compose ps -q db
docker inspect --format "{{json .Mounts}}" $(docker compose ps -q db)
```

Query the API and SQL again. Show **a different DB container ID but the same
record ID, marker and creation time**. Use the same folder, Compose project name
and volume identity. Do not reinsert the row between the before/after checks.
Compare timestamps as the same instant: API JSON and SQL tools can display them
in different equivalent formats. The before/after mount inspection must identify
the same named volume.

ทดสอบทั้ง restart และลบ/สร้างคอนเทนเนอร์ใหม่โดยคง named volume ไว้ แสดงว่า
ID ของคอนเทนเนอร์เปลี่ยน แต่ ID ข้อความ และเวลาสร้างของข้อมูลเดิมยังคงอยู่
ห้ามเพิ่มข้อมูลแถวเดิมใหม่ระหว่างการตรวจ และอย่าเปลี่ยนชื่อ Compose project

| Stage / ช่วงทดสอบ | DB container ID | Volume name | Record ID | Body + created_at |
| --- | --- | --- | --- | --- |
| Before / ก่อนทดสอบ | | | | |
| After restart / หลัง restart | | | | |
| After down/up / หลังสร้างใหม่ | | | | |

Explain why the container can be replaced without losing this row, and why a
named volume does not replace a backup. Required cleanup is `docker compose down`
without `-v`; retain the data until your evidence is complete. A destructive
`down -v` demonstration belongs only on an explicitly disposable practice dataset.

อธิบายว่าทำไมลบคอนเทนเนอร์แล้วข้อมูลยังอยู่ และทำไม volume ไม่ใช่ backup
การหยุดงานปกติใช้ `docker compose down` โดยไม่ใส่ `-v`

## 05 · Your own project / โปรเจกต์ของตนเอง

- Extend the backend already containerized in Lab 11 with its DB service.
- Give this stack a distinct stable Compose name, e.g. `lab12-project-6688123`,
  separate from the reference `lab12-express-6688123`. Do not accidentally reuse the
  reference containers and DB volume just because you copied its Compose file.
- Keep its existing database engine and ORM where practical. Adapt DB hostname,
  credentials, migration/startup steps and volume path to that project.
- Use one real write/read route to create a student-specific record.
- Repeat the down/up persistence proof and show the same record after recreation.
- Include a problem/diagnosis/fix, or a check that prevented a problem.

นำโปรเจกต์จาก Lab 11 มาเพิ่มบริการฐานข้อมูล ปรับชื่อโฮสต์ ค่าตั้งค่า และขั้นตอน
เริ่มระบบให้เหมาะสม ทดสอบเพิ่ม/อ่านข้อมูลผ่าน route จริง แล้วพิสูจน์ persistence
หลังสร้างคอนเทนเนอร์ใหม่ พร้อมอธิบายปัญหาและวิธีแก้หรือการตรวจป้องกันปัญหา

## Submission / การส่งงาน

Track `docker-compose.yml`, `.env.example`, relevant Dockerfile/source/schema
changes and startup/verification instructions in your project repository.

Prepare one report with five corresponding sections. Use readable screenshots
of actual commands and results from **your own screen**, with short captions.
Export **`student_ID_lab12.PDF`**, replacing `student_ID` with your actual ID,
and upload it to the **Lab 12 assignment on MyCourse**. Include the repository
URL and relevant configuration/code in the report. Follow the deadline shown in MyCourse.

เก็บไฟล์ Compose, `.env.example` และไฟล์ที่ปรับใน repository จัดทำรายงานห้าส่วน
พร้อมภาพคำสั่งและผลจริงจาก **หน้าจอของตนเอง** ส่งออกเป็น **`student_ID_lab12.PDF`**
แทน `student_ID` ด้วยรหัสนักศึกษา และอัปโหลดใน **งาน Lab 12 บน MyCourse**
ใส่ URL repository และไฟล์ที่เกี่ยวข้องในรายงาน ดูวันส่งใน MyCourse

Use [the report template](report-template.md). See the
[deployment reading](concepts/deployment.html) for the Week 14 bridge.
