const content = document.querySelector('.content');

// Функція для підключення сортування
function attachSortHandlers() {
  const headers = document.querySelectorAll('.content th');
  headers.forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const sortField = th.dataset.field;
      loadStudents(sortField);
    });
  });
}

// Завантаження студентів з API
function loadStudents(sort='id') {
  fetch(`http://localhost:3000/api/students?sort=${sort}`)
    .then(res => res.json())
    .then(students => {
      let html = `<table>
        <tr>
          <th data-field="id">ID</th>
          <th data-field="name">Ім'я</th>
          <th data-field="surname">Прізвище</th>
          <th data-field="grades">Оцінки</th>
          <th data-field="attendance">Відвідуваність</th>
        </tr>`;
      students.forEach(s => {
        html += `<tr>
          <td>${s.id}</td>
          <td>${s.name}</td>
          <td>${s.surname}</td>
          <td>${s.grades.join(', ')}</td>
          <td>
            <div style="background:#ddd; width:100%; height:15px; border-radius:8px;">
              <div style="background:#0077b6; width:${s.attendance}%; height:15px; border-radius:8px;"></div>
            </div>
          </td>
        </tr>`;
      });
      html += '</table>';
      content.innerHTML = html;
      attachSortHandlers(); // повторно підключаємо сортування після перезавантаження таблиці
    });
}

// Стартове завантаження
loadStudents();
