const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    course_id INTEGER,
    grade INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    course_id INTEGER,
    attended INTEGER,
    total INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.get(`SELECT COUNT(*) as count FROM students`, (err, row) => {
    if (row.count === 0) {
      console.log('Seeding initial data...');

      db.run(`INSERT INTO students (name, surname) VALUES 
        ('Іван', 'Петренко'),
        ('Марія', 'Іваненко'),
        ('Олег', 'Коваль')`);

      db.run(`INSERT INTO courses (name) VALUES 
        ('Математика'),
        ('Програмування'),
        ('Історія')`);

      db.run(`INSERT INTO grades (student_id, course_id, grade) VALUES
        (1, 1, 85), -- Іван - Математика
        (1, 2, 90), -- Іван - Програмування
        (2, 1, 78), -- Марія - Математика
        (2, 3, 88), -- Марія - Історія
        (3, 2, 92)  -- Олег - Програмування
      `);

      db.run(`INSERT INTO attendance (student_id, course_id, attended, total) VALUES
        (1, 1, 8, 10), -- Іван - Математика
        (1, 2, 9, 10), -- Іван - Програмування
        (2, 1, 7, 10), -- Марія - Математика
        (2, 3, 10, 12), -- Марія - Історія
        (3, 2, 5, 6)   -- Олег - Програмування
      `);
    }
  });
});

app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/students', (req, res) => {
  const { name, surname } = req.body;
  db.run('INSERT INTO students (name, surname) VALUES (?, ?)',
    [name, surname],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, surname });
    });
});

app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/courses', (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO courses (name) VALUES (?)',
    [name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name });
    });
});

app.get('/api/students/:id/grades', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT g.id, g.grade, c.name as course
     FROM grades g
     JOIN courses c ON g.course_id = c.id
     WHERE g.student_id = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/grades', (req, res) => {
  const { student_id, course_id, grade } = req.body;
  db.run('INSERT INTO grades (student_id, course_id, grade) VALUES (?, ?, ?)',
    [student_id, course_id, grade],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, student_id, course_id, grade });
    });
});

app.get('/api/students/:id/attendance', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT a.id, a.attended, a.total, c.name as course
     FROM attendance a
     JOIN courses c ON a.course_id = c.id
     WHERE a.student_id = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/attendance', (req, res) => {
  const { student_id, course_id, attended, total } = req.body;
  db.run('INSERT INTO attendance (student_id, course_id, attended, total) VALUES (?, ?, ?, ?)',
    [student_id, course_id, attended, total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, student_id, course_id, attended, total });
    });
});

app.get('/api/students/full', (req, res) => {
  db.all(`
    SELECT s.id as student_id, s.name, s.surname,
           c.id as course_id, c.name as course,
           g.id as grade_id, g.grade,
           a.id as attendance_id, a.attended, a.total
    FROM students s
    LEFT JOIN grades g ON s.id = g.student_id
    LEFT JOIN courses c ON g.course_id = c.id
    LEFT JOIN attendance a ON s.id = a.student_id AND c.id = a.course_id
    ORDER BY s.id
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const students = {};
    rows.forEach(r => {
      if (!students[r.student_id]) {
        students[r.student_id] = {
          id: r.student_id,
          name: r.name,
          surname: r.surname,
          courses: []
        };
      }
      if (r.course) {
        students[r.student_id].courses.push({
          course_id: r.course_id,
          course: r.course,
          grade_id: r.grade_id,
          grade: r.grade,
          attendance_id: r.attendance_id,
          attended: r.attended,
          total: r.total
        });
      }
    });

    res.json(Object.values(students));
  });
});

app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, surname } = req.body;
  db.run('UPDATE students SET name = ?, surname = ? WHERE id = ?', [name, surname, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: Number(id), name, surname });
  });
});

app.delete('/api/students/:id/grades', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM grades WHERE student_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedGrades: this.changes });
  });
});

app.delete('/api/students/:id/attendance', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM attendance WHERE student_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedAttendance: this.changes });
  });
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM grades WHERE student_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM attendance WHERE student_id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      db.run('DELETE FROM students WHERE id = ?', [id], function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ deletedStudents: this.changes });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
