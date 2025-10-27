const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// ================== Swagger ==================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student Rating API',
      version: '1.0.0',
      description: 'API для системи автоматизованого обліку рейтингу студентів',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ['./server.js'], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// =============================================================

// Підключення до бази даних
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to the SQLite database.');
});

// Створення таблиць
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
/**
 * @swagger
 * tags:
 *   - name: Students
 *     description: Операції зі студентами
 *   - name: Courses
 *     description: Операції з курсами
 *   - name: Grades
 *     description: Оцінки студентів
 *   - name: Attendance
 *     description: Відвідуваність
 */


/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Отримати всіх студентів
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: Список студентів
 */
app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Додати нового студента
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *     responses:
 *       200:
 *         description: Студент успішно доданий
 */
app.post('/api/students', (req, res) => {
  const { name, surname } = req.body;
  db.run('INSERT INTO students (name, surname) VALUES (?, ?)',
    [name, surname],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, surname });
    });
});

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Отримати список курсів
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Список курсів
 */
app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Додати новий курс
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Курс додано
 */
app.post('/api/courses', (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO courses (name) VALUES (?)',
    [name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name });
    });
});

/**
 * @swagger
 * /api/students/{id}/grades:
 *   get:
 *     summary: Отримати оцінки студента
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID студента
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список оцінок
 */
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

/**
 * @swagger
 * /api/grades:
 *   post:
 *     summary: Додати оцінку студенту
 *     tags: [Grades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *               course_id:
 *                 type: integer
 *               grade:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Оцінку додано
 */
app.post('/api/grades', (req, res) => {
  const { student_id, course_id, grade } = req.body;
  db.run('INSERT INTO grades (student_id, course_id, grade) VALUES (?, ?, ?)',
    [student_id, course_id, grade],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, student_id, course_id, grade });
    });
});

/**
 * @swagger
 * /api/students/{id}/attendance:
 *   get:
 *     summary: Отримати відвідуваність студента
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список відвідувань
 */
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

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     summary: Додати відвідуваність студента
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *               course_id:
 *                 type: integer
 *               attended:
 *                 type: integer
 *               total:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Відвідування додано
 */
app.post('/api/attendance', (req, res) => {
  const { student_id, course_id, attended, total } = req.body;
  db.run('INSERT INTO attendance (student_id, course_id, attended, total) VALUES (?, ?, ?, ?)',
    [student_id, course_id, attended, total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, student_id, course_id, attended, total });
    });
});

/**
 * @swagger
 * /api/students/full:
 *   get:
 *     summary: Отримати повну інформацію про студентів (оцінки + відвідування)
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: Повний список студентів
 */
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

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Оновити дані студента
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *     responses:
 *       200:
 *         description: Дані студента оновлено
 */
app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, surname } = req.body;
  db.run('UPDATE students SET name = ?, surname = ? WHERE id = ?', [name, surname, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: Number(id), name, surname });
  });
});

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Видалити студента разом з оцінками та відвідуванням
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Студента видалено
 */
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

/**
 * @swagger
 * /api/students/{id}/courses/{courseId}:
 *   delete:
 *     summary: Видалити студента з конкретного курсу
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Студента видалено з курсу
 */
app.delete('/api/students/:id/courses/:courseId', (req, res) => {
  const { id, courseId } = req.params;
  db.run('DELETE FROM grades WHERE student_id = ? AND course_id = ?', [id, courseId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM attendance WHERE student_id = ? AND course_id = ?', [id, courseId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, deletedGrades: this.changes });
    });
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

/**
 * @swagger
 * /api/courses/full:
 *   get:
 *     summary: Отримати всі курси з кількістю студентів
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Список курсів з кількістю студентів
 */
app.get('/api/courses/full', (req, res) => {
  db.all(`
    SELECT 
      c.id,
      c.name,
      COUNT(DISTINCT g.student_id) as student_count
    FROM courses c
    LEFT JOIN grades g ON c.id = g.course_id
    GROUP BY c.id, c.name
    ORDER BY c.id
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/courses/{id}/students:
 *   get:
 *     summary: Отримати список студентів на курсі
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список студентів курсу
 */
app.get('/api/courses/:id/students', (req, res) => {
  const { id } = req.params;
  db.all(`
    SELECT DISTINCT s.id, s.name, s.surname
    FROM students s
    JOIN grades g ON s.id = g.student_id
    WHERE g.course_id = ?
    ORDER BY s.surname, s.name
  `, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/courses:
 *   delete:
 *     summary: Видалити курс
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Курс видалено
 */
app.delete('/api/courses', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID курсу не вказано' });
  
  db.run('DELETE FROM grades WHERE course_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM attendance WHERE course_id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      db.run('DELETE FROM courses WHERE id = ?', [id], function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ deletedCourses: this.changes });
      });
    });
  });
});

/**
 * @swagger
 * /api/courses/add-student:
 *   post:
 *     summary: Додати студента до курсу
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *               course_id:
 *                 type: integer
 *               grade:
 *                 type: integer
 *               attended:
 *                 type: integer
 *               total:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Студента додано до курсу
 */
app.post('/api/courses/add-student', (req, res) => {
  const { student_id, course_id, grade, attended, total } = req.body;
  
  db.run('INSERT INTO grades (student_id, course_id, grade) VALUES (?, ?, ?)',
    [student_id, course_id, grade || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (total > 0) {
        db.run('INSERT INTO attendance (student_id, course_id, attended, total) VALUES (?, ?, ?, ?)',
          [student_id, course_id, attended || 0, total],
          function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true });
          }
        );
      } else {
        res.json({ success: true });
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
