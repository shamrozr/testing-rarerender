// Brand Directory SPA — Simple case-insensitive fix

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
  const target = raw.toLowerCase();
  
  for (const s of slugs) {
    if (s.toLowerCase() === target || brands[s].name.toLowerCase() === target) {
      return s;
    }
  }
  return slugs[0];
}

// SUPER SIMPLE: Case-insensitive key finder
function findKeyIgnoreCase(obj, searchKey) {
  if (!searchKey) return null;
  const searchLower = searchKey.toLowerCase();
  
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === searchLower) {
      return key; // Return the actual key from the object
    }
  }
  return null;
}

// SIMPLIFIED: Path resolution that ignores case
function resolvePathFromParam(tree, rawPath) {
  if (!rawPath) return [];
  
  const parts = rawPath.replace(/\\/g,'/').split('/').filter(Boolean);
  let node = tree;
  const resolvedPath = [];
  
  for (const part of parts) {
    const actualKey = findKeyIgnoreCase(node, part);
    if (!actualKey) {
      console.log(`❌ "${part}" not found in:`, Object.keys(node));
      break;
    }
    
    resolvedPath.push(actualKey);
    node = node[actualKey];
    
    if (node.children) {
      node = node.children;
    } else {
      break;
    }
  }
  
  console.log(`🔍 Resolved "${rawPath}" → [${resolvedPath.join(', ')}]`);
  return resolvedPath;
}

async function loadData() {
  try {
    const res = await fetch('/data.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    STATE.data = data;

    // brand resolution
    const u = new URL(location.href);
    const brandRaw = u.searchParams.get('brand') || '';
    const slug = resolveBrandSlug(data.brands, brandRaw);
    STATE.brand = slug;
    const theme = data.brands[slug];

    if (!theme) {
      throw new Error(`Brand "${slug}" not found`);
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

    // FIXED: Case-insensitive path resolution
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
        <button onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }
}

function listItemsAtPath(path) {
  let node = STATE.data.catalog.tree;
  
  // Navigate to the target node
  for (const segment of path) {
    if (!node[segment]) {
      console.log(`❌ Segment "${segment}" not found`);
      return [];
    }
    node = node[segment];
    if (path.indexOf(segment) < path.length - 1 && node.children) {
      node = node.children;
    }
  }

  // Determine what to list
  let container;
  if (path.length === 0) {
    container = node; // Root level
  } else if (node.children) {
    container = node.children; // Has subcategories
  } else {
    return []; // Dead end
  }

  const items = [];
  for (const key of Object.keys(container)) {
    const v = container[key];
    
    const hasChildren = !!(v.children && Object.keys(v.children).length > 0);
    const isProduct = !!v.isProduct;
    
    let count = v.count || 0;
    if (isProduct) count = 1;

    items.push({
      key,
      label: key,
      count: count,
      thumbnail: v.thumbnail || '',
      isProduct: isProduct,
      driveLink: v.driveLink || '',
      hasChildren: hasChildren,
      topOrder: v.topOrder || 999,
    });
  }

  // Sort
  if (path.length === 0) {
    items.sort((a,b) => a.topOrder - b.topOrder || b.count - a.count || a.label.localeCompare(b.label));
  } else {
    items.sort((a,b) => Number(b.hasChildren) - Number(a.hasChildren) || b.count - a.count || a.label.localeCompare(b.label));
  }

  console.log(`✅ Found ${items.length} items at [${path.join(' → ')}]`);
  return items;
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
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <p>No items found in this category.</p>
        <p>Path: ${STATE.path.join(' → ') || 'Home'}</p>
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
    for (const k of Object.keys(tree)) sum += (tree[k]?.count || 0);
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
  img.loading = 'lazy';
  img.alt = item.thumbnail ? `${item.label} thumbnail` : '';
  img.src = item.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

  const body = document.createElement('div');
  body.className = 'card-body';
  
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = item.label;
  
  const right = document.createElement('div');
  right.className = 'card-count';
  if (item.hasChildren && item.count > 0) {
    right.textContent = `${item.count}`;
  }
  
  body.appendChild(title);
  body.appendChild(right);
  card.appendChild(img);
  card.appendChild(body);

  const go = () => {
    if (item.isProduct && item.driveLink) {
      window.open(item.driveLink, '_blank');
    } else {
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
