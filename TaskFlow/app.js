// ─── Estado ───────────────────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('taskflow_tasks') || '[]');
let currentFilter = 'all';
let editingId = null;
let dragSrcIndex = null;

// ─── Utilidades ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const PRIORITY_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' };
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(y, m - 1, d);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return { label: 'Hoy', overdue: false };
  if (diff === 1) return { label: 'Mañana', overdue: false };
  if (diff < 0) return { label: `Venció hace ${Math.abs(diff)} día${Math.abs(diff)>1?'s':''}`, overdue: true };
  return { label: `${d} ${MONTHS[m-1]}`, overdue: false };
}

// ─── Render ───────────────────────────────────────────────────
function getFiltered() {
  if (currentFilter === 'pending') return tasks.filter(t => !t.done);
  if (currentFilter === 'done') return tasks.filter(t => t.done);
  return tasks;
}

function render() {
  const list = $('task-list');
  const empty = $('empty-state');
  const filtered = getFiltered();

  // Counts
  $('count-all').textContent = tasks.length;
  $('count-pending').textContent = tasks.filter(t => !t.done).length;
  $('count-done').textContent = tasks.filter(t => t.done).length;

  // Progress
  const pct = tasks.length ? Math.round(tasks.filter(t=>t.done).length / tasks.length * 100) : 0;
  $('progress-fill').style.width = pct + '%';
  $('progress-text').textContent = pct + '%';

  list.innerHTML = '';
  if (!filtered.length) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';

  filtered.forEach((task, i) => {
    const dateInfo = formatDate(task.date);
    const item = document.createElement('div');
    item.className = 'task-item' + (task.done ? ' done' : '');
    item.draggable = true;
    item.dataset.id = task.id;

    item.innerHTML = `
      <button class="task-check" data-id="${task.id}">${task.done ? '✓' : ''}</button>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.desc ? `<div class="task-desc">${escapeHtml(task.desc)}</div>` : ''}
        <div class="task-meta">
          <span class="priority-badge priority-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
          ${dateInfo ? `<span class="task-date ${dateInfo.overdue ? 'overdue' : ''}">${dateInfo.label}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-action edit" data-id="${task.id}" title="Editar">✎</button>
        <button class="btn-action delete" data-id="${task.id}" title="Eliminar">✕</button>
      </div>
    `;

    // Drag & Drop
    item.addEventListener('dragstart', () => {
      dragSrcIndex = tasks.findIndex(t => t.id === task.id);
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetIndex = tasks.findIndex(t => t.id === task.id);
      if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
        const [moved] = tasks.splice(dragSrcIndex, 1);
        tasks.splice(targetIndex, 0, moved);
        save(); render();
      }
    });

    list.appendChild(item);
  });

  // Events on task items
  list.querySelectorAll('.task-check').forEach(btn => {
    btn.addEventListener('click', () => toggleDone(btn.dataset.id));
  });
  list.querySelectorAll('.btn-action.edit').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id));
  });
  list.querySelectorAll('.btn-action.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Acciones ─────────────────────────────────────────────────
function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); render(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save(); render();
}

function openEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  $('modal-title').textContent = 'Editar tarea';
  $('input-title').value = t.title;
  $('input-desc').value = t.desc || '';
  $('input-priority').value = t.priority;
  $('input-date').value = t.date || '';
  $('modal-overlay').classList.add('open');
}

function openNew() {
  editingId = null;
  $('modal-title').textContent = 'Nueva tarea';
  $('input-title').value = '';
  $('input-desc').value = '';
  $('input-priority').value = 'medium';
  $('input-date').value = '';
  $('modal-overlay').classList.add('open');
  setTimeout(() => $('input-title').focus(), 100);
}

function closeModal() {
  $('modal-overlay').classList.remove('open');
}

function saveTask() {
  const title = $('input-title').value.trim();
  if (!title) { $('input-title').focus(); return; }

  if (editingId) {
    const t = tasks.find(t => t.id === editingId);
    t.title = title;
    t.desc = $('input-desc').value.trim();
    t.priority = $('input-priority').value;
    t.date = $('input-date').value;
  } else {
    tasks.unshift({
      id: uid(),
      title,
      desc: $('input-desc').value.trim(),
      priority: $('input-priority').value,
      date: $('input-date').value,
      done: false,
      createdAt: new Date().toISOString()
    });
  }
  save(); render(); closeModal();
}

// ─── Filtros ──────────────────────────────────────────────────
const FILTER_TITLES = { all: 'Todas las tareas', pending: 'Pendientes', done: 'Completadas' };

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    $('filter-title').textContent = FILTER_TITLES[currentFilter];
    render();
  });
});

// ─── Modal events ─────────────────────────────────────────────
$('btn-open-modal').addEventListener('click', openNew);
$('btn-cancel').addEventListener('click', closeModal);
$('modal-close').addEventListener('click', closeModal);
$('btn-save').addEventListener('click', saveTask);
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });
$('input-title').addEventListener('keydown', e => { if (e.key === 'Enter') saveTask(); });

// ─── Init ─────────────────────────────────────────────────────
const today = new Date();
$('today-date').textContent = `${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`;

// Tareas de ejemplo si está vacío
if (!tasks.length) {
  tasks = [
    { id: uid(), title: 'Revisar documentación de la API', desc: 'Leer los endpoints de autenticación', priority: 'high', date: new Date(Date.now() + 86400000).toISOString().slice(0,10), done: false, createdAt: new Date().toISOString() },
    { id: uid(), title: 'Diseñar wireframes del dashboard', desc: '', priority: 'medium', date: '', done: false, createdAt: new Date().toISOString() },
    { id: uid(), title: 'Configurar entorno de desarrollo', desc: 'Node.js + Express + SQLite', priority: 'low', date: '', done: true, createdAt: new Date().toISOString() },
  ];
  save();
}

render();
