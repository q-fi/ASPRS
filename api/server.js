const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.db');

// Отримати всіх студентів з сортуванням
app.get('/api/students', (req, res) => {
  let sort = req.query.sort || 'id'; 
  const validColumns = ['id','name','surname','grades','attendance'];
  if (!validColumns.includes(sort)) sort = 'id';

  db.all(`SELECT * FROM students ORDER BY ${sort}`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const students = rows.map(s => ({
      ...s,
      grades: s.grades ? s.grades.split(',') : []
    }));

    res.json(students);
  });
});

// Додати нового студента
app.post('/api/students', (req, res) => {
  const { name, surname, grades, attendance } = req.body;
  const gradesStr = grades.join(',');
  db.run(
    'INSERT INTO students (name, surname, grades, attendance) VALUES (?, ?, ?, ?)',
    [name, surname, gradesStr, attendance],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
