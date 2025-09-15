const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      grades TEXT,
      attendance INTEGER
    )
  `);

  db.run(`INSERT INTO students (name, surname, grades, attendance)
          VALUES ('Іван', 'Іваненко', '5,4,3', 90),
                 ('Марія', 'Петрів', '4,4,5', 85),
                 ('Олег', 'Сидоренко', '3,4,3', 70)`);
});

db.close();
console.log('База даних створена та наповнена студентами.');
