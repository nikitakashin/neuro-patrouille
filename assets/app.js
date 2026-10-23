(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const TG = 'https://t.me/syamich3912';
  const YT = 'https://www.youtube.com/@privichka_sozdavat';
  const SHOW = 'https://www.youtube.com/playlist?list=PLa-4t4jKv26Y';  // плейлист «Нейропатруль — шоу»
  const V = {
    zbs:  { label: 'ЗБС',        rank: 0, img: 'assets/passed.webp', alt: 'Нейропатруль пройден: ЗБС' },
    fail: { label: 'ОПУЩЕН',     rank: 1, img: 'assets/failed.webp', alt: 'Нейропатруль не пройден: ОПУЩЕН' },
    wip:  { label: 'В процессе', rank: 2 }
  };
  const FILTERS = [['all', 'Все'], ['zbs', 'ЗБС'], ['fail', 'ОПУЩЕН'], ['wip', 'В процессе']];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, r = document) => r.querySelector(s);
  const rows = $('#rows'), live = $('#live');
  let data = [], filter = 'all', query = '', sort = { key: 'date', dir: 'desc' };

  /* ---------- helpers ---------- */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const icon = (id) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  };
  const fmtDate = (iso) => iso ? iso.split('-').reverse().join('.') : '';
  const val = (s, key) => {
    switch (key) {
      case 'name': return s.name.toLowerCase();
      case 'size': return s.size_gb;
      case 'speed': return s.speed_tps;
      case 'verdict': return (V[s.verdict] || V.wip).rank;
      case 'date': return s.tested || '';
    }
  };
  const cmp = (a, b) => {
    const x = val(a, sort.key), y = val(b, sort.key);
    const nx = x == null || x === '', ny = y == null || y === '';
    if (nx || ny) return nx === ny ? 0 : nx ? 1 : -1; // пустые всегда внизу
    const r = x < y ? -1 : x > y ? 1 : 0;
    return sort.dir === 'asc' ? r : -r;
  };

  /* ---------- cells ---------- */
  const cell = (label, ...kids) => {
    const td = el('td');
    td.dataset.l = label;
    if (kids.length === 1 && kids[0].classList.contains('na')) td.className = 'is-na';
    kids.forEach(k => k && td.appendChild(k));
    return td;
  };
  const plain = (text, cls) => {
    if (!text || text === '—') return el('span', 'na', '—');
    return el('span', cls || '', text);
  };

  const verdictNode = (s) => {
    const v = V[s.verdict] || V.wip;
    const box = el('div', 'vcell');
    if (v.img) {
      const img = new Image();
      img.src = v.img; img.alt = v.alt; img.className = 'badge stamp';
      img.width = 360; img.height = 165; img.loading = 'lazy'; img.decoding = 'async';
      box.appendChild(img);
    } else {
      const p = el('span', 'pill-wip stamp');
      p.append(el('i'), document.createTextNode(v.label));
      p.firstChild.setAttribute('aria-hidden', 'true');
      box.appendChild(p);
    }
    return box;
  };

  const buildRow = (s) => {
    const tr = el('tr', s.verdict in V ? s.verdict : 'wip');
    tr.dataset.id = s.id;

    const name = el('div');
    name.append(el('strong', 'name', s.name));
    if (s.vendor) name.append(el('span', 'vendor', s.vendor));
    if (s.version && s.version !== '—') name.append(el('span', 'ver', s.version));
    if (s.tested) name.append(el('span', 'date', 'тест ' + fmtDate(s.tested)));
    const nameTd = el('td'); nameTd.appendChild(name);

    const links = el('div', 'links');
    const ep = document.createElement('a');
    ep.className = 'lnk lnk--yt'; ep.target = '_blank'; ep.rel = 'noopener';
    ep.append(icon('i-yt'), document.createTextNode(s.episode ? 'Смотреть выпуск' : 'Все выпуски'));
    ep.href = s.episode || SHOW;
    ep.setAttribute('aria-label', (s.episode ? 'Смотреть выпуск про ' : 'Все выпуски Нейропатруля, ') + s.name);
    const tg = document.createElement('a');
    tg.className = 'lnk lnk--tg'; tg.href = TG; tg.target = '_blank'; tg.rel = 'noopener';
    tg.append(icon('i-tg'), document.createTextNode('Обсудить'));
    tg.setAttribute('aria-label', 'Обсудить ' + s.name + ' в Telegram');
    links.append(ep, tg);

    const vTd = el('td'); vTd.appendChild(verdictNode(s));
    const cTd = cell('Комментарий', el('span', '', s.comment || ''), links);

    tr.append(
      nameTd,
      cell('Размер', plain(s.size, 'num')),
      cell('Чем запускал', plain(s.runtime)),
      cell('Скорость', plain(s.speed, 'num')),
      cell('Память', plain(s.memory)),
      cell('Что тестировал', plain(s.test)),
      vTd,
      cTd
    );
    return tr;
  };

  /* ---------- stamp on reveal ---------- */
  const io = 'IntersectionObserver' in window && !reduce
    ? new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), 120); io.unobserve(e.target); }
      }), { threshold: .6 })
    : null;
  const reveal = () => rows.querySelectorAll('.stamp:not(.in)').forEach(n => io ? io.observe(n) : n.classList.add('in'));

  /* ---------- render ---------- */
  const visible = () => data
    .filter(s => (filter === 'all' || s.verdict === filter) &&
      (!query || (s.name + ' ' + (s.vendor || '') + ' ' + (s.test || '')).toLowerCase().includes(query)))
    .sort(cmp);

  const render = () => {
    const list = visible();
    rows.replaceChildren(...list.map(buildRow));
    $('#empty').hidden = list.length > 0;
    $('#grid').hidden = list.length === 0;
    live.textContent = 'Показано подопытных: ' + list.length;
    document.querySelectorAll('#grid th[data-key]').forEach(th => {
      th.setAttribute('aria-sort', th.dataset.key === sort.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    $('#sortsel').value = [...$('#sortsel').options].some(o => o.value === sort.key + ':' + sort.dir) ? sort.key + ':' + sort.dir : '';
    reveal();
  };

  const counts = () => {
    const c = { all: data.length, zbs: 0, fail: 0, wip: 0 };
    data.forEach(s => { if (c[s.verdict] != null) c[s.verdict]++; });
    return c;
  };

  const buildChips = () => {
    const c = counts(), box = $('#chips');
    box.replaceChildren(...FILTERS.map(([k, label]) => {
      const b = el('button', 'chip');
      b.type = 'button'; b.dataset.v = k; b.setAttribute('aria-pressed', String(k === filter));
      b.append(document.createTextNode(label), el('i', '', String(c[k])));
      b.addEventListener('click', () => {
        filter = k;
        box.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === k)));
        render();
      });
      return b;
    }));
  };

  const buildStats = () => {
    const c = counts();
    const mk = (cls, n, t) => { const d = el('div', 'stat ' + cls); d.append(el('dt', '', t), el('dd', '', String(n))); return d; };
    $('#stats').replaceChildren(mk('', c.all, 'подопытных'), mk('stat--ok', c.zbs, 'ЗБС'), mk('stat--bad', c.fail, 'ОПУЩЕН'), mk('stat--wip', c.wip, 'в процессе'));
  };

  /* ---------- sorting ---------- */
  const DEFAULT_DIR = { name: 'asc', size: 'asc', speed: 'desc', verdict: 'asc', date: 'desc' };
  document.querySelectorAll('#grid th[data-key] button').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.closest('th').dataset.key;
      sort = { key, dir: sort.key === key ? (sort.dir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR[key] };
      render();
    });
  });
  $('#sortsel').addEventListener('change', (e) => {
    const [key, dir] = e.target.value.split(':');
    if (key) { sort = { key, dir }; render(); }
  });
  let t;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { query = e.target.value.trim().toLowerCase(); render(); }, 120);
  });

  /* ---------- floating buttons ---------- */
  const fab = $('#fab');
  const onScroll = () => fab.classList.toggle('show', window.scrollY > 520);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- load ---------- */
  fetch('data/subjects.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(j => {
      data = (j.subjects || []).filter(s => s && s.name);
      if (j.updated) $('#updated').textContent = 'Обновлено ' + fmtDate(j.updated) + (j.machine ? ' · ' + j.machine : '');
      buildStats(); buildChips(); render();
    })
    .catch(() => { $('#err').hidden = false; $('#grid').hidden = true; });
})();
