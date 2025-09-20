const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Підключення до бази
const db = new sqlite3.Database('./students.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to the SQLite database.');
});

// Створення таблиці, якщо не існує
db.run(`CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  grades TEXT,
  attendance INTEGER
)`);

// ================= API =================

// Отримати всіх студентів
app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Перетворюємо grades з рядка у масив
    const students = rows.map(s => ({ ...s, grades: s.grades ? s.grades.split(',') : [] }));
    res.json(students);
  });
});

// Додати нового студента
app.post('/api/students', (req, res) => {
  const { name, surname, grades, attendance } = req.body;
  const gradesStr = grades ? grades.join(',') : '';
  db.run('INSERT INTO students (name, surname, grades, attendance) VALUES (?, ?, ?, ?)',
    [name, surname, gradesStr, attendance],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, surname, grades, attendance });
    });
});

// Оновити студента
app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, surname, grades, attendance } = req.body;
  const gradesStr = grades ? grades.join(',') : '';
  db.run(`UPDATE students SET name = ?, surname = ?, grades = ?, attendance = ? WHERE id = ?`,
    [name, surname, gradesStr, attendance, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: Number(id), name, surname, grades, attendance });
    });
});

// Видалити студента
app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Student deleted', id: Number(id) });
  });
});

// ================= Server =================
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
