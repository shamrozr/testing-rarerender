// Brand Directory SPA — robust brand matching + safe defaults

const STATE = {
  data: null,
  brand: null,
  path: [],
  items: [],
  batchSize: 20,
  rendered: 0,
  hoverTimer: null,
};

const els = {
  grid: document.getElementById('grid'),
  breadcrumb: document.getElementById('breadcrumb'),
  total: document.getElementById('totalProducts'),
  levelCount: document.getElementById('levelCount'),
  brandName: document.getElementById('brandName'),
  brandLogo: document.getElementById('brandLogo'),
  waFab: document.getElementById('whatsAppFab'),
  sentinel: document.getElementById('infiniteSentinel'),
};

const CONFIG = {
  ANALYTICS_PIXEL_URL: '',
  HOVER_PRELOAD_CHILDREN: 8,
  HOVER_DELAY_MS: 300,
};

const waRe = /^https:\/\/wa\.me\/\d+$/;

const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ''); // case/space/hyphen insensitive

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-text', theme.colors.text || '#2C2926');
  root.style.setProperty('--color-bg', theme.colors.bg || '#FEFDFB');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme.colors.bg || '#000');
}

function initialsFor(name) {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || '');
  return (first + last).toUpperCase();
}

async function loadData() {
  // no-store + timestamp to avoid stale cache
  const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data.json');
  const data = await res.json();
  STATE.data = data;

  // figure out which brand to use (case/format-insensitive)
  const brandParamRaw = new URL(window.location.href).searchParams.get('brand') || '';
  const brandSlugs = Object.keys(data.brands);
  const bySlugNorm = {};
  const byNameNorm = {};
  for (const slug of brandSlugs) {
    bySlugNorm[norm(slug)] = slug;
    byNameNorm[norm(data.brands[slug].name)] = slug;
  }
  const wanted = norm(brandParamRaw);
  const resolvedSlug = bySlugNorm[wanted] || byNameNorm[wanted] || brandSlugs[0];

  STATE.brand = resolvedSlug;
  const theme = data.brands[resolvedSlug];

  // Theme + header
  applyTheme(theme);
  els.brandName.textContent = theme.name;
  els.brandLogo.textContent = initialsFor(theme.name);

  // WhatsApp FAB (hide if not present/invalid)
  const validWA = theme.whatsapp && waRe.test(theme.whatsapp);
  els.waFab.style.display = validWA ? 'grid' : 'none';
  if (validWA) els.waFab.href = theme.whatsapp;

  // Total products (from whole catalog)
  els.total.textContent = (data.catalog?.totalProducts || 0).toLocaleString();

  // Start path at default category if valid; else first top-level category; else root
  const topKeys = Object.keys(data.catalog?.tree || {});
  const desiredCat = (theme.defaultCategory || '').toString().toUpperCase();
  const startCat = topKeys.includes(desiredCat) ? desiredCat : (topKeys[0] || '');
  STATE.path = startCat ? [startCat] : [];

  renderPath();
}

function listItemsAtPath(path) {
  let node = STATE.data.catalog.tree;
  for (const segment of path) {
    if (!node[segment]) return [];
    node = node[segment];
  }
  const children = node.children || {};
  const items = [];
  for (const key of Object.keys(children)) {
    const v = children[key];
    items.push({
      key,
      label: key,
      count: v.count || (v.isProduct ? 1 : 0),
      thumbnail: v.thumbnail || '',
      isProduct: !!v.isProduct,
      driveLink: v.driveLink || '',
      hasChildren: !!v.children && Object.keys(v.children).length > 0,
    });
  }
  items.sort((a,b) =>
    (Number(b.hasChildren) - Number(a.hasChildren)) ||
    (b.count - a.count) ||
    a.label.localeCompare(b.label)
  );
  return items;
}

function renderPath() {
  els.grid.setAttribute('aria-busy', 'true');
  els.grid.innerHTML = '';
  STATE.items = listItemsAtPath(STATE.path);
  STATE.rendered = 0;
  els.levelCount.textContent = `${visibleCountText()} in ${STATE.path[STATE.path.length-1] || 'All'}`;
  renderBreadcrumb();
  renderNextBatch();
  setupInfiniteScroll();
}

