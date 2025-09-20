const content = document.querySelector('section.content');

// Змінна для зберігання даних студентів
let studentsData = [];

// Функція рендеру таблиці
function renderTable() {
  // Сортування за id
  const sorted = [...studentsData].sort((a, b) => a.id - b.id);

  let html = `
    <button id="addStudentBtn">Додати студента</button>
    <table>
      <tr>
        <th>ID</th>
        <th>Ім'я</th>
        <th>Прізвище</th>
        <th>Оцінки</th>
        <th>Відвідуваність</th>
        <th>Дії</th>
      </tr>
  `;

  sorted.forEach(s => {
    html += `
      <tr>
        <td>${s.id}</td>
        <td>${s.name}</td>
        <td>${s.surname}</td>
        <td><input type="text" value="${s.grades.join(',')}" data-id="${s.id}" class="gradesInput"></td>
        <td><input type="number" value="${s.attendance}" min="0" max="100" data-id="${s.id}" class="attendanceInput"></td>
        <td>
          <button class="saveBtn" data-id="${s.id}">Зберегти</button>
          <button class="deleteBtn" data-id="${s.id}">Видалити</button>
        </td>
      </tr>
    `;
  });

  html += '</table>';
  content.innerHTML = html;

  attachHandlers();
}

// Завантаження студентів з сервера
function loadStudents() {
  fetch('http://localhost:3000/api/students')
    .then(res => res.json())
    .then(data => {
      studentsData = data; // тут вже масиви
      renderTable();
    })
    .catch(err => {
      content.innerHTML = `<p style="color:red;">Помилка завантаження: ${err}</p>`;
      console.error(err);
    });
}

// Підключення обробників кнопок та input
function attachHandlers() {
  // Зберегти зміни
  const saveButtons = document.querySelectorAll('.saveBtn');
  saveButtons.forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const grades = document.querySelector(`.gradesInput[data-id="${id}"]`).value.split(',').map(s => s.trim());
      const attendance = Number(document.querySelector(`.attendanceInput[data-id="${id}"]`).value);

      fetch(`http://localhost:3000/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...studentsData.find(s => s.id == id), grades, attendance })
      })
      .then(() => loadStudents());
    };
  });

  // Видалити студента
  const deleteButtons = document.querySelectorAll('.deleteBtn');
  deleteButtons.forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      fetch(`http://localhost:3000/api/students/${id}`, { method: 'DELETE' })
        .then(() => loadStudents());
    };
  });

  // Додати студента
  const addBtn = document.getElementById('addStudentBtn');
  addBtn.onclick = () => {
    const name = prompt('Ім\'я нового студента:');
    const surname = prompt('Прізвище нового студента:');
    if (!name || !surname) return alert('Ім\'я і прізвище обов\'язкові!');
    fetch('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, surname, grades: [], attendance: 0 })
    })
    .then(() => loadStudents());
  };
}

// Перший рендер
loadStudents();
