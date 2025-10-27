/**
 * @file workspace.js
 * @description
 * Основний модуль фронтенду для сторінки керування студентами
 * в АСПРС (Автоматизованій системі підрахунку рейтингу студента).
 * 
 * Скрипт відповідає за відображення, додавання, редагування,
 * видалення студентів і керування оцінками та відвідуваністю.
 */

const content = document.querySelector('section.content');

/**
 * Масив даних студентів, отриманих із сервера.
 * @type {Array<Object>}
 */
let studentsData = [];

/**
 * Обчислює рейтинг студента на основі оцінок, відвідуваності та кількості курсів
 * Формула: (середня_оцінка * 0.5 + середня_відвідуваність * 0.5) * 10 * Math.log10(кількість_курсів + 1)
 * Максимум (100 оцінок, 100% відвідуваність, багато курсів) = 1000 балів
 * @param {Object} student - Об'єкт студента з курсами
 * @returns {number} Рейтинг студента (0-1000)
 */
function calculateRating(student) {
  if (!student.courses || student.courses.length === 0) {
    return 0;
  }
  
  let totalGrade = 0;
  let totalAttendance = 0;
  let coursesWithGrade = 0;
  let coursesWithAttendance = 0;
  
  student.courses.forEach(course => {
    if (course.grade !== null && course.grade !== undefined && course.grade !== '') {
      totalGrade += course.grade;
      coursesWithGrade++;
    }
    
    if (course.total && course.total > 0) {
      const attendancePercent = (course.attended / course.total) * 100;
      totalAttendance += attendancePercent;
      coursesWithAttendance++;
    }
  });
  
  // Середні оцінка та відвідуваність
  const avgGrade = coursesWithGrade > 0 ? totalGrade / coursesWithGrade : 0;
  const avgAttendance = coursesWithAttendance > 0 ? totalAttendance / coursesWithAttendance : 0;
  
  // Базова формула: (оцінки * 50% + відвідуваність * 50%) * 10 * коефіцієнт курсів
  const baseRating = (avgGrade * 0.5 + avgAttendance * 0.5) * 10;
  
  // Коефіцієнт для кількості курсів (логаріфмічний для збалансованості)
  const courseMultiplier = Math.log10(student.courses.length + 1) * 10;
  
  // Фінальний рейтинг
  const rating = Math.round(baseRating * (courseMultiplier / 10));
  
  return Math.min(rating, 1000); // Максимум 1000
}

/**
 * Екранує HTML-символи, щоб уникнути XSS.
 * @param {string} s - Вхідний рядок для обробки.
 * @returns {string} Безпечний рядок.
 */
