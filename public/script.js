// Brand Directory SPA — Working version with basic fixes

const STATE = {
  data: null,
  brand: null,
  path: [],
  items: [],
  batchSize: 20,
  rendered: 0,
  hoverTimer: null,
  isPop: false,
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
  
  for (let i = 0; i < parts.length; i++) {
    const wanted = norm(i === 0 ? parts[i].toUpperCase() : parts[i]);
    const keys = Object.keys(node);
    let hit = null;
    
    // Try exact match first
    for (const k of keys) {
      if (norm(k) === wanted) { 
        hit = k; 
        break; 
      }
    }
    
    if (!hit) {
      console.log(`Path segment "${parts[i]}" not found. Available: ${keys.join(', ')}`);
      break;
    }
    
    acc.push(hit);
    const n = node[hit];
    if (n?.children) {
      node = n.children;
    } else {
      break;
    }
  }
  return acc;
}

async function loadData() {
  try {
    const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    STATE.data = data;
    
    // Debug: Log available brands and tree structure
    console.log('Available brands:', Object.keys(data.brands || {}));
    console.log('Tree root keys:', Object.keys(data.catalog?.tree || {}));

    // brand resolution
    const u = new URL(location.href);
    const brandRaw = u.searchParams.get('brand') || '';
    const slug = resolveBrandSlug(data.brands, brandRaw);
    STATE.brand = slug;
    const theme = data.brands[slug];

    if (!theme) {
      throw new Error(`Brand "${slug}" not found in data`);
    }

    // header
    applyTheme(theme);
    els.brandName.textContent = theme.name;
    els.brandLogo.textContent = initialsFor(theme.name);
    const validWA = theme.whatsapp && waRe.test(theme.whatsapp);
    els.waFab.style.display = validWA ? 'grid' : 'none';
    if (validWA) els.waFab.href = theme.whatsapp;

    // totals
    els.total.textContent = (data.catalog?.totalProducts || 0).toLocaleString();

    // path from URL
    const pathParam = u.searchParams.get('path') || '';
    const startPath = resolvePathFromParam(data.catalog.tree, pathParam);
    STATE.path = startPath;

    renderPath();
    
  } catch (err) {
    console.error('Failed to load data:', err);
    els.grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <h3>Unable to load catalog</h3>
        <p>Error: ${err.message}</p>
        <p>Please check your internet connection and try again.</p>
        <button onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }
}

function listItemsAtPath(path) {
  // Walk to the node for the current path
  let node = STATE.data.catalog.tree;
  
  for (const segment of path) {
    if (!node[segment]) {
      console.log(`Segment "${segment}" not found in:`, Object.keys(node));
      return [];
    }
    node = node[segment];
    if (node.children) {
      // For next iteration, if there are more segments
    }
  }

  // Determine what container to use
  const isRoot = path.length === 0;
  let container;
  
  if (isRoot) {
    container = node; // At root, node is the tree itself
  } else if (node.children) {
    container = node.children; // Use children if available
  } else if (node.isProduct) {
    return []; // Products have no children to list
  } else {
    // This might be an intermediate node - let's see what we can do
    container = node;
  }

  const items = [];

  for (const key of Object.keys(container)) {
    const v = container[key];
    
    // Determine item properties
    const hasChildren = !!(v.children && Object.keys(v.children).length > 0);
    const isProduct = !!v.isProduct;
    
    // Calculate count
    let count = 0;
    if (isProduct) {
      count = 1;
    } else if (typeof v.count === 'number') {
      count = v.count;
    } else if (hasChildren) {
      // Count children recursively
      count = countAllDescendants(v);
    }

    const item = {
      key,
      label: key,
      count: count,
      thumbnail: v.thumbnail || '',
      isProduct: isProduct,
      driveLink: v.driveLink || '',
      hasChildren: hasChildren,
      topOrder: typeof v.topOrder !== 'undefined' ? v.topOrder : Number.POSITIVE_INFINITY,
    };

    items.push(item);
  }

  // Sort items
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

  console.log(`Found ${items.length} items at path: ${path.join('/')}`);
  return items;
}

