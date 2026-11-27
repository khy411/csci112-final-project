/* Frontend for the patient results portal. Requires src/api.js to load first.
   All data comes from the backend; nothing is hard-coded here. */
if (typeof document !== 'undefined') (function () {
  const API = window.PortalAPI;
  // API.configure({ baseUrl: 'https://your-backend.example.com/api' }); // if not served from the same origin

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const TABS = [['home', 'Home'], ['results', 'Results'], ['history', 'History'], ['notifs', 'Notifications'], ['settings', 'Settings']];

  const state = { tab: 'home', detail: null, from: '', to: '', type: '', abnormal: false, unread: 0, testTypes: [] };
  let token = 0; // ignores responses that arrive after the user has navigated elsewhere

  const tags = (tests) => tests.map((x) => `<span class="tag ${x.is_abnormal ? 'ab' : ''}">${esc(x.test_type)}${x.is_abnormal ? ' ⚠' : ''}</span>`).join('');
  const reportCard = (r) => `<div class="card"><div class="row"><div><strong>${esc(r.report_id)}</strong>
    <div class="mut">Published ${fmt(r.date_published)}</div></div>
    <button class="btn" data-open="${esc(r.report_id)}">Open</button></div><div>${tags(r.tests_performed || [])}</div></div>`;
  const empty = (msg) => `<div class="card mut">${msg}</div>`;

  function renderNav() {
    $('nav').innerHTML = TABS.map(([k, l]) =>
      `<button class="${state.tab === k && !state.detail ? 'on' : ''}" data-tab="${k}">${l}${k === 'notifs' && state.unread ? `<span class="badge">${state.unread}</span>` : ''}</button>`).join('');
  }

  const setView = (html) => { $('view').innerHTML = html; };
  const showError = (e) => setView(`<div class="card err"><strong>Something went wrong.</strong><div class="mut">${esc(e.message)}</div><button class="btn" data-retry style="margin-top:8px">Try again</button></div>`);

  /* ---------- views (each fetches its own data) ---------- */
  async function viewHome() {
    const reports = await API.getLatestReports(10);
    return '<h2>Latest results</h2>' + (reports.length ? reports.map(reportCard).join('') : empty('No results yet.'));
  }

  function resultsFilters() {
    return `<div class="filters">
      <label>From<input type="date" id="f-from" value="${state.from}"></label>
      <label>To<input type="date" id="f-to" value="${state.to}"></label>
      <label>Test type<select id="f-type"><option value="">All</option>${state.testTypes.map((x) => `<option ${state.type === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="f-ab" ${state.abnormal ? 'checked' : ''}>Abnormal only</label></div>`;
  }

  async function viewResults() {
    if (!state.testTypes.length) state.testTypes = await API.getTestTypes();
    // from is inclusive, to is exclusive: send the start of the day after the chosen "To" date
    const from = state.from ? state.from + 'T00:00:00Z' : undefined;
    let to;
    if (state.to) { const d = new Date(state.to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); to = d.toISOString(); }
    const list = await API.getReports({ from, to, testTypes: state.type ? [state.type] : [], abnormal: state.abnormal });
    return resultsFilters() + (list.length ? list.map(reportCard).join('') : empty('No results match.'));
  }

  async function viewHistory() {
    const h = await API.getDiagnosticHistory();
    if (!h.length) return empty('No diagnostic history yet.');
    return h.map((v) => `<div class="card"><div class="row"><strong>Visit · ${fmt(v.date_published)}</strong>
      <span class="mut">${v.report_accessed ? 'Viewed' : 'Not yet viewed'}</span></div>
      ${(v.tests_performed || []).map((x) => `<div class="mut">${esc(x.test_type)} · performed ${fmt(x.date_performed)} ${x.is_abnormal ? '⚠ abnormal' : ''}</div>`).join('')}
      <button class="btn" data-open="${esc(v.report_id)}" style="margin-top:6px">Open report</button></div>`).join('');
  }

  async function viewNotifs() {
    const { items, unread_count } = await API.getNotifications();
    state.unread = unread_count; renderNav();
    if (!items.length) return empty('No notifications.');
    return `<div class="mut" style="margin-bottom:8px">${unread_count} unread</div>` +
      items.map((x) => `<div class="card ${x.status !== 'viewed' ? 'unread' : ''}"><div class="row"><div>${esc(x.message)}<div class="mut">${fmt(x.timestamp)}</div></div>
      ${x.status !== 'viewed' ? `<button class="btn" data-read="${esc(x.notification_id)}">Mark as read</button>` : '<span class="mut">Read</span>'}</div></div>`).join('');
  }

  async function viewSettings() {
    const p = await API.getPatient();
    return `<div class="card"><strong>Notify me by</strong><div style="margin-top:8px">
      ${['email', 'sms'].map((m) => `<label style="margin-right:14px"><input type="radio" name="nm" value="${m}" ${p.notification_method === m ? 'checked' : ''}> ${m.toUpperCase()}</label>`).join('')}</div>
      <div class="mut" id="nm-status" style="margin-top:6px"></div></div>`;
  }

  async function viewDetail() {
    const r = state.detail;
    return `<button class="btn" data-back>← Back</button>
      <h2>${esc(r.report_id)} <span class="mut">· ${fmt(r.date_published)}</span></h2>` +
      (r.tests_performed || []).map((x) => `<div class="card"><div class="row"><strong>${esc(x.test_type)}</strong>
        <span class="tag ${x.is_abnormal ? 'ab' : ''}">${x.is_abnormal ? 'Abnormal' : 'Normal'}</span></div>
        <div class="mut">Performed ${fmt(x.date_performed)}</div>
        <div class="scroll"><table><tr><th>Test</th><th>Value</th><th>Reference</th><th>Flag</th></tr>
        ${(x.results || []).map((q) => `<tr><td>${esc(q.name)}</td><td>${esc(q.value)} ${esc(q.unit)}</td><td>${esc(q.ref)}</td><td>${esc(q.flag || '')}</td></tr>`).join('')}</table></div></div>`).join('') +
      `<button class="btn" id="dl">Download JSON</button>`;
  }

  const VIEWS = { home: viewHome, results: viewResults, history: viewHistory, notifs: viewNotifs, settings: viewSettings };

  async function render() {
    const my = ++token;
    renderNav();
    setView('<div class="mut">Loading…</div>');
    try {
      const html = await (state.detail ? viewDetail() : VIEWS[state.tab]());
      if (my === token) setView(html);
    } catch (e) {
      if (my === token) showError(e);
    }
  }

  async function openReport(id) {
    const my = ++token;
    setView('<div class="mut">Loading…</div>');
    try {
      const r = await API.getReportDetail(id);
      if (my !== token) return;
      state.detail = r; render();
    } catch (e) { if (my === token) showError(e); }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { state.tab = b.dataset.tab; state.detail = null; render(); }
    else if (b.dataset.open) openReport(b.dataset.open);
    else if (b.hasAttribute('data-back')) { state.detail = null; render(); }
    else if (b.hasAttribute('data-retry')) render();
    else if (b.dataset.read) {
      b.disabled = true;
      try { await API.markNotificationRead(b.dataset.read); render(); } catch (err) { b.disabled = false; showError(err); }
    } else if (b.id === 'dl') {
      const blob = new Blob([JSON.stringify(state.detail, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = state.detail.report_id + '.json'; a.click();
      URL.revokeObjectURL(a.href);
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'f-from') state.from = el.value;
    else if (el.id === 'f-to') state.to = el.value;
    else if (el.id === 'f-type') state.type = el.value;
    else if (el.id === 'f-ab') state.abnormal = el.checked;
    else if (el.name === 'nm') {
      const s = $('nm-status'); if (s) s.textContent = 'Saving…';
      try { await API.setNotificationMethod(el.value); if (s) s.textContent = 'Saved.'; }
      catch (err) { if (s) s.textContent = 'Could not save: ' + err.message; }
      return;
    } else return;
    render();
  });

  // initial load: draw the unread badge, then the home view
  API.getNotifications().then((n) => { state.unread = n.unread_count; renderNav(); }).catch(() => {});
  render();
})();
