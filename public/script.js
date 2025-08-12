// Brand Directory SPA — nav-first revamp with TopOrder + deep links

const STATE = {
  data: null,
  brand: null,
  path: [],          // array of labels, e.g., ['BAGS','GUCCI']
  items: [],
  batchSize: 20,
  rendered: 0,
  hoverTimer: null,
  isPop: false,      // guard to avoid pushState loops
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
const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-text', theme.colors.text || '#2C2926');
  root.style.setProperty('--color-bg', theme.colors.bg || '#FEFDFB');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme.colors.bg || '#000');
}
function initialsFor(name) {
  const p = (name || '').split(/\s+/).filter(Boolean);
  const a = p[0]?.[0] || '', b = p.length > 1 ? p[p.length-1][0] : (p[0]?.[1] || '');
  return (a + b).toUpperCase();
}

function resolveBrandSlug(brands, raw) {
  const slugs = Object.keys(brands);
  if (!raw) return slugs[0];
  const target = norm(raw);
  const bySlug = {}, byName = {};
  for (const s of slugs) { bySlug[norm(s)] = s; byName[norm(brands[s].name)] = s; }
  return bySlug[target] || byName[target] || slugs[0];
}

function resolvePathFromParam(tree, rawPath) {
  if (!rawPath) return [];
  const parts = rawPath.replace(/\\/g,'/').split('/').filter(Boolean);
  let node = tree, acc = [];
  for (let i=0;i<parts.length;i++) {
    const wanted = norm(i===0 ? parts[i].toUpperCase() : parts[i]);
    const keys = Object.keys(node);
    let hit = null;
    for (const k of keys) {
      if (norm(k) === wanted) { hit = k; break; }
    }
    if (!hit) break;
    acc.push(hit);
    const n = node[hit];
    if (n?.children) node = n.children; else break;
  }
  return acc;
}

function getNode(tree, path) {
  let node = tree;
  for (const seg of path) {
    if (!node[seg]) return null;
    node = node[seg];
    if (!node) return null;
    if (node.children) node = node; // keep object
  }
  return node; // node object with {children?, isProduct?}
}

async function loadData() {
  const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data.json');
  const data = await res.json();
  STATE.data = data;

  // brand
  const u = new URL(location.href);
  const brandRaw = u.searchParams.get('brand') || '';
  const slug = resolveBrandSlug(data.brands, brandRaw);
  STATE.brand = slug;
  const theme = data.brands[slug];

  // header
  applyTheme(theme);
  els.brandName.textContent = theme.name;
  els.brandLogo.textContent = initialsFor(theme.name);
  const validWA = theme.whatsapp && waRe.test(theme.whatsapp);
  els.waFab.style.display = validWA ? 'grid' : 'none';
  if (validWA) els.waFab.href = theme.whatsapp;

  // totals
  els.total.textContent = (data.catalog?.totalProducts || 0).toLocaleString();

  // path from URL (preferred). If invalid/empty → root.
  const pathParam = u.searchParams.get('path') || '';
  const startPath = resolvePathFromParam(data.catalog.tree, pathParam);
  STATE.path = startPath;

  renderPath();
}

function listItemsAtPath(path) {
  // Walk to the node for the current path
  let node = STATE.data.catalog.tree;
  for (const segment of path) {
    if (!node[segment]) return [];
    node = node[segment];
  }

  const isRoot = path.length === 0;
  // At root, the container is the tree object itself
  const container = isRoot ? node : (node.children || {});
  const items = [];

  for (const key of Object.keys(container)) {
    const v = container[key];
    items.push({
      key,
      label: key,
      count: v.count || (v.isProduct ? 1 : 0),
      thumbnail: v.thumbnail || '',
      isProduct: !!v.isProduct,
      driveLink: v.driveLink || '',
      hasChildren: !!v.children && Object.keys(v.children).length > 0,
      // used only at root
      topOrder: typeof v.topOrder !== 'undefined' ? v.topOrder : Number.POSITIVE_INFINITY,
    });
  }

  // Sort: root uses TopOrder; deeper levels use folder-first -> count -> A→Z
  if (isRoot) {
    items.sort((a,b) =>
      (a.topOrder - b.topOrder) ||
      (b.count - a.count) ||
      a.label.localeCompare(b.label)
    );
  } else {
    items.sort((a,b) =>
      (Number(b.hasChildren) - Number(a.hasChildren)) ||
      (b.count - a.count) ||
      a.label.localeCompare(b.label)
    );
  }
  return items;
}


function updateURL() {
  if (STATE.isPop) return; // don't push during popstate
  const params = new URLSearchParams(location.search);
  params.set('brand', STATE.brand);
  if (STATE.path.length) params.set('path', STATE.path.join('/'));
  else params.delete('path');
  history.pushState({ path: STATE.path }, '', `${location.pathname}?${params.toString()}`);
}

function renderPath() {
  els.grid.setAttribute('aria-busy', 'true');
  els.grid.innerHTML = '';
  STATE.items = listItemsAtPath(STATE.path);
  STATE.rendered = 0;

  const label = STATE.path.length ? STATE.path[STATE.path.length-1] : 'All';
  els.levelCount.textContent = `${visibleCountText()} in ${label}`;
  renderBreadcrumb();
  renderNextBatch();
  setupInfiniteScroll();
  updateURL();
}
function visibleCountText() {
  const tree = STATE.data.catalog.tree;
  if (STATE.path.length === 0) {
    let sum = 0;
    for (const k of Object.keys(tree)) sum += (tree[k]?.count || 0);
    return sum.toLocaleString();
  }
  let node = tree;
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
  if (item.thumbnail) { img.loading = 'lazy'; img.decoding = 'async'; img.alt = `${item.label} thumbnail`; img.src = item.thumbnail; }
  else { img.alt = ''; }

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
      STATE.path = [...STATE.path, item.label];
      renderPath();
    }
  };
  card.addEventListener('click', go);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  // Hover prediction
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
  for (const c of children) { if (!c.thumbnail) continue; const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = c.thumbnail; }
}

function renderBreadcrumb() {
  const frag = document.createDocumentFragment();

  const home = document.createElement('a');
  home.href = '#'; home.textContent = 'Home';
  home.addEventListener('click', (e) => { e.preventDefault(); STATE.path = []; renderPath(); });
  frag.appendChild(home);

  STATE.path.forEach((p, idx) => {
    const last = idx === STATE.path.length - 1;
    const el = document.createElement(last ? 'span' : 'a');
    el.textContent = p;
    if (!last) {
      el.href = '#';
      el.addEventListener('click', (e) => { e.preventDefault(); STATE.path = STATE.path.slice(0, idx + 1); renderPath(); });
    } else {
      el.className = 'current';
    }
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

window.addEventListener('popstate', () => {
  STATE.isPop = true;
  const u = new URL(location.href);
  const pathParam = u.searchParams.get('path') || '';
  STATE.path = resolvePathFromParam(STATE.data.catalog.tree, pathParam);
  renderPath();
  STATE.isPop = false;
});

loadData().catch(err => {
  console.error(err);
  els.grid.innerHTML = `<p>Failed to load catalog. Please try again later.</p>`;
});