function countAllDescendants(node) {
  if (node.isProduct) return 1;
  if (!node.children) return 0;
  
  let total = 0;
  for (const child of Object.values(node.children)) {
    total += countAllDescendants(child);
  }
  return total;
}

function updateURL() {
  if (STATE.isPop) return;
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
  
  if (STATE.items.length === 0) {
    els.grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; opacity: 0.6;">
        <p>No items found in this category.</p>
        <p>Current path: ${STATE.path.join(' → ') || 'Home'}</p>
      </div>
    `;
    els.grid.setAttribute('aria-busy', 'false');
  } else {
    renderNextBatch();
    setupInfiniteScroll();
  }
  
  updateURL();
}

function visibleCountText() {
  const tree = STATE.data.catalog.tree;
  if (STATE.path.length === 0) {
    let sum = 0;
    for (const k of Object.keys(tree)) {
      sum += (tree[k]?.count || 0);
    }
    return sum.toLocaleString();
  }
  
  let node = tree;
  for (const seg of STATE.path) {
    if (!node[seg]) return '0';
    node = node[seg];
  }
  return (node?.count || 0).toLocaleString();
}

function renderNextBatch() {
  const start = STATE.rendered;
  const end = Math.min(start + STATE.batchSize, STATE.items.length);
  for (let i = start; i < end; i++) {
    els.grid.appendChild(cardEl(STATE.items[i]));
  }
  STATE.rendered = end;
  els.grid.setAttribute('aria-busy', 'false');
}

function setupInfiniteScroll() {
  if (STATE.io) STATE.io.disconnect();
  STATE.io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && STATE.rendered < STATE.items.length) {
        renderNextBatch();
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
    img.onerror = () => {
      img.style.display = 'none'; // Hide broken images
    };
  } else {
    img.style.display = 'none'; // Hide if no thumbnail
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = item.label;
  
  const right = document.createElement('div');
  right.className = 'card-count';
  
  if (item.hasChildren && item.count > 0) {
    right.textContent = `${item.count}`;
  } else if (item.isProduct) {
    right.textContent = '';
  } else {
    right.textContent = '';
  }
  
  body.appendChild(title);
  body.appendChild(right);
  card.appendChild(img);
  card.appendChild(body);

  const go = () => {
    if (item.isProduct && item.driveLink) {
      trackClick(STATE.brand, [...STATE.path, item.label].join('/'));
      window.open(item.driveLink, '_blank');
    } else if (item.hasChildren || !item.isProduct) {
      STATE.path = [...STATE.path, item.label];
      renderPath();
    }
  };
  
  card.addEventListener('click', go);
  card.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') go(); 
  });

  return card;
}

function renderBreadcrumb() {
  const frag = document.createDocumentFragment();

  const home = document.createElement('a');
  home.href = '#';
  home.textContent = 'Home';
  home.addEventListener('click', (e) => {
    e.preventDefault();
    STATE.path = [];
    renderPath();
  });
  frag.appendChild(home);

  STATE.path.forEach((p, idx) => {
    const last = idx === STATE.path.length - 1;
    const el = document.createElement(last ? 'span' : 'a');
    el.textContent = p;
    if (!last) {
      el.href = '#';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        STATE.path = STATE.path.slice(0, idx + 1);
        renderPath();
      });
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
  // Analytics implementation
}

window.addEventListener('popstate', () => {
  STATE.isPop = true;
  const u = new URL(location.href);
  const pathParam = u.searchParams.get('path') || '';
  STATE.path = resolvePathFromParam(STATE.data.catalog.tree, pathParam);
  renderPath();
  STATE.isPop = false;
});

// Start the application
loadData();
