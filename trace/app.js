/* ============================================================
   Trace — habit tracker
   ------------------------------------------------------------
   Everything lives in this single file. No framework, no build
   step. The file is organized top-to-bottom as:

     1. Constants + seed data
     2. State load/save (localStorage)
     3. Date + streak helpers
     4. Rendering (home / habits / edit screens)
     5. Event wiring
     6. Notification scheduling
     7. PWA bootstrap (service worker)

   The render functions are intentionally re-run from scratch
   on every state change. The DOM is tiny so this is cheap and
   keeps the code easy to reason about.
   ============================================================ */

(() => {
  'use strict';

  /* ---------- 1. Constants + seed data ---------- */

  const STORAGE_KEY = 'trace-data';
  const TIMES = ['morning', 'afternoon', 'evening'];

  // Used on first run. Order here is the visual order within each section.
  const SEED_HABITS = [
    { name: 'No phone first 30 min after waking',            timeOfDay: 'morning'   },
    { name: 'Stretch + wrist rehab (15 min)',                timeOfDay: 'morning'   },
    { name: 'Journal',                                       timeOfDay: 'morning'   },
    { name: 'Read for 30 min',                               timeOfDay: 'morning'   },
    { name: 'Big breakfast (700+ cal, 35g+ protein)',        timeOfDay: 'morning'   },
    { name: 'Creatine — 5g',                                 timeOfDay: 'morning'   },
    { name: 'Whey protein — 1 scoop in shake',               timeOfDay: 'morning'   },
    { name: 'Vitamin D3 + K2 — 2,000–5,000 IU D3 + 100–200 mcg K2', timeOfDay: 'morning' },
    { name: 'Left-hand writing (5 min)',                     timeOfDay: 'afternoon' },
    { name: 'Left hand for daily tasks (phone, mouse, one meal)', timeOfDay: 'afternoon' },
    { name: '30 min on Seed Swipe',                          timeOfDay: 'afternoon' },
    { name: 'Zinc — 15–30 mg (with dinner)',                 timeOfDay: 'evening'   },
    { name: 'Magnesium glycinate — 200–400 mg (1–2 hr before bed)', timeOfDay: 'evening' },
    { name: 'In bed by 11pm',                                timeOfDay: 'evening'   },
  ];

  // One-shot migrations for installs that already have data. Each entry
  // is keyed by a string; once applied the key is recorded in
  // state.appliedMigrations so it never runs again — that means if you
  // later delete a habit we added here, it stays deleted.
  const MIGRATIONS = [
    {
      key: 'supplements-2026-05',
      add: [
        { name: 'Creatine — 5g',                                       timeOfDay: 'morning' },
        { name: 'Whey protein — 1 scoop in shake',                     timeOfDay: 'morning' },
        { name: 'Vitamin D3 + K2 — 2,000–5,000 IU D3 + 100–200 mcg K2', timeOfDay: 'morning' },
        { name: 'Zinc — 15–30 mg (with dinner)',                        timeOfDay: 'evening' },
        { name: 'Magnesium glycinate — 200–400 mg (1–2 hr before bed)', timeOfDay: 'evening' },
      ],
    },
  ];

  /* ---------- 2. State ---------- */

  /**
   * Shape:
   *   {
   *     habits: [{ id, name, timeOfDay, createdAt }],
   *     completions: { "YYYY-MM-DD": [habitId, ...] },
   *     settings: { notificationsEnabled: bool },
   *     lastOpenedDate: "YYYY-MM-DD"   // used to detect day change
   *   }
   */
  let state = loadState();

  function defaultState() {
    const now = new Date().toISOString();
    return {
      habits: SEED_HABITS.map((h, i) => ({
        id: cryptoId(),
        name: h.name,
        timeOfDay: h.timeOfDay,
        // Stagger createdAt by milliseconds so the seed order is preserved
        // when we later sort by createdAt.
        createdAt: new Date(Date.now() + i).toISOString(),
      })),
      completions: {},
      settings: { notificationsEnabled: false },
      lastOpenedDate: todayKey(),
      // Fresh installs already include every migration's habits via the
      // seed list, so mark them all as applied to skip the no-op pass.
      appliedMigrations: MIGRATIONS.map((m) => m.key),
    };
  }

  // Walk the migrations list and apply anything new. A migration only
  // adds habits whose names don't already exist, so re-imports and
  // partially-manual setups don't end up with duplicates.
  function runMigrations() {
    if (!Array.isArray(state.appliedMigrations)) state.appliedMigrations = [];
    let dirty = false;
    MIGRATIONS.forEach((m) => {
      if (state.appliedMigrations.includes(m.key)) return;
      const existing = new Set(state.habits.map((h) => h.name));
      m.add.forEach((h, i) => {
        if (existing.has(h.name)) return;
        state.habits.push({
          id: cryptoId(),
          name: h.name,
          timeOfDay: h.timeOfDay,
          // Offset by ms so the migration order is preserved within a section.
          createdAt: new Date(Date.now() + i).toISOString(),
        });
      });
      state.appliedMigrations.push(m.key);
      dirty = true;
    });
    if (dirty) saveState();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Light-touch migration: fill in any missing top-level keys so
      // older payloads keep working as the schema grows.
      return {
        habits: Array.isArray(parsed.habits) ? parsed.habits : [],
        completions: parsed.completions && typeof parsed.completions === 'object' ? parsed.completions : {},
        settings: Object.assign({ notificationsEnabled: false }, parsed.settings || {}),
        lastOpenedDate: parsed.lastOpenedDate || todayKey(),
        appliedMigrations: Array.isArray(parsed.appliedMigrations) ? parsed.appliedMigrations : [],
      };
    } catch (err) {
      console.warn('Trace: failed to read localStorage, starting fresh.', err);
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Trace: failed to write localStorage.', err);
    }
  }

  // Prefer crypto.randomUUID when available; fall back to a short random id.
  function cryptoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'h_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  /* ---------- 3. Date + streak helpers ---------- */

  // Local-time YYYY-MM-DD. We intentionally do NOT use toISOString()
  // because that converts to UTC and would roll the date at the wrong
  // moment for users east/west of GMT.
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function todayKey() { return dateKey(new Date()); }

  function formatDateLine(d) {
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}`.toUpperCase();
  }

  // Streak = number of consecutive days, ending today (or yesterday if
  // today isn't done yet), where the habit was completed. We walk
  // backwards from today; if today is incomplete we start at yesterday
  // so a streak doesn't visually disappear just because it's 8am.
  function streakForHabit(habitId) {
    const completions = state.completions;
    const today = new Date();
    let cursor = new Date(today);

    const isDone = (d) => (completions[dateKey(d)] || []).includes(habitId);

    if (!isDone(cursor)) {
      // Step back one day before counting so an unchecked "today"
      // doesn't break a real streak that ended yesterday.
      cursor.setDate(cursor.getDate() - 1);
    }
    let count = 0;
    while (isDone(cursor)) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function isCompletedToday(habitId) {
    return (state.completions[todayKey()] || []).includes(habitId);
  }

  function toggleCompletion(habitId) {
    const key = todayKey();
    const list = state.completions[key] || [];
    const idx = list.indexOf(habitId);
    if (idx === -1) list.push(habitId);
    else list.splice(idx, 1);
    state.completions[key] = list;
    saveState();
  }

  /* ---------- 4. Rendering ---------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function showScreen(name) {
    ['home', 'habits', 'edit'].forEach((s) => {
      const el = document.getElementById('screen-' + s);
      if (!el) return;
      el.hidden = (s !== name);
    });
    // Scroll to top on transitions so the new screen feels fresh.
    window.scrollTo(0, 0);
  }

  function habitsByTime(time) {
    return state.habits
      .filter((h) => h.timeOfDay === time)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  function renderHome() {
    const now = new Date();
    $('#date-line').textContent = formatDateLine(now);

    const total = state.habits.length;
    const done = state.habits.reduce((n, h) => n + (isCompletedToday(h.id) ? 1 : 0), 0);
    $('#completion-done').textContent = String(done);
    $('#completion-total').textContent = '/ ' + total;

    TIMES.forEach((time) => {
      const container = document.getElementById('list-' + time);
      container.innerHTML = '';
      const list = habitsByTime(time);
      if (list.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-note';
        p.textContent = '—';
        container.appendChild(p);
        return;
      }
      list.forEach((h) => container.appendChild(buildHabitRow(h)));
    });
  }

  function buildHabitRow(habit) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'habit-row';
    row.dataset.habitId = habit.id;
    if (isCompletedToday(habit.id)) row.classList.add('is-done');

    // Check circle. The tick is drawn inside the same SVG and
    // animated via stroke-dashoffset (see style.css).
    const checkWrap = document.createElement('span');
    checkWrap.className = 'check';
    checkWrap.innerHTML =
      '<svg viewBox="0 0 22 22" aria-hidden="true">' +
        '<circle class="ring" cx="11" cy="11" r="10"/>' +
        '<polyline class="tick" points="6,11.5 9.5,15 16,8.5"/>' +
      '</svg>';
    row.appendChild(checkWrap);

    const name = document.createElement('span');
    name.className = 'habit-name';
    name.textContent = habit.name;
    row.appendChild(name);

    const streak = streakForHabit(habit.id);
    const streakEl = document.createElement('span');
    streakEl.className = 'habit-streak';
    // Only render the streak number when it's at least 2 — single days
    // don't deserve attention yet, per the spec.
    streakEl.textContent = streak >= 2 ? String(streak) : '';
    row.appendChild(streakEl);

    row.addEventListener('click', () => {
      toggleCompletion(habit.id);
      // Update just this row's classes for the 200ms transition,
      // then re-render the rest of the screen on the next frame
      // so the completion count + streaks stay in sync.
      row.classList.toggle('is-done');
      requestAnimationFrame(renderHome);
    });

    return row;
  }

  function renderHabitsScreen() {
    TIMES.forEach((time) => {
      const container = document.getElementById('manage-' + time);
      container.innerHTML = '';
      const list = habitsByTime(time);
      if (list.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-note';
        p.textContent = '—';
        container.appendChild(p);
        return;
      }
      list.forEach((h) => container.appendChild(buildManageRow(h)));
    });
    $('#toggle-notifications').checked = !!state.settings.notificationsEnabled;
  }

  function buildManageRow(habit) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'manage-row';
    row.dataset.habitId = habit.id;

    const name = document.createElement('span');
    name.className = 'habit-name';
    name.textContent = habit.name;
    row.appendChild(name);

    const tag = document.createElement('span');
    tag.className = 'time-tag';
    tag.textContent = habit.timeOfDay;
    row.appendChild(tag);

    row.addEventListener('click', () => openEdit(habit.id));
    return row;
  }

  /* ---------- Edit screen ---------- */

  let editingId = null; // null = new habit, string = editing existing
  let editingTime = 'morning';

  function openEdit(habitId) {
    editingId = habitId || null;
    const habit = habitId ? state.habits.find((h) => h.id === habitId) : null;
    editingTime = habit ? habit.timeOfDay : 'morning';

    $('#edit-title').textContent = habit ? 'Edit habit' : 'New habit';
    $('#habit-name').value = habit ? habit.name : '';
    $('#delete-habit').hidden = !habit;

    $$('.seg').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.time === editingTime);
      b.setAttribute('aria-checked', b.dataset.time === editingTime ? 'true' : 'false');
    });

    showScreen('edit');
    // Tiny delay so the focus call happens after the screen swap on iOS.
    setTimeout(() => $('#habit-name').focus(), 50);
  }

  function saveEdit(e) {
    e.preventDefault();
    const name = $('#habit-name').value.trim();
    if (!name) return; // silently no-op on empty name
    if (editingId) {
      const habit = state.habits.find((h) => h.id === editingId);
      if (habit) { habit.name = name; habit.timeOfDay = editingTime; }
    } else {
      state.habits.push({
        id: cryptoId(),
        name,
        timeOfDay: editingTime,
        createdAt: new Date().toISOString(),
      });
    }
    saveState();
    renderHabitsScreen();
    renderHome();
    showScreen('habits');
  }

  function deleteHabit() {
    if (!editingId) return;
    if (!confirm('Delete this habit? Streak history will be lost.')) return;
    state.habits = state.habits.filter((h) => h.id !== editingId);
    // Also strip the habit id from any completion arrays so streak
    // calculations stay accurate and storage stays small.
    Object.keys(state.completions).forEach((day) => {
      state.completions[day] = (state.completions[day] || []).filter((id) => id !== editingId);
    });
    saveState();
    renderHabitsScreen();
    renderHome();
    showScreen('habits');
  }

  /* ---------- 5. Event wiring ---------- */

  function wire() {
    $('#open-habits').addEventListener('click', () => {
      renderHabitsScreen();
      showScreen('habits');
    });

    // Both back buttons share the same handler. The edit screen goes
    // back to habits; the habits screen goes back to home.
    $$('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const screen = btn.closest('.screen').dataset.screen;
        if (screen === 'edit') showScreen('habits');
        else showScreen('home');
      });
    });

    $('#add-habit').addEventListener('click', () => openEdit(null));

    $$('.seg').forEach((seg) => {
      seg.addEventListener('click', () => {
        editingTime = seg.dataset.time;
        $$('.seg').forEach((b) => {
          b.classList.toggle('is-active', b === seg);
          b.setAttribute('aria-checked', b === seg ? 'true' : 'false');
        });
      });
    });

    $('#edit-form').addEventListener('submit', saveEdit);
    $('#delete-habit').addEventListener('click', deleteHabit);

    $('#toggle-notifications').addEventListener('change', async (e) => {
      const wantOn = e.target.checked;
      if (wantOn) {
        const granted = await ensureNotificationPermission();
        state.settings.notificationsEnabled = granted;
        e.target.checked = granted;
      } else {
        state.settings.notificationsEnabled = false;
      }
      saveState();
      scheduleNotifications();
    });

    $('#reset-data').addEventListener('click', () => {
      if (!confirm('Reset all habits, completions, and settings? This cannot be undone.')) return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      saveState();
      renderHabitsScreen();
      renderHome();
      showScreen('home');
    });

    // Detect day rollover when the tab is re-foregrounded. Cheap and
    // covers the most common case (phone left open overnight).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (state.lastOpenedDate !== todayKey()) {
        state.lastOpenedDate = todayKey();
        saveState();
      }
      renderHome();
    });
  }

  /* ---------- 6. Notifications ---------- */

  // We don't have a real backend, so we "schedule" by setting timeouts
  // for the next 8:00 AM and 9:30 PM in local time. They only fire while
  // the page is open, which is a known limitation for vanilla PWAs on
  // iOS — see README for details.
  let notifTimers = [];

  function clearNotifTimers() {
    notifTimers.forEach((t) => clearTimeout(t));
    notifTimers = [];
  }

  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;
    try {
      const p = await Notification.requestPermission();
      return p === 'granted';
    } catch {
      return false;
    }
  }

  function nextOccurrence(hour, minute) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime() - now.getTime();
  }

  function scheduleNotifications() {
    clearNotifTimers();
    if (!state.settings.notificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const fire = (title, body, hour, minute) => {
      const ms = nextOccurrence(hour, minute);
      const t = setTimeout(() => {
        try { new Notification(title, { body, icon: 'icon-192.png' }); } catch {}
        // Reschedule for the following day.
        scheduleNotifications();
      }, ms);
      notifTimers.push(t);
    };

    fire('Trace', 'Start the day', 8, 0);
    fire('Trace', 'Check in',      21, 30);
  }

  /* ---------- 7. Boot ---------- */

  function init() {
    runMigrations();

    // First-run permission prompt: ask once. If granted we flip the
    // setting on automatically so the toggle reflects reality.
    if ('Notification' in window && Notification.permission === 'default'
        && !localStorage.getItem('trace-perm-asked')) {
      localStorage.setItem('trace-perm-asked', '1');
      Notification.requestPermission().then((p) => {
        if (p === 'granted') {
          state.settings.notificationsEnabled = true;
          saveState();
          scheduleNotifications();
        }
      }).catch(() => {});
    }

    wire();
    renderHome();
    scheduleNotifications();

    // Service worker registration is best-effort; the app works without.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