function visibleCountText() {
  let node = STATE.data.catalog.tree;
  for (const seg of STATE.path) node = node[seg];
  return (node?.count || 0).toLocaleString();
}

function renderNextBatch() {
  const start = STATE.rendered;
  const end = Math.min(start + STATE.batchSize, STATE.items.length);
  for (let i = start; i < end; i++) els.grid.appendChild(cardEl(STATE.items[i]));
  STATE.rendered = end;
  els.grid.setAttribute('aria-busy', 'false');
}

function setupInfiniteScroll() {
  if (STATE.io) STATE.io.disconnect();
  STATE.io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && STATE.rendered < STATE.items.length) renderNextBatch();
    });
  }, { rootMargin: '1200px 0px 800px 0px' });
  STATE.io.observe(els.sentinel);
}

function cardEl(item) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;

  const img = document.createElement('img');
  img.className = 'card-thumb';
  if (item.thumbnail) {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = `${item.label} thumbnail`;
    img.src = item.thumbnail;
  } else {
    img.alt = '';
  }

  const body = document.createElement('div'); body.className = 'card-body';
  const title = document.createElement('h3'); title.className = 'card-title'; title.textContent = item.label;
  const right = document.createElement('div'); right.className = 'card-count'; right.textContent = item.hasChildren ? `${item.count}` : '';

  body.appendChild(title); body.appendChild(right);
  card.appendChild(img); card.appendChild(body);

  const go = () => {
    if (item.isProduct && item.driveLink) {
      trackClick(STATE.brand, [...STATE.path, item.label].join('/'));
      window.location.href = item.driveLink;
    } else {
      STATE.path.push(item.label);
      renderPath();
    }
  };
  card.addEventListener('click', go);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  // Hover prediction (optional)
  card.addEventListener('mouseenter', () => {
    if (!item.hasChildren) return;
    clearTimeout(STATE.hoverTimer);
    STATE.hoverTimer = setTimeout(() => preloadChildrenThumbs([...STATE.path, item.label]), CONFIG.HOVER_DELAY_MS);
  });
  card.addEventListener('mouseleave', () => clearTimeout(STATE.hoverTimer));

  return card;
}

function preloadChildrenThumbs(path) {
  const children = listItemsAtPath(path).slice(0, CONFIG.HOVER_PRELOAD_CHILDREN);
  for (const c of children) {
    if (!c.thumbnail) continue;
    const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = c.thumbnail;
  }
}

function renderBreadcrumb() {
  const parts = STATE.path;
  const frag = document.createDocumentFragment();

  const rootA = document.createElement('a');
  rootA.href = '#'; rootA.textContent = 'All';
  rootA.addEventListener('click', (e) => { e.preventDefault(); STATE.path = []; renderPath(); });
  frag.appendChild(rootA);

  parts.forEach((p, idx) => {
    const isLast = idx === parts.length - 1;
    const el = document.createElement(isLast ? 'span' : 'a');
    el.textContent = p;
    if (isLast) el.className = 'current';
    else { el.href = '#'; el.addEventListener('click', (e) => { e.preventDefault(); STATE.path = parts.slice(0, idx + 1); renderPath(); }); }
    frag.appendChild(el);
  });

  els.breadcrumb.innerHTML = '';
  els.breadcrumb.appendChild(frag);
}

function trackClick(slug, productPath) {
  if (!CONFIG.ANALYTICS_PIXEL_URL) return;
  const u = new URL(CONFIG.ANALYTICS_PIXEL_URL);
  u.searchParams.set('d', new Date().toISOString().slice(0,10));
  u.searchParams.set('slug', slug);
  u.searchParams.set('product_path', productPath);
  u.searchParams.set('r', Math.random().toString(36).slice(2));
  const img = document.createElement('img');
  img.src = u.toString(); img.alt = ''; img.width = img.height = 1;
  img.style.position = 'absolute'; img.style.opacity = '0';
  document.body.appendChild(img); setTimeout(() => img.remove(), 2000);
}

loadData().catch(err => {
  console.error(err);
  els.grid.innerHTML = `<p>Failed to load catalog. Please try again later.</p>`;
});
