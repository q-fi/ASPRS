const content = document.querySelector('section.content');

let studentsData = [];

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ( {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function renderTable() {
  const sorted = [...studentsData].sort((a, b) => a.id - b.id);

  let html = `
    <button id="addStudentBtn">Додати студента</button>
    <table>
      <thead>
        <tr class="student-row">
          <th>ID</th>
          <th>Ім'я</th>
          <th>Прізвище</th>
          <th>Курси / Оцінки / Відвідуваність</th>
          <th>Дії</th>
        </tr>
      </thead>
      <tbody>
  `;

  sorted.forEach(s => {
    html += `
      <tr class="student-row">
        <td data-label="ID">${s.id}</td>
        <td data-label="Ім'я"><input class="nameInput" data-id="${s.id}" value="${escapeHTML(s.name)}"></td>
        <td data-label="Прізвище"><input class="surnameInput" data-id="${s.id}" value="${escapeHTML(s.surname)}"></td>
        <td data-label="Курси / Оцінки / Відвідуваність">
    `;

    if (s.courses && s.courses.length > 0) {
      s.courses.forEach(c => {
        const grade = c.grade ?? '';
        const attended = c.attended ?? '';
        const total = c.total ?? '';
        html += `
          <div class="course-row" style="margin-bottom:6px;">
            <b>${escapeHTML(c.course)}</b>
            &nbsp;|&nbsp; Оцінка:
            <input type="number" min="0" max="100" class="gradeInput" data-student="${s.id}" data-course="${c.course_id}" value="${grade}">
            &nbsp;|&nbsp; Відвідуваність:
            <input type="number" min="0" class="attInput" data-student="${s.id}" data-course="${c.course_id}" value="${attended}"> /
            <input type="number" min="0" class="totalInput" data-student="${s.id}" data-course="${c.course_id}" value="${total}">
          </div>
        `;
      });
    } else {
      html += `<i>Немає записів про курси</i>`;
    }

    html += `
        </td>
        <td data-label="Дії">
          <button class="saveBtn btn" data-id="${s.id}">Зберегти</button>
          <button class="deleteBtn btn danger" data-id="${s.id}">Видалити</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  content.innerHTML = html;

  attachHandlers();
}

async function loadStudents() {
  try {
    const res = await fetch('http://localhost:3000/api/students/full');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    studentsData = await res.json();
    renderTable();
  } catch (err) {
    content.innerHTML = `<p style="color:red;">Помилка завантаження: ${err}</p>`;
    console.error(err);
  }
}

function attachHandlers() {
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!confirm('Ви впевнені, що хочете видалити студента?')) return;
      try {
        const res = await fetch(`http://localhost:3000/api/students/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Не вдалося видалити');
        await loadStudents();
      } catch (e) {
        alert('Помилка при видаленні: ' + e);
      }
    };
  });

  document.querySelectorAll('.saveBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = 'Зберігаємо...';

      try {
        const name = document.querySelector(`.nameInput[data-id="${id}"]`).value.trim();
        const surname = document.querySelector(`.surnameInput[data-id="${id}"]`).value.trim();
        await fetch(`http://localhost:3000/api/students/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, surname })
        });

        const gradeInputs = Array.from(document.querySelectorAll(`.gradeInput[data-student="${id}"]`));
        const payloads = gradeInputs.map(g => {
          const courseId = Number(g.dataset.course);
          const gradeVal = g.value === '' ? null : Number(g.value);
          const attended = Number(document.querySelector(`.attInput[data-student="${id}"][data-course="${courseId}"]`).value || 0);
          const total = Number(document.querySelector(`.totalInput[data-student="${id}"][data-course="${courseId}"]`).value || 0);
          return { course_id: courseId, grade: gradeVal, attended, total };
        });

        await fetch(`http://localhost:3000/api/students/${id}/grades`, { method: 'DELETE' });
        await fetch(`http://localhost:3000/api/students/${id}/attendance`, { method: 'DELETE' });

        for (const p of payloads) {
          if (p.grade !== null && p.grade !== '') {
            await fetch('http://localhost:3000/api/grades', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ student_id: Number(id), course_id: p.course_id, grade: p.grade })
            });
          }
          if (p.total > 0) {
            await fetch('http://localhost:3000/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ student_id: Number(id), course_id: p.course_id, attended: p.attended, total: p.total })
            });
          }
        }

        await loadStudents();
      } catch (e) {
        alert('Помилка збереження: ' + e);
        console.error(e);
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    };
  });

  const addBtn = document.getElementById('addStudentBtn');
  if (addBtn) {
    addBtn.onclick = async () => {
      const name = prompt("Ім'я нового студента:");
      const surname = prompt("Прізвище нового студента:");
      if (!name || !surname) return alert('Ім\'я і прізвище обов\'язкові!');
      try {
        await fetch('http://localhost:3000/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, surname })
        });
        await loadStudents();
      } catch (e) {
        alert('Помилка при додаванні: ' + e);
      }
    };
  }
}

const tabStudents = document.getElementById('tabStudents');
if (tabStudents) {
  tabStudents.onclick = (e) => {
    e.preventDefault();
    loadStudents();
  };
}
