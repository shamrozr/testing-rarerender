// Brand Directory SPA — vanilla JS (no frameworks)
// Requirements covered: brand theming, dynamic counts, progressive loading, hover prediction, WhatsApp FAB, breadcrumb

const STATE = {
  data: null,
  brand: null,
  path: [], // e.g., ['BAGS', 'GUCCI']
  items: [], // current level items (categories or products)
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
  // Optional: Set to your Worker pixel endpoint (e.g., https://pixels.yourdomain.workers.dev/p)
  ANALYTICS_PIXEL_URL: '',
  HOVER_PRELOAD_CHILDREN: 8,
  HOVER_DELAY_MS: 300,
};

function getQueryBrand(defaultSlug) {
  const url = new URL(window.location.href);
  const slug = url.searchParams.get('brand');
  return slug || defaultSlug;
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-text', theme.colors.text || '#2C2926');
  root.style.setProperty('--color-bg', theme.colors.bg || '#FEFDFB');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme.colors.bg || '#000');
}

function initialsFor(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || '');
  return (first + last).toUpperCase();
}

async function loadData() {
  const res = await fetch('/data.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data.json');
  const data = await res.json();
  STATE.data = data;

  const brandSlugs = Object.keys(data.brands);
  const chosen = getQueryBrand(brandSlugs[0]);
  STATE.brand = data.brands[chosen] ? chosen : brandSlugs[0];
  const theme = data.brands[STATE.brand];

  // Theming & brand meta
applyTheme(theme);
els.brandName.textContent = theme.name;
els.brandLogo.textContent = initialsFor(theme.name);

// Show/hide WhatsApp FAB depending on data
const validWA = theme.whatsapp && /^https:\/\/wa\.me\/\d+$/.test(theme.whatsapp);
if (validWA) {
  els.waFab.href = theme.whatsapp;
  els.waFab.style.display = 'grid';
} else {
  els.waFab.style.display = 'none';
}

function listItemsAtPath(path) {
  // Returns array of { key, label, count, thumbnail, isProduct, driveLink, hasChildren }
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
  // Sort by: folders first (desc count), then products by label
  items.sort((a,b) => (Number(b.hasChildren) - Number(a.hasChildren)) || (b.count - a.count) || a.label.localeCompare(b.label));
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
  // Count products under current node
  let node = STATE.data.catalog.tree;
  for (const seg of STATE.path) node = node[seg];
  return (node?.count || 0).toLocaleString();
}

function renderNextBatch() {
  const start = STATE.rendered;
  const end = Math.min(start + STATE.batchSize, STATE.items.length);
  for (let i = start; i < end; i++) {
    const item = STATE.items[i];
    els.grid.appendChild(cardEl(item));
  }
  STATE.rendered = end;
  els.grid.setAttribute('aria-busy', 'false');
}

function setupInfiniteScroll() {
  if (STATE.io) STATE.io.disconnect();
  STATE.io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        if (STATE.rendered < STATE.items.length) {
          renderNextBatch();
        }
      }
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

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = item.label;

  const right = document.createElement('div');
  right.className = 'card-count';
  right.textContent = item.hasChildren ? `${item.count}` : '';

  body.appendChild(title);
  body.appendChild(right);

  card.appendChild(img);
  card.appendChild(body);

  const go = () => {
    if (item.isProduct && item.driveLink) {
      trackClick(STATE.brand, [...STATE.path, item.label].join('/'));
      window.location.href = item.driveLink;
    } else if (!item.isProduct && !item.hasChildren && item.driveLink) {
      // empty folder that carries a drive link → open it
      trackClick(STATE.brand, [...STATE.path, item.label].join('/'));
      window.location.href = item.driveLink;
    } else {
      STATE.path.push(item.label);
      renderPath();
    }
  };

  card.addEventListener('click', go);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  // Hover prediction: preload next level images
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
    const i = new Image();
    i.referrerPolicy = 'no-referrer';
    i.src = c.thumbnail;
  }
}

function renderBreadcrumb() {
  const parts = STATE.path;
  const frag = document.createDocumentFragment();

  // root
  const rootA = document.createElement('a');
  rootA.href = '#';
  rootA.textContent = 'All';
  rootA.addEventListener('click', (e) => { e.preventDefault(); STATE.path = []; renderPath(); });
  frag.appendChild(rootA);

  parts.forEach((p, idx) => {
    const isLast = idx === parts.length - 1;
    const el = document.createElement(isLast ? 'span' : 'a');
    el.textContent = p;
    if (isLast) {
      el.className = 'current';
    } else {
      el.href = '#';
      el.addEventListener('click', (e) => { e.preventDefault(); STATE.path = parts.slice(0, idx + 1); renderPath(); });
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
  img.src = u.toString();
  img.alt = '';
  img.width = img.height = 1;
  img.style.position = 'absolute';
  img.style.opacity = '0';
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 2000);
}

loadData().catch(err => {
  console.error(err);
  els.grid.innerHTML = `<p>Failed to load catalog. Please try again later.</p>`;
});
