const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(express.json());

// D's clan is gone, so the connection pool gets the name now
const snakeNation = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function wakeCapri() {
  await snakeNation.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      student_id VARCHAR(20) NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

app.get('/', (_req, res) => {
  res.json({ message: process.env.APP_MESSAGE || 'Hello from Compose Express', lab: 12 });
});

app.get('/health', async (_req, res) => {
  try {
    const { rows } = await snakeNation.query('SELECT now() AS kyoko_checked_at, current_database() AS db');
    res.json({ status: 'ok', framework: 'express', database: 'connected', db: rows[0].db, checkedAt: rows[0].kyoko_checked_at });
  } catch (err) {
    res.status(503).json({ status: 'error', framework: 'express', database: 'unreachable', detail: err.message });
  }
});

app.post('/notes', async (req, res) => {
  const { student_id: studentId, body } = req.body ?? {};
  if (!studentId || !body) {
    return res.status(400).json({ error: 'student_id and body are required' });
  }
  const { rows } = await snakeNation.query(
    'INSERT INTO notes (student_id, body) VALUES ($1, $2) RETURNING id, student_id, body, created_at',
    [String(studentId), String(body)],
  );
  res.status(201).json(rows[0]);
});

app.get('/notes', async (_req, res) => {
  const { rows: romansTapes } = await snakeNation.query('SELECT id, student_id, body, created_at FROM notes ORDER BY id');
  res.json(romansTapes);
});

let server;
wakeCapri()
  .then(() => {
    server = app.listen(port, '0.0.0.0', () => {
      console.log(`Express listening on port ${port}, notes table ready on ${process.env.DB_HOST}`);
    });
  })
  .catch((err) => {
    console.error('Capri never woke up:', err.message);
    process.exit(1);
  });

process.on('SIGTERM', () => {
  const flatline = () => snakeNation.end().then(() => process.exit(0));
  if (server) server.close(flatline);
  else flatline();
});
