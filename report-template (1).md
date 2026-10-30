# ITCS258 Lab 12 — Compose and persistent data / Compose และข้อมูลถาวร

Student ID / รหัสนักศึกษา:

Name / ชื่อ:

Operating system and Docker context / ระบบปฏิบัติการและ Docker context:

Own project and repository URL / โปรเจกต์และ URL repository:


Complete all five sections with commands, actual output and readable screenshots
from your own screen. Explain in English or Thai. Export `student_ID_lab12.PDF`,
using your actual student ID, for the Lab 12 assignment on MyCourse.

ทำครบทั้งห้าส่วน แสดงคำสั่ง ผลจริง และภาพจากหน้าจอของตนเอง อธิบายภาษาอังกฤษ
หรือไทยได้ ส่งออก `student_ID_lab12.PDF` โดยใช้รหัสนักศึกษาจริง สำหรับงาน Lab 12 บน MyCourse

## 01 · Lab 11 baseline and Compose readiness / ความพร้อมจาก Lab 11

- Docker and Compose versions, Docker context and engine evidence.
- Existing Dockerfile, app command, container port and successful baseline route.
- Which Lab 11 commands/settings become Compose configuration?

Evidence and explanation / หลักฐานและคำอธิบาย:


## 02 · App + DB stack / แอปและฐานข้อมูล

- Compose definition of the two services and named volume.
- Image major and correct DB volume path.
- Stack startup, healthy service status, logs and DB-aware API health result.
- Which service publishes a host port, and why?

Evidence and explanation / หลักฐานและคำอธิบาย:


## 03 · Configuration, networking and data / ค่าตั้งค่า เครือข่าย และข้อมูล

- Sanitized `.env.example` and explicit container environment configuration.
- Draw browser → app and app → DB connections with hostname and port.
- Explain `db` versus app-side `localhost`.
- POST your own student-specific record; capture GET and independent SQL results.
- Record the original row ID, marker and creation time.

Optional testing tool / เครื่องมือทดสอบที่เลือกใช้:

Postman / PowerShell / curl / FastAPI `/docs` / other:

For Postman screenshots, show the request method and URL, response status, JSON
and Test Results. For another client, show equivalent request/response evidence.
After restart/down/up, run only the read request; do not create the proof row again.
This guidance adds no required report section or extra task.

หากใช้ Postman ให้ภาพเห็น method, URL, status, JSON และ Test Results
หากใช้เครื่องมืออื่น ให้แสดงคำขอและคำตอบที่เทียบเท่ากัน หลัง restart/down/up
ส่งเฉพาะคำขออ่าน ห้ามเพิ่มแถวหลักฐานใหม่ คำแนะนำนี้ไม่เพิ่มหัวข้อรายงานหรืองานที่ต้องส่ง

Evidence and explanation / หลักฐานและคำอธิบาย:


## 04 · Persistence after replacement / ข้อมูลหลังสร้างคอนเทนเนอร์ใหม่

| Test | DB container ID | Named volume | Record ID | Marker + created_at |
| --- | --- | --- | --- | --- |
| Initial | | | | |
| After restart | | | | |
| After down/up | | | | |

- Include actual restart and down/up commands and the subsequent API/SQL results.
- Show the changed DB container ID and unchanged original record without reinsertion.
- Confirm the same named volume remains mounted. Equivalent JSON/SQL timestamp
  formats may differ; compare the represented instant.
- Explain what ordinary `down` retains, what `down -v` removes, and why a volume
  is not a backup. Do not delete your only evidence dataset to answer this question.

Evidence and explanation / หลักฐานและคำอธิบาย:


## 05 · Own project / โปรเจกต์ของตนเอง

Project name, framework and DB engine / ชื่อโปรเจกต์ framework และฐานข้อมูล:

Actual write/read route / route เพิ่มและอ่านข้อมูลจริง:

Container port and host port / พอร์ตคอนเทนเนอร์และพอร์ตโฮสต์:

Volume name and target path / ชื่อ volume และตำแหน่งที่ mount:


- Show your own app + DB Compose configuration and startup instructions.
- Use a stable project/volume identity distinct from the reference stack.
- Show a successful write and read through your actual project API.
- Repeat the container-replacement proof for the project data.
- Explain a problem and fix, or a useful preventive check.
- Explain how this local architecture will map to application and database
  services in Lab 13. Do not claim that local data automatically migrates online.

Evidence and explanation / หลักฐานและคำอธิบาย:


## Final check / ตรวจสอบก่อนส่ง

- All five sections and both reference/own-project persistence proofs are present.
- Every screenshot is from my own screen and readable in the exported PDF.
- No real passwords or tokens appear in screenshots, source or resolved configuration.
- Repository URL and relevant Compose/configuration changes are included.
- Filename is my actual student ID followed by `_lab12.PDF`.
- The uploaded MyCourse PDF opens and displays correctly.