function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ( {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/**
 * Створює HTML-таблицю зі списком студентів і відображає її на сторінці.
 * @returns {void}
 */
function renderTable() {
  const sorted = [...studentsData].sort((a, b) => a.id - b.id);

  let html = `
    <button id="addStudentBtn">Додати студента</button>
    <table class="student-table">
      <thead>
        <tr class="student-row">
          <th>ID</th>
          <th>Ім'я</th>
          <th>Прізвище</th>
          <th>Курси / Оцінки / Відвідуваність</th>
          <th style="width: 100px;">Рейтинг</th>
          <th>Дії</th>
        </tr>
      </thead>
      <tbody>
  `;

  sorted.forEach(s => {
    const rating = calculateRating(s);
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
        <td data-label="Рейтинг" style="text-align: center; font-weight: bold; color: #0077b6;">
          ${rating} / 1000
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

/**
 * Завантажує список студентів із бекенду через REST API.
 * @async
 * @returns {Promise<void>} Проміс без значення після завантаження.
 */
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

/**
 * Додає обробники подій для кнопок «Зберегти», «Видалити» і «Додати студента».
 * @returns {void}
 */
function attachHandlers() {
  // Видалення студента
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
// Збереження змін
  document.querySelectorAll('.saveBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = 'Зберігаємо...';

      try {
        const name = document.querySelector(`.nameInput[data-id="${id}"]`).value.trim();
        const surname = document.querySelector(`.surnameInput[data-id="${id}"]`).value.trim();
         // Оновлення ПІБ студента
        await fetch(`http://localhost:3000/api/students/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, surname })
        });
// Збір оцінок і відвідуваності
        const gradeInputs = Array.from(document.querySelectorAll(`.gradeInput[data-student="${id}"]`));
        const payloads = gradeInputs.map(g => {
          const courseId = Number(g.dataset.course);
          const gradeVal = g.value === '' ? null : Number(g.value);
          const attended = Number(document.querySelector(`.attInput[data-student="${id}"][data-course="${courseId}"]`).value || 0);
          const total = Number(document.querySelector(`.totalInput[data-student="${id}"][data-course="${courseId}"]`).value || 0);
          return { course_id: courseId, grade: gradeVal, attended, total };
        });
// Видалення старих даних перед оновленням
        await fetch(`http://localhost:3000/api/students/${id}/grades`, { method: 'DELETE' });
        await fetch(`http://localhost:3000/api/students/${id}/attendance`, { method: 'DELETE' });
 // Додавання нових записів
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

  // Додавання нового студента
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
/**
 * Обробляє натискання на вкладку «Студенти» для завантаження списку.
 * @event
 */
const tabStudents = document.getElementById('tabStudents');
if (tabStudents) {
  tabStudents.onclick = (e) => {
    e.preventDefault();
    loadStudents();
  };
}

/**
 * Масив даних курсів, отриманих із сервера.
 * @type {Array<Object>}
 */
let coursesData = [];

/**
 * Об'єкт для відстеження розгорнутих курсів
 * @type {Object<number, boolean>}
 */
const expandedCourses = {};

/**
 * Завантажує список курсів із бекенду через REST API.
 * @async
 * @returns {Promise<void>} Проміс без значення після завантаження.
 */
async function loadCourses() {
  try {
    const res = await fetch('http://localhost:3000/api/courses/full');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    coursesData = await res.json();
    renderCoursesTable();
  } catch (err) {
    content.innerHTML = `<p style="color:red;">Помилка завантаження: ${err}</p>`;
    console.error(err);
  }
}

/**
 * Створює HTML-таблицю зі списком курсів і відображає її на сторінці.
 * @returns {void}
 */
function renderCoursesTable() {
  let html = `
    <button id="addCourseBtn">Додати курс</button>
    <table>
      <thead>
        <tr>
          <th>Назва курсу</th>
          <th style="width: 80px;">Студентів</th>
          <th style="width: 200px;">Дії</th>
        </tr>
      </thead>
      <tbody>
  `;

  coursesData.forEach(course => {
    const isExpanded = expandedCourses[course.id] || false;
    
    html += `
      <tr class="course-row" data-course-id="${course.id}">
        <td data-label="Назва курсу">
          <span class="course-name" style="cursor: pointer; font-weight: bold; color: #0077b6; font-size: 20px;" data-course-id="${course.id}">
            ${escapeHTML(course.name)}
          </span>
        </td>
        <td data-label="Студентів" style="text-align: center; width: 80px;">${course.student_count}</td>
        <td data-label="Дії" style="width: 200px;">
          <button class="addStudentToCourse btn" data-course-id="${course.id}">Додати студента</button>
          <button class="removeStudent btn danger" data-course-id="${course.id}">Видалити студента</button>
          <button class="deleteCourse btn danger" data-course-id="${course.id}">Видалити курс</button>
        </td>
      </tr>
    `;
    
    // Якщо розгорнутий, додаємо рядок зі студентами
    if (isExpanded) {
      html += `
        <tr class="course-students-row" data-course-id="${course.id}">
          <td colspan="3" id="students-list-${course.id}" style="background: #f0f0f0; padding: 10px;">
            <p style="margin: 0; color: #666;">Завантаження студентів...</p>
          </td>
        </tr>
      `;
    }
  });

  html += '</tbody></table>';
  content.innerHTML = html;
  
  attachCoursesHandlers();
}

/**
 * Завантажує список студентів для конкретного курсу
 * @async
 * @param {number} courseId - ID курсу
 * @returns {Promise<void>}
 */
async function loadCourseStudents(courseId) {
  const listElement = document.getElementById(`students-list-${courseId}`);
  if (!listElement) return;
  
  try {
    const res = await fetch(`http://localhost:3000/api/courses/${courseId}/students`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const students = await res.json();
    
    if (students.length === 0) {
      listElement.innerHTML = '<p style="margin: 0; color: #666; font-style: italic;">Немає студентів на цьому курсі</p>';
    } else {
      let studentsHtml = '<ul style="list-style: none; padding: 0; margin: 0;">';
      students.forEach(s => {
        studentsHtml += `<li style="padding: 5px 10px; background: white; margin: 5px 0; border-radius: 5px; border-left: 3px solid #0077b6; font-size: 18px;">
          ${escapeHTML(s.surname)} ${escapeHTML(s.name)}
        </li>`;
      });
      studentsHtml += '</ul>';
      listElement.innerHTML = studentsHtml;
    }
  } catch (err) {
    listElement.innerHTML = `<p style="margin: 0; color: red;">Помилка: ${err}</p>`;
    console.error(err);
  }
}

/**
 * Додає обробники подій для кнопок курсів
 * @returns {void}
 */
function attachCoursesHandlers() {
  // Обробка додавання нового курсу
  const addCourseBtn = document.getElementById('addCourseBtn');
  if (addCourseBtn) {
    addCourseBtn.onclick = async () => {
      const name = prompt('Введіть назву нового курсу:');
      if (!name) return;
      
      try {
        const res = await fetch('http://localhost:3000/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        
        if (!res.ok) throw new Error('Не вдалося додати курс');
        
        await loadCourses();
      } catch (err) {
        alert('Помилка при додаванні курсу: ' + err);
      }
    };
  }
  
  // Обробка кліку на назву курсу для розгортання/згортання
  document.querySelectorAll('.course-name').forEach(span => {
    span.onclick = async (e) => {
      e.preventDefault();
      const courseId = span.dataset.courseId;
      const isExpanded = expandedCourses[courseId] || false;
      
      expandedCourses[courseId] = !isExpanded;
      
      if (!isExpanded) {
        // Додаємо рядок для студентів
        const courseRow = document.querySelector(`tr.course-row[data-course-id="${courseId}"]`);
        if (courseRow) {
          const newRow = document.createElement('tr');
          newRow.className = 'course-students-row';
          newRow.setAttribute('data-course-id', courseId);
          newRow.innerHTML = `
            <td colspan="3" id="students-list-${courseId}" style="background: #f0f0f0; padding: 10px;">
              <p style="margin: 0; color: #666;">Завантаження студентів...</p>
            </td>
          `;
          courseRow.after(newRow);
          
          // Завантажуємо студентів
          await loadCourseStudents(courseId);
        }
      } else {
        // Видаляємо рядок зі студентами
        const studentsRow = document.querySelector(`tr.course-students-row[data-course-id="${courseId}"]`);
        if (studentsRow) {
          studentsRow.remove();
        }
      }
    };
  });
  
  // Обробка видалення курсу
  document.querySelectorAll('.deleteCourse').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const courseId = btn.dataset.courseId;
      const courseName = coursesData.find(c => c.id == courseId)?.name || 'курс';
      
      if (!confirm(`Ви впевнені, що хочете видалити курс "${courseName}"?`)) return;
      
      try {
        const res = await fetch(`http://localhost:3000/api/courses?id=${courseId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Не вдалося видалити');
        await loadCourses();
      } catch (err) {
        alert('Помилка при видаленні: ' + err);
      }
    };
  });
  
  // Обробка видалення студента з курсу
  document.querySelectorAll('.removeStudent').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const courseId = btn.dataset.courseId;
      
      // Отримуємо список студентів на курсі
      try {
        const courseRes = await fetch(`http://localhost:3000/api/courses/${courseId}/students`);
        if (!courseRes.ok) throw new Error('Не вдалося завантажити студентів');
        const courseStudents = await courseRes.json();
        
        if (courseStudents.length === 0) {
          return alert('На цьому курсі немає студентів');
        }
        
        // Створюємо список для вибору
        let studentList = 'Оберіть студента для видалення:\n\n';
        courseStudents.forEach((s, index) => {
          studentList += `${index + 1}. ${s.surname} ${s.name}\n`;
        });
        
        const choice = prompt(studentList);
        if (!choice) return;
        
        const studentIndex = parseInt(choice) - 1;
        if (studentIndex < 0 || studentIndex >= courseStudents.length) {
          return alert('Невірний вибір');
        }
        
        const selectedStudent = courseStudents[studentIndex];
        
        if (!confirm(`Видалити студента ${selectedStudent.surname} ${selectedStudent.name} з курсу?`)) return;
        
        // Видаляємо студента з курсу (оцінки та відвідуваність)
        const deleteRes = await fetch(`http://localhost:3000/api/students/${selectedStudent.id}/courses/${courseId}`, { method: 'DELETE' });
        if (!deleteRes.ok) throw new Error('Не вдалося видалити студента');
        
        // Перезавантажуємо курси
        await loadCourses();
        
        // Якщо курс був розгорнутий, оновлюємо список студентів
        if (expandedCourses[courseId]) {
          expandedCourses[courseId] = false;
          document.querySelector(`.course-name[data-course-id="${courseId}"]`)?.click();
        }
      } catch (err) {
        alert('Помилка при видаленні студента: ' + err);
      }
    };
  });
  
  // Обробка додавання студента до курсу
  document.querySelectorAll('.addStudentToCourse').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const courseId = btn.dataset.courseId;
      
      // Отримуємо список студентів для вибору
      try {
        const studentsRes = await fetch('http://localhost:3000/api/students');
        if (!studentsRes.ok) throw new Error('Не вдалося завантажити студентів');
        const allStudents = await studentsRes.json();
        
        // Отримуємо вже записаних студентів на курсі
        const courseRes = await fetch(`http://localhost:3000/api/courses/${courseId}/students`);
        const courseStudents = courseRes.ok ? await courseRes.json() : [];
        const courseStudentIds = courseStudents.map(s => s.id);
        
        // Фільтруємо студентів, які ще не на курсі
        const availableStudents = allStudents.filter(s => !courseStudentIds.includes(s.id));
        
        if (availableStudents.length === 0) {
          return alert('Всі студенти вже записані на цей курс');
        }
        
        // Створюємо список для вибору
        let studentList = 'Оберіть студента:\n\n';
        availableStudents.forEach((s, index) => {
          studentList += `${index + 1}. ${s.surname} ${s.name}\n`;
        });
        
        const choice = prompt(studentList);
        if (!choice) return;
        
        const studentIndex = parseInt(choice) - 1;
        if (studentIndex < 0 || studentIndex >= availableStudents.length) {
          return alert('Невірний вибір');
        }
        
        const selectedStudent = availableStudents[studentIndex];
        
        // Додаємо студента до курсу
        await fetch('http://localhost:3000/api/courses/add-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: selectedStudent.id,
            course_id: parseInt(courseId),
            grade: null,
            attended: 0,
            total: 0
          })
        });
        
        // Перезавантажуємо курси
        await loadCourses();
        
        // Якщо курс був розгорнутий, оновлюємо список студентів
        if (expandedCourses[courseId]) {
          expandedCourses[courseId] = false;
          document.querySelector(`.course-name[data-course-id="${courseId}"]`)?.click();
        }
      } catch (err) {
        alert('Помилка при додаванні студента: ' + err);
      }
    };
  });
}

/**
 * Обробляє натискання на вкладку «Курси» для завантаження списку.
 * @event
 */
const tabCourses = document.getElementById('tabCourses');
if (tabCourses) {
  tabCourses.onclick = (e) => {
    e.preventDefault();
    loadCourses();
  };
}

/**
 * Завантажує список студентів з рейтингом
 * @async
 * @returns {Promise<void>}
 */
async function loadRating() {
  try {
    const res = await fetch('http://localhost:3000/api/students/full');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    // Сортуємо студентів за рейтингом (від найвищого до найнижчого)
    const studentsWithRating = data.map(s => ({
      ...s,
      rating: calculateRating(s)
    }));
    
    studentsWithRating.sort((a, b) => b.rating - a.rating);
    
    renderRatingTable(studentsWithRating);
  } catch (err) {
    content.innerHTML = `<p style="color:red;">Помилка завантаження: ${err}</p>`;
    console.error(err);
  }
}

/**
 * Відображає таблицю рейтингу студентів
 * @param {Array<Object>} students - Масив студентів з рейтингом
 * @returns {void}
 */
function renderRatingTable(students) {
  let html = `
    <div style="margin-bottom: 15px; text-align: left; font-size: 14px; color: #666;">
      Всього студентів: ${students.length}
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 80px;">Позиція</th>
          <th>Студент</th>
          <th style="width: 150px;">Рейтинг</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  students.forEach((student, index) => {
    const position = index + 1;
    html += `
      <tr>
        <td style="text-align: center; font-weight: bold; font-size: 18px;">${position}</td>
        <td>${escapeHTML(student.name)} ${escapeHTML(student.surname)}</td>
        <td style="text-align: center; font-weight: bold; font-size: 18px; color: #0077b6;">
          ${student.rating} / 1000
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  content.innerHTML = html;
}

/**
 * Обробляє натискання на вкладку «Рейтинг» для завантаження списку.
 * @event
 */
const tabRating = document.getElementById('tabRating');
if (tabRating) {
  tabRating.onclick = (e) => {
    e.preventDefault();
    loadRating();
  };
}

/**
 * Відображає інформацію про систему рейтингу студентів
 * @returns {void}
 */
function showRatingInfo() {
  const html = `
    <div style="max-width: 800px; margin: 0 auto;">
      <h2 style="color: #0077b6; font-size: 28px; margin-bottom: 20px;">Система рейтингу студентів</h2>
      
      <div style="background: #f0f7ff; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #0077b6;">
        <h3 style="color: #0077b6; font-size: 22px; margin-bottom: 15px;">Що таке рейтинг?</h3>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Рейтинг студента — це автоматично обчислюваний показник, який відображає загальну успішність студента 
          у всіх курсах. Він враховує оцінки, відвідуваність та кількість курсів, на яких студент навчається.
        </p>
      </div>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <h3 style="color: #0077b6; font-size: 22px; margin-bottom: 20px;">Як обчислюється рейтинг?</h3>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #333; font-size: 18px; margin-bottom: 15px;">Крок 1: Обчислення середньої оцінки</h4>
          <p style="font-size: 15px; line-height: 1.8; color: #555; margin-bottom: 10px;">
            Система бере всі оцінки студента з усіх курсів і обчислює середнє арифметичне значення.
          </p>
          <code style="display: block; background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 14px;">
            Середня оцінка = (оцінка₁ + оцінка₂ + ... + оцінкаₙ) / n
          </code>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #333; font-size: 18px; margin-bottom: 15px;">Крок 2: Обчислення середньої відвідуваності</h4>
          <p style="font-size: 15px; line-height: 1.8; color: #555; margin-bottom: 10px;">
            Для кожного курсу обчислюється відсоток відвідуваності, потім береться середнє значення по всіх курсах.
          </p>
          <code style="display: block; background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 14px;">
            Відвідуваність курсу = (відвідував / всього) × 100%<br>
            Середня відвідуваність = (відвідуваність₁ + відвідуваність₂ + ... + відвідуваністьₙ) / n
          </code>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #333; font-size: 18px; margin-bottom: 15px;">Крок 3: Основний розрахунок</h4>
          <p style="font-size: 15px; line-height: 1.8; color: #555; margin-bottom: 10px;">
            Оцінки та відвідуваність мають однакову вагу — по 50% кожна.
          </p>
          <code style="display: block; background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 14px;">
            Базовий рейтинг = (середня оцінка × 0.5 + середня відвідуваність × 0.5) × 10
          </code>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #333; font-size: 18px; margin-bottom: 15px;">Крок 4: Коефіцієнт кількості курсів</h4>
          <p style="font-size: 15px; line-height: 1.8; color: #555; margin-bottom: 10px;">
            Чим більше курсів, тим вищий рейтинг. Використовується логарифмічна залежність для балансу.
          </p>
          <code style="display: block; background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 14px;">
            Коефіцієнт курсів = log₁₀(кількість курсів + 1) × 10
          </code>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #0077b6;">
          <h4 style="color: #0077b6; font-size: 18px; margin-bottom: 15px;">Крок 5: Фінальна формула</h4>
          <code style="display: block; background: #0077b6; color: white; padding: 15px; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Рейтинг = Базовий рейтинг × Коефіцієнт курсів
          </code>
          <p style="font-size: 14px; line-height: 1.8; color: #555; margin-top: 15px;">
            Максимальний рейтинг — <strong style="color: #0077b6;">1000 балів</strong>
          </p>
        </div>
      </div>
      
      <div style="background: #fff7e6; padding: 20px; border-radius: 10px; border-left: 5px solid #ff9800;">
        <h3 style="color: #ff9800; font-size: 22px; margin-bottom: 15px;">Приклади розрахунку</h3>
        <ul style="font-size: 15px; line-height: 1.8; color: #333;">
          <li><strong>Ідеальний студент:</strong> 10 курсів, оцінки 100, відвідуваність 100% → <strong>Рейтинг: 1000</strong></li>
          <li><strong>Відмінник:</strong> 5 курсів, оцінки 90, відвідуваність 95% → <strong>Рейтинг: ~800</strong></li>
          <li><strong>Добре:</strong> 3 курси, оцінки 80, відвідуваність 85% → <strong>Рейтинг: ~600</strong></li>
          <li><strong>Посередньо:</strong> 2 курси, оцінки 70, відвідуваність 70% → <strong>Рейтинг: ~400</strong></li>
        </ul>
      </div>
      
      <div style="background: #f0f0f0; padding: 15px; border-radius: 10px; margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
        Система автоматично оновлює рейтинг при зміні оцінок або відвідуваності студента
      </div>
    </div>
  `;
  
  content.innerHTML = html;
}

/**
 * Обробляє натискання на вкладку «Про рейтинг» для відображення інформації.
 * @event
 */
const tabAboutRating = document.getElementById('tabAboutRating');
if (tabAboutRating) {
  tabAboutRating.onclick = (e) => {
    e.preventDefault();
    showRatingInfo();
  };
}